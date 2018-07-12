/* eslint-disable no-multi-spaces, key-spacing */
import Filter from 'lodash-es/filter';
import ForEach from 'lodash-es/forEach';
import FromPairs from 'lodash-es/fromPairs';
import Get from 'lodash-es/get';
import IsNil from 'lodash-es/isNil';
import IsPlainObject from 'lodash-es/isPlainObject';
import Map from 'lodash-es/map';
import MD5 from 'crypto-js/md5';

import Item from '@radon-extension/framework/Models/Metadata/Core/Base';
import ItemDecoder from '@radon-extension/framework/Models/Metadata/Core/Decoder';
import {MediaTypes} from '@radon-extension/framework/Core/Enums';
import {PropertyConflictError} from '@radon-extension/framework/Properties/Core/Exceptions';
import {runSequential} from '@radon-extension/framework/Utilities/Promise';

import Log from '../Core/Logger';
import Database from './Base';


export class ItemDatabase extends Database {
    static Keys = {
        Music: {
            'neon-extension-source-googlemusic': ['id'],
            'neon-extension-source-spotify': ['uri']
        },
        Video: {
            'neon-extension-source-amazonvideo': ['id'],
            'neon-extension-source-netflix': ['id']
        }
    };

    static Tree = {
        //
        // Music
        //

        [MediaTypes.Music.Track]: {
            fetch: { children: ['artist', 'album'] },
            upsert: { after: ['artist', 'album'] }
        },

        [MediaTypes.Music.Album]: {
            fetch: { children: ['artist'] },
            upsert: { before: ['artist'] }
        },

        [MediaTypes.Music.Artist]: {
            fetch: true,
            upsert: true
        },

        //
        // Video
        //

        [MediaTypes.Video.Episode]: {
            fetch: { children: ['season'] },
            upsert: { after: ['season'] }
        },

        [MediaTypes.Video.Season]: {
            fetch: { children: ['show'] },
            upsert: { before: ['show'] }
        },
        [MediaTypes.Video.Show]: {
            fetch: true,
            upsert: true
        },
        [MediaTypes.Video.Movie]: {
            fetch: true,
            upsert: true
        }
    };

    constructor(name, options) {
        super(name || 'items', {
            indexes: ItemDatabase.createIndexes()
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

        let doc = item.toDocument();

        // Create item in database
        return this.post(doc).then((result) => {
            // Apply changes to item
            item.apply({
                id: result.id,
                revision: result.rev
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

            return item.toDocument();
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
                let item = items[i];

                item.apply({
                    id: result.id,
                    revision: result.rev
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

    fetch(item) {
        if(IsNil(item) || !IsNil(item.revision)) {
            return this.fetchChildren(item);
        }

        Log.trace('Fetching item: %o', item);

        // Fetch item
        let resolve;

        if(IsNil(item.id)) {
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

            // Find item
            Log.trace('Finding items matching: %o', selectors);

            resolve = this.match(selectors).then((result) => {
                if(IsNil(result) || IsNil(result['_id'])) {
                    return Promise.reject(new Error('No match found'));
                }

                return this.get(result['_id']);
            }).catch((err) => {
                Log.debug('Unable to find item matching: %o (%s)', selectors, (err && err.message) ? err.message : err);
                return null;
            });
        } else {
            resolve = this.get(item.id).catch((err) => {
                Log.warn('Unable to find item: %o (%s)', item.id, (err && err.message) ? err.message : err);
                return null;
            });
        }

        // Update `item`
        return resolve.then((doc) => {
            if(IsNil(doc)) {
                return this.fetchChildren(item);
            }

            // Merge `item` with current document
            item.inherit(ItemDecoder.fromDocument(doc));

            // Fetch children
            return this.fetchChildren(item);
        });
    }

    fetchChildren(item) {
        let children = [];

        // Parse options
        let options = ItemDatabase.Tree[item.type];

        if(IsNil(options) || IsNil(options.fetch)) {
            return Promise.reject(new Error(
                `Unsupported item type: ${item.type}`
            ));
        }

        if(IsPlainObject(options.fetch)) {
            children = Map(options.fetch.children || [], (name) =>
                Get(item, name)
            );
        }

        // Fetch children from database
        return runSequential(children, (child) => {
            if(IsNil(child)) {
                return Promise.resolve();
            }

            // Fetch child from database
            return this.fetch(child);
        });
    }

    update(item) {
        if(IsNil(item)) {
            return Promise.reject(new Error('Invalid value provided for the "item" parameter'));
        }

        if(IsNil(item.id)) {
            return Promise.reject(new Error('Item hasn\'t been created yet'));
        }

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

            // Store item in database
            Log.debug('Updating item: %o', item);

            return this.put(item.toDocument()).then((result) => {
                if(!result.ok) {
                    return Promise.reject(new Error('' + 'Put failed'));
                }

                // Apply changes to item
                item.apply({
                    revision: result.rev
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
            let docs = Map(changedItems, (item) => item.toDocument());

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
                        revision: result.rev
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

        let previous = item.createState();

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
            if(IsNil(result)) {
                return null;
            }

            Log.debug('Updating item: %o', item);

            // Set item identifier
            item.apply({ id: result['_id'] });

            // Update item in database
            return this.update(item).then(({ updated, item }) => ({
                created: false,
                updated,

                item
            })).catch((err) => {
                if(err instanceof PropertyConflictError && err.property === 'keys') {
                    Log.debug('Item conflicts with existing keys, creating new item instead');

                    // Revert changes to `item`
                    item.revert(previous);
                    return null;
                }

                return Promise.reject(err);
            });
        }).then((result) => {
            if(!IsNil(result)) {
                return result;
            }

            return this.create(item).then((item) => ({
                created: true,
                updated: false,

                item
            }));
        }).catch((err) => {
            // Revert changes to `item`
            item.revert(previous);

            // Unknown error
            Log.error('Unable to upsert item: %s', err.message, err);
            return Promise.reject(err);
        });
    }

    upsertTree(item) {
        let self = this;

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

        function run(item) {
            if(IsNil(item)) {
                return Promise.resolve();
            }

            let before = [];
            let after = [];

            // Parse options
            let options = ItemDatabase.Tree[item.type];

            if(IsNil(options) || IsNil(options.upsert)) {
                return Promise.reject(new Error(
                    `Unsupported item type: ${item.type}`
                ));
            }

            if(IsPlainObject(options.upsert)) {
                before = Map(options.upsert.before || [], (name) =>
                    Get(item, name)
                );

                after = Map(options.upsert.after || [], (name) =>
                    Get(item, name)
                );
            }

            return Promise.resolve()
                // Run `before` children
                .then(() => runSequential(before, run))
                // Upsert `item`
                .then(() => process(item.type, self.upsert(item)))
                // Run `after` children
                .then(() => runSequential(after, run));
        }

        // Upsert item tree
        return run(item).then(() => this.upsert(item).then(() => ({
            created,
            updated,

            children,
            item
        })));
    }

    static createIndexes() {
        return {
            'type': {
                fields: ['type']
            },

            ...ItemDatabase.createMusicIndexes(),
            ...ItemDatabase.createVideoIndexes()
        };
    }

    static createMusicIndexes() {
        let indexes = {};

        ForEach(ItemDatabase.Keys.Music, (names, source) => {
            let keys = {
                item: {
                    slug: true
                },
                [source]: FromPairs(Map(names, (name) => (
                    [name, true]
                )))
            };

            let artist = ItemDecoder.fromDocument({
                type: MediaTypes.Music.Artist,
                keys
            });

            let album = ItemDecoder.fromDocument({
                type: MediaTypes.Music.Album,
                keys,

                artist
            });

            let track = ItemDecoder.fromDocument({
                type: MediaTypes.Music.Track,
                keys,

                album,
                artist
            });

            // Create indexes
            ForEach([artist, album, track], (item) => {
                ForEach(item.createSelectors(), (selector) => {
                    let fields = Object.keys(selector).sort();

                    // Create index
                    indexes[`generated-${MD5(fields.join(','))}`] = { fields };
                });
            });
        });

        return indexes;
    }

    static createVideoIndexes() {
        let indexes = {};

        ForEach(ItemDatabase.Keys.Video, (names, source) => {
            let keys = {
                item: {
                    slug: true
                },
                [source]: FromPairs(Map(names, (name) => (
                    [name, true]
                )))
            };

            let movie = ItemDecoder.fromDocument({
                type: MediaTypes.Video.Movie,
                keys
            });

            let show = ItemDecoder.fromDocument({
                type: MediaTypes.Video.Show,
                keys
            });

            let season = ItemDecoder.fromDocument({
                type: MediaTypes.Video.Season,
                keys,

                show
            });

            let episode = ItemDecoder.fromDocument({
                type: MediaTypes.Video.Episode,
                keys,

                season
            });

            // Create indexes
            ForEach([movie, show, season, episode], (item) => {
                ForEach(item.createSelectors(), (selector) => {
                    let fields = Object.keys(selector).sort();

                    // Create index
                    indexes[`generated-${MD5(fields.join(','))}`] = { fields };
                });
            });
        });

        return indexes;
    }
}

export default process.env['TEST'] !== true && new ItemDatabase();
