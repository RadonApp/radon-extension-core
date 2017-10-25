import IsPlainObject from 'lodash-es/isPlainObject';
import IsString from 'lodash-es/isString';
import Map from 'lodash-es/map';

import ItemBuilder from 'neon-extension-framework/models/item';
import Log from 'neon-extension-core/core/logger';
import {Album, Artist, Track} from 'neon-extension-framework/models/item/music';
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

        if(!isDefined(item) || !isDefined(item.title)) {
            return Promise.resolve({
                created: false,
                updated: false,

                item
            });
        }

        // Ignore items that have already been matched
        if(isDefined(item.id) && !item.changed && !options.force) {
            return Promise.resolve({
                created: false,
                updated: false,

                item
            });
        }

        Log.trace('Upserting item: %o', item);

        // Build query
        let query = this._createUpsertQuery(item);

        if(!isDefined(query)) {
            Log.error('Unable to create query for item: %o', item);

            return Promise.reject(new Error(
                'Unable to create query'
            ));
        }

        // Find items
        Log.trace('Finding items matching: %o', query);

        return this.find(query).then((result) => {
            if(result.docs.length > 0) {
                // Update item
                item.id = result.docs[0]['_id'];

                // Update item in database
                return this.update(item).then((item) => ({
                    created: false,
                    updated: true,

                    item
                }));
            }

            return this.create(item).then((item) => ({
                created: true,
                updated: false,

                item
            }));
        }, (err) => {
            // Unknown error
            Log.error('Unable to upsert item: %s', err.message, err);
            return Promise.reject(err);
        });
    }

    upsertTree(item) {
        let updated = false;

        function resolve(result) {
            if(result.updated) {
                updated = true;
            }

            return result.item;
        }

        if(item instanceof Track) {
            return Promise.resolve()
                // Track (retrieve references)
                .then(() => this.upsert(item, { force: updated }).then((result) => {
                    item = result.item;
                }))
                // Artist
                .then(() => this.upsert(item.artist, { force: updated }).then((result) => {
                    item.artist = resolve(result);
                }))
                // Album Artist
                .then(() => this.upsert(item.album.artist, { force: updated }).then((result) => {
                    item.album.artist = resolve(result);
                }))
                // Album
                .then(() => this.upsert(item.album, { force: updated }).then((result) => {
                    item.album = resolve(result);
                }))
                // Track (set references)
                .then(() => this.upsert(item, { force: updated }).then((result) => {
                    item = resolve(result);
                }))
                // Result
                .then(() => ({
                    updated: updated,

                    item
                }));
        }

        return Promise.reject(new Error(
            'Unknown item type'
        ));
    }

    create(item) {
        Log.debug('Creating item: %o', item);

        // Set timestamp
        item.createdAt = Date.now();

        // Create item in database
        return this.post(item.toDocument()).then((result) => {
            item.id = result.id;
            item.revision = result.rev;

            return item;
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

                ...data
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

                item.changed = false;
            }

            return results;
        });
    }

    update(item) {
        Log.trace('Comparing item: %o', item);

        // Retrieve current item from database
        return this.get(item.id).then((doc) => {
            let current = ItemBuilder.decode(doc).merge(item);

            if(!current.changed) {
                return Promise.resolve(current);
            }

            // Update timestamps
            if(!isDefined(current.createdAt)) {
                current.createdAt = Date.now();
            }

            current.updatedAt = Date.now();

            // Store item in database
            Log.debug('Updating item: %o', current);

            return this.put(current.toDocument()).then((result) => {
                if(!result.ok) {
                    return Promise.reject(new Error('' + 'Put failed'));
                }

                // Update values
                current.revision = result.rev;

                return current;
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
                updatedAt: Date.now()
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

                item.changed = false;
            }

            return results;
        });
    }

    _createUpsertQuery(item, fields) {
        let selectors = this._createUpsertSelectors(item);

        // Ensure selectors exist
        if(selectors.length < 1) {
            return null;
        }

        // Build query
        return {
            fields: [
                '_id',

                ...(fields || [])
            ],
            selector: {
                $or: selectors
            }
        };
    }

    _createUpsertSelectors(item) {
        if(isDefined(item.id)) {
            return [{
                '_id': item.id
            }];
        }

        return [
            ...this._createIdentifierSelectors(item),
            ...this._createTreeSelector(item, 'title')
        ];
    }

    _createIdentifierSelectors(item) {
        let selectors = [];

        function createSelectors(prefix, ids) {
            for(let key in ids) {
                if(!ids.hasOwnProperty(key)) {
                    continue;
                }

                if(IsPlainObject(ids[key])) {
                    createSelectors(prefix + '.' + key, ids[key]);
                    continue;
                }

                // Create selector
                let selector = {
                    type: item.type
                };

                selector[prefix + '.' + key] = ids[key];

                // Add selector to OR clause
                selectors.push(selector);
            }
        }

        // Create identifier selectors
        createSelectors('ids', item.ids);

        return selectors;
    }

    _createTreeSelector(item, key) {
        let selector = {
            'type': item.type
        };

        // Create item selectors
        let valid;

        if(item instanceof Track) {
            this._createItemSelector(selector, key, 'album', item.album);

            valid = (
                this._createItemSelector(selector, key, item) &&
                this._createItemSelector(selector, key, 'artist', item.artist)
            );
        } else if(item instanceof Album) {
            this._createItemSelector(selector, key, item);

            valid = this._createItemSelector(selector, key, 'artist', item.artist);
        } else if(item instanceof Artist) {
            valid = (
                this._createItemSelector(selector, key, item)
            );
        } else {
            return [];
        }

        // Ensure selector is valid
        if(!valid) {
            return [];
        }

        // Ensure selector has properties
        if(Object.keys(selector).length < 1) {
            return [];
        }

        return [selector];
    }

    _createItemSelector(selector, key, prefix, item) {
        if(!IsString(prefix) && !isDefined(item)) {
            item = prefix;
            prefix = undefined;
        }

        if(!isDefined(item)) {
            return false;
        }

        // Parse key
        let name = key;

        if(name === 'id') {
            name = '_id';
        }

        // Parse prefix
        if(!isDefined(prefix)) {
            prefix = '';
        } else {
            prefix = prefix + '.';
        }

        // Ensure property exists
        if(!isDefined(item[key])) {
            return false;
        }

        // Create selector
        selector[prefix + name] = item[key];
        return true;
    }
}

export default new Items();
