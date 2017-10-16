import Map from 'lodash-es/map';
import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';

import Log from 'neon-extension-core/core/logger';
import {isDefined} from 'neon-extension-framework/core/helpers';
import {runSequential} from 'neon-extension-framework/core/helpers/promise';


export default class Database {
    constructor(name, indexes, options) {
        this.name = name;
        this.indexes = indexes;

        // Construct database
        this._database = new (PouchDB.plugin(PouchFind))(name, {
            'auto_compaction': true,
            'revs_limit': 1,

            ...(options || {})
        });

        // Update database indexes
        this._updateIndexes();
    }

    bulkDocs(docs) {
        return this._database.bulkDocs(docs);
    }

    find(query) {
        return this._database.find(query);
    }

    get(key) {
        return this._database.get(key);
    }

    post(doc) {
        return this._database.post(doc);
    }

    put(doc) {
        return this._database.put(doc);
    }

    // region Private methods

    _createIndexes() {
        return runSequential(
            Map(this.indexes, (index, name) => ({
                name,
                ...index
            })),
            (index) => this._database.createIndex({
                ddoc: index.name,
                ...index
            }).then(({ name, result }) => {
                if(result === 'created') {
                    Log.info('Index "%s" has been created', name);
                } else {
                    Log.trace('Index "%s" already exists', name);
                }
            }, (err) => {
                Log.error('Unable to create index: %s', err && err.message, err);
            })
        );
    }

    _deleteIndexes() {
        return this._database.getIndexes().then(({indexes}) =>
            runSequential(indexes, (index) => {
                if(index.type !== 'json' || isDefined(this.indexes[index.name])) {
                    return Promise.resolve();
                }

                // Delete index
                return this._database.deleteIndex(index).then(() => {
                    Log.info('Index "%s" has been deleted', index.name);
                }, (err) => {
                    Log.error('Unable to delete index: %s', err && err.message, err);
                });
            })
        );
    }

    _updateIndexes() {
        return Promise.resolve()
            .then(() => this._createIndexes())
            .then(() => this._deleteIndexes());
    }

    // endregion
}
