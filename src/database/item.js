import IsPlainObject from 'lodash-es/isPlainObject';
import Map from 'lodash-es/map';
import Merge from 'lodash-es/merge';

import Log from 'neon-extension-core/core/logger';
import {Track} from 'neon-extension-framework/models/item/music';
import {isDefined} from 'neon-extension-framework/core/helpers';

import Database from './base';


const Indexes = {
    'ids.neon-extension-source-googlemusic.id': {
        fields: ['ids.neon-extension-source-googlemusic.id']
    },
    'ids.neon-extension-source-googlemusic.key': {
        fields: ['ids.neon-extension-source-googlemusic.key']
    },
    'ids.neon-extension-source-googlemusic.title': {
        fields: ['ids.neon-extension-source-googlemusic.title']
    },
    'type': {
        fields: ['type']
    }
};

export class Items extends Database {
    constructor() {
        super('items', Indexes);
    }

    upsert(item, options) {
        options = options || {};
        options.force = options.force || false;

        if(!isDefined(item) || !isDefined(item.ids)) {
            return Promise.resolve(false);
        }

        // Ignore items that have already been matched
        if(isDefined(item.id) && !item.changed && !options.force) {
            return Promise.resolve(false);
        }

        Log.trace('Upserting item: %o', item);

        // Build query
        let query = this._buildUpsertQuery('ids', item.ids);

        // Find items
        Log.trace('Finding items matching: %o', query);

        return this.find(query).then((result) => {
            if(result.docs.length > 0) {
                // Update item
                item.id = result.docs[0]['_id'];

                // Update item in database
                return this.update(item);
            }

            return this.create(item);
        }, (err) => {
            // Unknown error
            Log.warn('Unable to upsert item: %s', err.message, err);
            return Promise.reject(err);
        });
    }

    upsertTree(item) {
        let updated = false;

        function resolve(result) {
            if(result) {
                updated = true;
            }
        }

        if(item instanceof Track) {
            return Promise.resolve()
                .then(() => this.upsert(item.artist).then(resolve))
                .then(() => this.upsert(item.album.artist, { force: updated }).then(resolve))
                .then(() => this.upsert(item.album, { force: updated }).then(resolve))
                .then(() => this.upsert(item, { force: updated }).then(resolve))
                .then(() => updated);
        }

        return Promise.reject(new Error(
            'Unknown item type'
        ));
    }

    create(item) {
        Log.trace('Creating item: %o', item);

        let data = IsPlainObject(item) ? item : item.toDocument();

        let document = {
            createdAt: Date.now(),
            ...data,

            seenAt: Date.now()
        };

        // Create item in database
        return this.post(document).then((result) => {
            item.id = result.id;
            item.createdAt = document.createdAt;
            item.updatedAt = document.updatedAt;
            item.seenAt = document.seenAt;

            item.changed = false;

            return result;
        });
    }

    createMany(items) {
        if(!isDefined(items) || items.length < 1) {
            return Promise.resolve();
        }

        Log.trace('Creating %d item(s)', items.length);

        // Build documents
        let docs = Map(items, (item) => {
            let data = IsPlainObject(item) ? item : item.toDocument();

            return {
                createdAt: Date.now(),
                ...data,

                seenAt: Date.now()
            };
        });

        // Create items in database
        return this.bulkDocs(docs).then((results) => {
            Log.debug('Created %d item(s)', items.length);

            for(let i = 0; i < results.length; i++) {
                let result = results[i];

                if(!result.ok) {
                    Log.debug('Unable to create item [%d]:', i, result);
                    continue;
                }

                // Update item
                let doc = docs[i];
                let item = items[i];

                item.id = result.id;
                item.createdAt = doc.createdAt;
                item.updatedAt = doc.updatedAt;
                item.seenAt = doc.seenAt;

                item.changed = false;
            }

            return results;
        });
    }

    update(item) {
        Log.trace('Updating item: %o', item);

        let data = IsPlainObject(item) ? item : item.toDocument();

        // Update item in database
        return this.get(item.id).then((doc) => {
            let document = {
                createdAt: Date.now(),

                ...doc,
                ...data,

                // Merge identifiers
                ids: Merge(
                    doc.ids || {},
                    data.ids || {}
                ),

                // Update timestamps
                updatedAt: Date.now(),
                seenAt: Date.now()
            };

            return this.put(document).then(() => {
                item.createdAt = document.createdAt;
                item.updatedAt = document.updatedAt;
                item.seenAt = document.seenAt;

                item.changed = false;
                return true;
            });
        });
    }

    updateMany(items) {
        if(!isDefined(items) || items.length < 1) {
            return Promise.resolve();
        }

        Log.trace('Updating %d item(s)', items.length);

        // Build documents
        let docs = Map(items, (item) => {
            let data = IsPlainObject(item) ? item : item.toDocument();

            return {
                // Defaults
                createdAt: Date.now(),

                // Include data
                ...data,

                // Update timestamps
                updatedAt: Date.now(),
                seenAt: Date.now()
            };
        });

        // Create items in database
        return this.bulkDocs(docs).then((results) => {
            Log.debug('Updated %d item(s)', items.length);

            for(let i = 0; i < results.length; i++) {
                let result = results[i];

                if(!result.ok) {
                    Log.debug('Unable to update item [%d]:', i, result);
                    continue;
                }

                // Update item
                let doc = docs[i];
                let item = items[i];

                item.createdAt = doc.createdAt;
                item.updatedAt = doc.updatedAt;
                item.seenAt = doc.seenAt;

                item.changed = false;
            }

            return results;
        });
    }

    _buildUpsertQuery(prefix, ids, query) {
        query = query || {
            fields: ['_id'],
            selector: {$or: []}
        };

        for(let key in ids) {
            if(!ids.hasOwnProperty(key)) {
                continue;
            }

            if(IsPlainObject(ids[key])) {
                this._buildUpsertQuery(prefix + '.' + key, ids[key], query);
                continue;
            }

            // Create selector
            let selector = {};

            selector[prefix + '.' + key] = {$eq: ids[key]};

            // Add selector to OR clause
            query.selector['$or'].push(selector);
        }

        return query;
    }
}

export default new Items();
