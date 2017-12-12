import Filter from 'lodash-es/filter';
import IsNil from 'lodash-es/isNil';
import Map from 'lodash-es/map';

import Item from 'neon-extension-framework/models/item/core/base';
import ItemParser from 'neon-extension-framework/models/item/core/parser';
import Log from 'neon-extension-core/core/logger';
import {Track} from 'neon-extension-framework/models/item/music';

import Database from './base';


const Indexes = {
    'type': {
        fields: ['type']
    },
    'type+title': {
        fields: ['type', 'title']
    },
    'type+keys.item.slug': {
        fields: ['type', 'keys.item.slug']
    },
    'type+keys.neon-extension-destination-lastfm.id': {
        fields: ['type', 'keys.neon-extension-destination-lastfm.id']
    },
    'type+keys.neon-extension-source-googlemusic.id': {
        fields: ['type', 'keys.neon-extension-source-googlemusic.id']
    },
    'type+keys.neon-extension-source-googlemusic.title': {
        fields: ['type', 'keys.neon-extension-source-googlemusic.title']
    }
};

export class ItemDatabase extends Database {
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
                return {
                    updated: false,
                    item
                };
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

    upsert(item) {
        if(IsNil(item)) {
            return Promise.reject(new Error('Invalid value provided for the "item" parameter'));
        }

        Log.debug('Upserting item: %o', item);

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
        Log.debug('Finding items matching: %o', selectors);

        return this.match(selectors).then((result) => {
            if(!IsNil(result)) {
                item.id = result['_id'];

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
        let children = {
            created: {},
            ignored: {},
            updated: {}
        };

        function process(name, promise) {
            return promise.then(({created, updated}) => {
                children.created[name] = created || children.created[name] || false;
                children.updated[name] = updated || children.updated[name] || false;
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
                .then(() => this.upsert(item).then(({created, updated}) => ({
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

export default new ItemDatabase();
