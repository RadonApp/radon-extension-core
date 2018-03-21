import IsFunction from 'lodash-es/isFunction';
import IsNil from 'lodash-es/isNil';
import IsNumber from 'lodash-es/isNumber';
import Map from 'lodash-es/map';
import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';

import Log from 'neon-extension-core/core/logger';
import {LocalStorage} from 'neon-extension-framework/storage';
import {resolveOne, runSequential} from 'neon-extension-framework/core/helpers/promise';


const DatabaseState = LocalStorage.context('database');

const DatabasePersistentStorage = (function() {
    if(IsNil(navigator) || IsNil(navigator.storage) || !IsFunction(navigator.storage.persist)) {
        return Promise.resolve(false);
    }

    return navigator.storage.persist();
})().then((persistent) => {
    if(persistent) {
        Log.info('Persistent storage: enabled');
    } else {
        Log.info('Persistent storage: disabled');
    }
}, (err) => {
    Log.warn('Unable to enable persistent storage', err);
});

export default class Database {
    constructor(name, description, options) {
        this.name = name;

        // Parse description
        description = description || {};

        this.indexes = description.indexes || {};
        this.version = description.version || 1;

        // Validate description
        if(IsNil(this.indexes) || Object.keys(this.indexes).length < 1) {
            Log.warn('No indexes defined for the "%s" database', name);
        }

        // Retrieve storage context
        this._state = DatabaseState.context(this.name);

        // Initial state
        this._database = null;
        this._opened = false;

        // Open database
        this.ready = this.open(options);
    }

    allDocs(options) {
        return this.ready.then(() => this._database.allDocs(options));
    }

    bulkDocs(docs) {
        return this.ready.then(() => this._database.bulkDocs(docs));
    }

    destroy() {
        Log.trace('Destroying the "%s" database', this.name);

        // Update state
        this._destroying = true;

        // Destroy database
        return this._database.destroy().then((result) => {
            Log.info('Destroyed the "%s" database', this.name, result);

            // Update state
            this._destroying = false;
            this._opened = false;
            this._database = null;
        });
    }

    find(query) {
        return this.ready.then(() => this._database.find(query));
    }

    get(key) {
        return this.ready.then(() => this._database.get(key));
    }

    getMany(keys) {
        return this.allDocs({
            'include_docs': true,

            keys
        });
    }

    match(selectors, fields) {
        if(IsNil(selectors) || !Array.isArray(selectors) || selectors.length < 1) {
            return Promise.reject(new Error('One selector is required'));
        }

        if(IsNil(fields)) {
            fields = ['_id'];
        }

        // Execute selectors sequentially, and return the first document matched
        return resolveOne(selectors, (selector) => {
            return this.find({ fields, selector }).then((result) => {
                if(!IsNil(result.warning)) {
                    Log.warn('find() %o: %s', selector, result.warning);
                }

                if(result.docs.length < 1) {
                    return Promise.reject();
                }

                return result.docs[0];
            });
        });
    }

    open() {
        if(!IsNumber(this.version)) {
            return Promise.reject(new Error('Invalid database version: ' + this.version));
        }

        if(this._opened) {
            return Promise.reject(new Error('Database has already been opened'));
        }

        // Open database
        this._database = this._open(this.version);

        // Migrate and initialize database
        return this._migrate()
            .then(() => this._initialize())
            .then(() => {
                this._opened = true;
            });
    }

    post(doc) {
        return this.ready.then(() => this._database.post(doc));
    }

    put(doc) {
        return this.ready.then(() => this._database.put(doc));
    }

    reindex() {
        return this._createIndexes();
    }

    // region Event Handlers

    onUpgrade(version, database) {
        Log.info('No upgrade migrations defined for the "%s" database', this.name);
        return Promise.resolve();
    }

    onDowngrade(version, database) {
        Log.info('No downgrade migrations defined for the "%s" database', this.name);
        return Promise.resolve();
    }

    // endregion

    // region Private methods

    _initialize() {
        return Promise.resolve()
            .then(() => DatabasePersistentStorage)
            .then(() => this._createIndexes())
            .then(() => this._deleteIndexes());
    }

    _open(version) {
        let options = {
            'auto_compaction': true,
            'revs_limit': 1,

            // Persistent Indexed DB Migration (Firefox 56+)
            ...(neon.browser.name === 'firefox' && IsNil(version) ? {
                'storage': 'persistent'
            } : {})
        };

        Log.trace('Opening the "%s" database (version: %o) [options: %o]', this.name, version, options);

        // Build database name
        let name = this.name;

        if(!IsNil(version)) {
            name += '_v' + version;
        }

        // Construct database
        return new (PouchDB.plugin(PouchFind))(name, options);
    }

    _migrate() {
        if(IsNil(this._state)) {
            Log.info('Database migration is not available, no state context available');
            return Promise.resolve();
        }

        return this._state.getInteger('version').then((current) => {
            if(this.version === current) {
                Log.trace('No migration required for the "%s" database (version: %o)', this.name, current);
                return Promise.resolve();
            }

            if(!IsNil(current)) {
                Log.trace('Migrating the "%s" database from v%s to v%s', this.name, current, this.version);
            } else {
                Log.trace('Migrating the "%s" database to v%s', this.name, this.version);
            }

            // Open current database
            let database = {
                current: this._open(current),
                target: this._database
            };

            // Execute migration, update version, and destroy the old database
            return this._migrateExecute({ target: this.version, current }, database)
                .then(() => this._state.putInteger('version', this.version))
                .then(() => this._migrateDestroy(database.current, current));
        });
    }

    _migrateExecute(version, database) {
        // Upgrade database
        if(version.target > version.current) {
            Log.trace('Upgrading the "%s" database to v%s', this.name, version.target);

            return this.onUpgrade(version, database).then(() => {
                Log.info('Upgraded the "%s" database to v%s', this.name, version.target);
            });
        }

        // Downgrade database
        Log.trace('Downgrading the "%s" database to v%s', this.name, version.target);

        return this.onDowngrade(version, database).then(() => {
            Log.info('Downgraded the "%s" database to v%s', this.name, version.target);
        });
    }

    _migrateDestroy(database, version) {
        Log.trace('Destroying the "%s" database (version: %o)', this.name, version);

        let promise;

        if(neon.browser.name === 'firefox' && IsNil(version)) {
            // Persistent databases can't be deleted currently (possible bug?), instead clear out
            // their object stores and attempt deletion.

            promise = this._migrateDestroyPersistent(database);
        } else {
            promise = database.destroy();
        }

        // Log result
        return promise.then(() => {
            Log.info('Destroyed the "%s" database (version: %o)', this.name, version);
        }, (err) => {
            Log.warn('Unable to destroy the "%s" database:', this.name, err);
        });
    }

    _migrateDestroyPersistent(database) {
        function open(name) {
            return new Promise((resolve, reject) => {
                let req = window.indexedDB.open(name, { storage: 'persistent' });

                req.onerror = function() {
                    reject(new Error('Unable to open database'));
                };

                req.onsuccess = function() {
                    resolve(req.result);
                };
            });
        }

        function clearObjectStore(db, name) {
            return new Promise((resolve, reject) => {
                let req = db.transaction(name, 'readwrite').objectStore(name).clear();

                req.onerror = function() {
                    reject(req.error);
                };

                req.onsuccess = function() {
                    resolve(req.result);
                };
            });
        }

        function deleteDatabase(name) {
            return new Promise((resolve, reject) => {
                let req = indexedDB.deleteDatabase(name);

                req.onerror = function() {
                    reject();
                };

                req.onsuccess = function() {
                    resolve();
                };
            });
        }

        // Retrieve database information
        return database.info().then((info) => {
            if(IsNil(info) || IsNil(info['db_name']) || info['db_name'].length < 1) {
                return Promise.reject(new Error('Unable to retrieve database name'));
            }

            // Retrieve dependant database names (indexes)
            return database.get('_local/_pouch_dependentDbs').then(({dependentDbs}) => {
                let databaseNames = Map(
                    Object.keys(dependentDbs).concat([info['db_name']]),
                    (name) => '_pouch_' + name
                );

                // Destroy databases
                return runSequential(databaseNames, (databaseName) => open(databaseName).then((db) => {
                    // Clear object stores
                    return runSequential(db.objectStoreNames, (objectStoreName) =>
                        clearObjectStore(db, objectStoreName).catch((err) => {
                            Log.warn(
                                'Unable to clear "%s" object store in the "%s" database:',
                                objectStoreName, databaseName, err
                            );
                        })
                    ).then(() => {
                        // Close the database
                        db.close();

                        // Try delete the database
                        return deleteDatabase(databaseName);
                    });
                }, (err) => {
                    Log.warn('Unable to destroy the "%s" database:', databaseName, err);
                }));
            });
        });
    }

    _createIndexes() {
        return runSequential(
            Map(this.indexes, (index, name) => ({
                name,
                ...index
            })),
            (index) => {
                if(this._destroying || IsNil(this._database)) {
                    return Promise.resolve();
                }

                return this._database.createIndex({
                    ddoc: index.name,
                    ...index
                }).then(({ name, result }) => {
                    if(result === 'created') {
                        Log.info('Index "%s" has been created', name);
                    } else {
                        Log.trace('Index "%s" has been updated', name);
                    }
                }, (err) => {
                    if(this._destroying || IsNil(this._database)) {
                        return;
                    }

                    Log.error('Unable to create index: %s', err && err.message, err);
                });
            }
        );
    }

    _deleteIndexes() {
        return this._database.getIndexes().then(({indexes}) =>
            runSequential(indexes, (index) => {
                if(index.type !== 'json' || !IsNil(this.indexes[index.name])) {
                    return Promise.resolve();
                }

                if(this._destroying || IsNil(this._database)) {
                    return Promise.resolve();
                }

                // Delete index
                return this._database.deleteIndex(index).then(() => {
                    Log.info('Index "%s" has been deleted', index.name);
                }, (err) => {
                    if(this._destroying || IsNil(this._database)) {
                        return;
                    }

                    Log.error('Unable to delete index: %s', err && err.message, err);
                });
            })
        );
    }

    // endregion
}
