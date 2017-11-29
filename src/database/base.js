import IsNil from 'lodash-es/isNil';
import Map from 'lodash-es/map';
import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';

import Log from 'neon-extension-core/core/logger';
import Platform, {Platforms} from 'neon-extension-browser/platform';
import {resolveOne, runSequential} from 'neon-extension-framework/core/helpers/promise';


export default class Database {
    constructor(name, indexes, options) {
        this.name = name;
        this.indexes = indexes;

        // Create database options
        let databaseOptions = {
            'auto_compaction': true,
            'revs_limit': 1,

            // Persistent Storage (Firefox 56+)
            // Note: Data stored in earlier versions of Firefox will be lost
            ...(Platform.name === Platforms.Firefox && Platform.version.major >= 56 ? {
                'storage': 'persistent'
            } : {}),

            // Override with provided options
            ...(options || {})
        };

        Log.trace('Opening database "%s" [options: %o]', name, databaseOptions);

        // Construct database
        this._database = new (PouchDB.plugin(PouchFind))(name, databaseOptions);
        this._destroyed = false;

        // Update database indexes
        this.ready = this._initializeDatabase();
    }

    allDocs(options) {
        return this.ready.then(() => this._database.allDocs(options));
    }

    bulkDocs(docs) {
        return this.ready.then(() => this._database.bulkDocs(docs));
    }

    destroy() {
        // Update state
        this._destroyed = true;

        // Destroy database
        return this._database.destroy().then(() => {
            // Update state
            this._database = null;
        });
    }

    find(query) {
        return this.ready.then(() => this._database.find(query));
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

    get(key) {
        return this.ready.then(() => this._database.get(key));
    }

    getMany(keys) {
        return this.allDocs({
            'include_docs': true,

            keys
        });
    }

    post(doc) {
        return this.ready.then(() => this._database.post(doc));
    }

    put(doc) {
        return this.ready.then(() => this._database.put(doc));
    }

    // region Private methods

    _initializeDatabase() {
        return Promise.resolve()
            .then(() => this._createIndexes())
            .then(() => this._deleteIndexes());
    }

    _createIndexes() {
        return runSequential(
            Map(this.indexes, (index, name) => ({
                name,
                ...index
            })),
            (index) => {
                if(this._destroyed || IsNil(this._database)) {
                    return Promise.resolve();
                }

                return this._database.createIndex({
                    ddoc: index.name,
                    ...index
                }).then(({ name, result }) => {
                    if(result === 'created') {
                        Log.info('Index "%s" has been created', name);
                    } else {
                        Log.trace('Index "%s" already exists', name);
                    }
                }, (err) => {
                    if(this._destroyed || IsNil(this._database)) {
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

                if(this._destroyed || IsNil(this._database)) {
                    return Promise.resolve();
                }

                // Delete index
                return this._database.deleteIndex(index).then(() => {
                    Log.info('Index "%s" has been deleted', index.name);
                }, (err) => {
                    if(this._destroyed || IsNil(this._database)) {
                        return;
                    }

                    Log.error('Unable to delete index: %s', err && err.message, err);
                });
            })
        );
    }

    // endregion
}
