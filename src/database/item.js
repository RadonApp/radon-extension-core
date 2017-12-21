import Filter from 'lodash-es/filter';
import IsNil from 'lodash-es/isNil';
import Map from 'lodash-es/map';

import Item from 'neon-extension-framework/models/item/core/base';
import ItemDecoder from 'neon-extension-framework/models/item/core/decoder';
import Log from 'neon-extension-core/core/logger';
import {Track} from 'neon-extension-framework/models/item/music';

import Database from './base';


const Indexes = {
    'type': {
        fields: ['type']
    }
};

export class ItemDatabase extends Database {
    constructor(name, options) {
        super(name || 'items', {
            indexes: Indexes
        }, options);
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
            // Apply changes to item
            item.apply({
                id: result.id,
                revision: result.rev,

                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            });

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

        Log.trace('Creating %d item(s)', items.length);

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

                // Apply changes to item
                let doc = docs[i];
                let item = items[i];

                item.apply({
                    id: result.id,
                    revision: result.rev,

                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt
                });
            }

            // Return result
            return {
                created: items.length - errors.exists - errors.failed - errors.invalid,
                errors,
                items
            };
        });
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
            if(!item.inherit(ItemDecoder.fromDocument(doc))) {
                Log.trace('No changes detected for: %o', item);

                return {
                    updated: false,
                    item
                };
            }

            // Update revision
            item.apply({
                revision: doc['_rev']
            });

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

                // Apply changes to item
                item.apply({
                    revision: result.rev,

                    createdAt: update.createdAt,
                    updatedAt: update.updatedAt
                });

                return {
                    updated: true,
                    item
                };
            });
        });
    }

    updateMany(items) {
        if(IsNil(items) || !Array.isArray(items)) {
            return Promise.reject(new Error('Invalid value provided for the "items" parameter (expected array)'));
        }

        if(items.length < 1) {
            return Promise.resolve();
        }

        Log.trace('Updating %d item(s)', items.length);

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
                if(!createdItems[i].inherit(ItemDecoder.fromDocument(row.doc))) {
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
            return this.bulkDocs(docs).then((results) => {
                Log.debug('Updated %d item(s)', docs.length);

                for(let i = 0; i < results.length; i++) {
                    let result = results[i];

                    if(!result.ok) {
                        Log.warn('Unable to update item [%d]:', i, result);
                        errors.failed++;
                    }

                    // Apply changes to item
                    changedItems[i].apply({
                        revision: result.rev,

                        createdAt: docs[i].createdAt,
                        updatedAt: docs[i].updatedAt
                    });
                }

                return {
                    updated: items.length - errors.failed - errors.invalid - errors.notCreated,
                    errors,
                    items
                };
            });
        });
    }

    upsert(item) {
        if(IsNil(item)) {
            return Promise.reject(new Error('Invalid value provided for the "item" parameter'));
        }

        Log.trace('Upserting item: %o', item);

        // Create selectors
        let selectors;

        try {
            selectors = item.createSelectors();
        } catch(e) {
            return Promise.reject(e || new Error('Unable to create selectors'));
        }

        if(selectors.length < 1) {
            return Promise.reject(new Error('No selectors available'));
        }

        // Find items
        Log.trace('Finding items matching: %o', selectors);

        return this.match(selectors).then((result) => {
            if(!IsNil(result)) {
                item.apply({
                    id: result['_id']
                });

                // Update item in database
                return this.update(item).then(({ updated, item }) => ({
                    created: false,
                    updated,

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
        let created = false;
        let updated = false;

        let children = {
            created: {},
            ignored: {},
            updated: {}
        };

        function process(name, promise) {
            return promise.then((result) => {
                created = result.created || created;
                updated = result.updated || updated;

                children.created[name] = result.created || children.created[name] || false;
                children.updated[name] = result.updated || children.updated[name] || false;
            }, (err) => {
                Log.debug('Unable to upsert %s %o: %s', name, item.artist, err);
                children.ignored[name] = true;
            });
        }

        if(item instanceof Track) {
            return Promise.resolve()
                .then(() => process('track', this.upsert(item)))
                .then(() => process('artist', this.upsert(item.artist)))
                .then(() => process('artist', this.upsert(item.album.artist)))
                .then(() => process('album', this.upsert(item.album)))
                .then(() => this.upsert(item).then(() => ({
                    created,
                    updated,

                    children,
                    item
                })));
        }

        return Promise.reject(new Error(
            'Unknown item type'
        ));
    }
}

export default process.env['TEST'] !== true && new ItemDatabase();
