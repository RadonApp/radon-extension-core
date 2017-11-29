import Filter from 'lodash-es/filter';
import IsNil from 'lodash-es/isNil';
import IsPlainObject from 'lodash-es/isPlainObject';
import IsString from 'lodash-es/isString';
import Map from 'lodash-es/map';

import Item from 'neon-extension-framework/models/item/core/base';
import ItemParser from 'neon-extension-framework/models/item/core/parser';
import Log from 'neon-extension-core/core/logger';
import {Album, Artist, Track} from 'neon-extension-framework/models/item/music';

import Database from './base';


const Indexes = {
    'keys.neon-extension-source-googlemusic.id': {
        fields: ['keys.neon-extension-source-googlemusic.id']
    },
    'keys.neon-extension-source-googlemusic.key': {
        fields: ['keys.neon-extension-source-googlemusic.key']
    },
    'keys.neon-extension-source-googlemusic.title': {
        fields: ['keys.neon-extension-source-googlemusic.title']
    },
    'type': {
        fields: ['type']
    }
};

export default class ItemDatabase extends Database {
    constructor(name, options) {
        super(name || 'items', Indexes, options);
    }

    create(item) {
        if(IsNil(item)) {
            return Promise.reject(new Error('Invalid value provided for the "item" parameter'));
        }

        if(!IsNil(item.id)) {
            return Promise.reject(new Error('Item has already been created'));
        }

        Log.debug('Creating item: %o', item);

        let now = Date.now();

        // Build document
        let doc = {
            createdAt: now,
            updatedAt: now,

            ...item.toDocument()
        };

        // Create item in database
        return this.post(doc).then((result) => {
            item.id = result.id;
            item.revision = result.rev;

            item.createdAt = doc.createdAt;
            item.updatedAt = doc.updatedAt;

            return item;
        });
    }

    createMany(items) {
        if(IsNil(items) || !Array.isArray(items)) {
            return Promise.reject(new Error('Invalid value provided for the "items" parameter (expected array)'));
        }

        if(items.length < 1) {
            return Promise.resolve();
        }

        Log.debug('Creating %d item(s)', items.length);

        let now = Date.now();

        let errors = {
            exists: 0,
            failed: 0,
            invalid: 0
        };

        // Build documents
        let docs = Filter(Map(items, (item) => {
            if(!(item instanceof Item)) {
                Log.warn('Item is invalid: %o', item);
                errors.invalid++;
                return null;
            }

            if(!IsNil(item.id)) {
                Log.warn('Item has already been created: %o', item);
                errors.exists++;
                return null;
            }

            return {
                createdAt: now,
                updatedAt: now,

                ...item.toDocument()
            };
        }), (doc) => !IsNil(doc));

        // Create items in database
        return this.bulkDocs(docs).then((results) => {
            Log.debug('Created %d item(s)', items.length);

            // Update items
            for(let i = 0; i < results.length; i++) {
                let result = results[i];

                if(!result.ok) {
                    Log.warn('Unable to create item [%d]:', i, result);
                    errors.failed++;
                    continue;
                }

                // Update item
                let doc = docs[i];
                let item = items[i];

                item.id = result.id;
                item.revision = result.rev;

                item.createdAt = doc.createdAt;
                item.updatedAt = doc.updatedAt;
            }

            // Return result
            return {
                created: items.length - errors.exists - errors.failed - errors.invalid,
                errors,
                items
            };
        });
    }

    decode(item) {
        return ItemParser.decodeItem(item);
    }

    update(item) {
        if(IsNil(item)) {
            return Promise.reject(new Error('Invalid value provided for the "item" parameter'));
        }

        if(IsNil(item.id)) {
            return Promise.reject(new Error('Item hasn\'t been created yet'));
        }

        let now = Date.now();

        // Retrieve current item from database
        return this.get(item.id).then((doc) => {
            if(!item.merge(this.decode(doc))) {
                return item;
            }

            // Update revision
            item.revision = doc['_rev'];

            // Encode item
            let update = {
                // Ensure the `createdAt` timestamp has been set
                createdAt: now,

                // Encode item
                ...item.toDocument(),

                // Update the `updatedAt` timestamp
                updatedAt: now
            };

            // Store item in database
            Log.debug('Updating item: %o', item);

            return this.put(update).then((result) => {
                if(!result.ok) {
                    return Promise.reject(new Error('' + 'Put failed'));
                }

                // Update revision
                item.revision = result.rev;

                // Update timestamps
                item.createdAt = update.createdAt;
                item.updatedAt = update.updatedAt;

                return item;
            });
        });
    }

    updateMany(items) {
        if(IsNil(items) || items.length < 1) {
            return Promise.resolve();
        }

        Log.debug('Updating %d item(s)', items.length);

        let now = Date.now();

        let errors = {
            failed: 0,
            invalid: 0,
            notCreated: 0
        };

        // Find items that can be updated
        let createdItems = Filter(items, (item) => {
            if(!(item instanceof Item)) {
                Log.warn('Item is invalid: %o', item);
                errors.invalid++;
                return false;
            }

            if(IsNil(item.id)) {
                Log.warn('Item hasn\'t been created: %o', item);
                errors.notCreated++;
                return false;
            }

            return true;
        });

        // Retrieve current documents from database
        return this.getMany(Map(createdItems, (item) => item.id)).then(({rows}) => {
            // Merge items with the current documents
            let changedItems = Filter(Map(rows, (row, i) => {
                if(!createdItems[i].merge(this.decode(row.doc))) {
                    return null;
                }

                return createdItems[i];
            }), (item) => !IsNil(item));

            // Encode items
            let docs = Map(changedItems, (item) => ({
                // Ensure the `createdAt` timestamp has been set
                createdAt: now,

                // Encode item
                ...item.toDocument(),

                // Update the `updatedAt` timestamp
                updatedAt: now
            }));

            if(docs.length < 1) {
                return {
                    updated: 0,
                    errors,
                    items
                };
            }

            // Update items
            Log.debug('Updating %d item(s): %o', docs.length, docs);

            return this.bulkDocs(docs).then((results) => {
                for(let i = 0; i < results.length; i++) {
                    let result = results[i];

                    if(!result.ok) {
                        Log.warn('Unable to update item [%d]:', i, result);
                        errors.failed++;
                    }

                    // Update revision
                    changedItems[i].revision = result.rev;

                    // Update timestamps
                    changedItems[i].createdAt = docs[i].createdAt;
                    changedItems[i].updatedAt = docs[i].updatedAt;
                }

                return {
                    updated: items.length - errors.failed - errors.invalid - errors.notCreated,
                    errors,
                    items
                };
            });
        });
    }

    upsert(item, options) {
        options = options || {};
        options.force = options.force || false;

        if(IsNil(item) || IsNil(item.title)) {
            return Promise.resolve({
                created: false,
                updated: false,

                item
            });
        }

        Log.debug('Upserting item: %o', item);

        // Build selectors
        let selectors = this._createUpsertSelectors(item);

        // Ensure selectors exist
        if(selectors.length < 1) {
            return Promise.reject(new Error('Unable to create selectors'));
        }

        // Find items
        Log.debug('Finding items matching: %o', selectors);

        return this.match(selectors).then((result) => {
            if(!IsNil(result)) {
                item.id = result['_id'];

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

    _createUpsertSelectors(item) {
        if(!IsNil(item.id)) {
            return [{
                '_id': item.id
            }];
        }

        return [
            ...this._createKeySelectors(item),
            ...this._createTreeSelector(item, 'title')
        ];
    }

    _createKeySelectors(item) {
        let selectors = [];

        function createSelectors(prefix, keys) {
            for(let source in keys) {
                if(!keys.hasOwnProperty(source)) {
                    continue;
                }

                if(IsPlainObject(keys[source])) {
                    createSelectors(prefix + '.' + source, keys[source]);
                    continue;
                }

                // Create selector
                let selector = {
                    type: item.type
                };

                selector[prefix + '.' + source] = keys[source];

                // Add selector to OR clause
                selectors.push(selector);
            }
        }

        // Create identifier selectors
        createSelectors('keys', item.keys);

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
        if(!IsString(prefix) && IsNil(item)) {
            item = prefix;
            prefix = undefined;
        }

        if(IsNil(item)) {
            return false;
        }

        // Parse key
        let name = key;

        if(name === 'id') {
            name = '_id';
        }

        // Parse prefix
        if(IsNil(prefix)) {
            prefix = '';
        } else {
            prefix = prefix + '.';
        }

        // Ensure property exists
        if(IsNil(item[key])) {
            return false;
        }

        // Create selector
        selector[prefix + name] = item[key];
        return true;
    }
}
