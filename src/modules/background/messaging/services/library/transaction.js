import Assign from 'lodash-es/assign';
import Filter from 'lodash-es/filter';
import ForEach from 'lodash-es/forEach';
import Get from 'lodash-es/get';
import Has from 'lodash-es/has';
import Map from 'lodash-es/map';
import Merge from 'lodash-es/merge';
import Omit from 'lodash-es/omit';
import Set from 'lodash-es/set';
import Unset from 'lodash-es/unset';
import Uuid from 'uuid';

import Items from 'neon-extension-core/database/item';
import Log from 'neon-extension-core/core/logger';
import {Artist, Album, Track} from 'neon-extension-framework/models/item/music';
import {ItemParser} from 'neon-extension-framework/models/item';
import {cleanTitle, encodeTitle, isDefined} from 'neon-extension-framework/core/helpers';
import {createTasks} from 'neon-extension-framework/core/helpers/execution';
import {runSequential} from 'neon-extension-framework/core/helpers/promise';


export default class LibraryTransaction {
    constructor(types, options) {
        this.types = types;

        // Parse options
        this.options = Merge({
            source: null,

            add: {
                chunk: 50
            },

            seed: {
                chunk: 50
            },

            process: {
                chunk: 50
            }
        }, options || {});

        this.source = options.source;

        // Transaction
        this.transactionItems = {};
        this.transactionIndex = {};

        // Database
        this.databaseIndex = {};

        // Collections
        this.created = {};
        this.updated = {};
        this.matched = {};

        // Validate parameters
        if(!isDefined(this.source)) {
            throw new Error('Missing required option: source');
        }
    }

    get(type, ids) {
        return this._findItem(this.databaseIndex, type, ids);
    }

    fetch() {
        return Items.find({
            selector: {
                'type': { $in: this.types }
            }
        }).then(({ docs }) => this.seedMany(ItemParser.fromDocument, docs), (err) => {
            Log.error('Unable to fetch existing items: %s', err && err.message, err);
            return Promise.reject(err);
        });
    }

    execute() {
        Log.trace('Executing transaction...');

        return Promise.resolve()
            .then(() => this._onProcessComplete('artist', this.process('music/artist')))
            .then(() => this._onProcessComplete('album', this.process('music/album')))
            .then(() => this._onProcessComplete('track', this.process('music/track')));
    }

    // region add

    addMany(parse, items, options) {
        parse = parse || ((item) => item);

        // Parse options
        options = Merge({}, this.options.add, options || {});

        Log.trace('Adding %d item(s) to transaction [chunk: %o]', items.length, options.chunk);

        // Add items sequentially (if chunks are disabled, or not required)
        if(!isDefined(options.chunk) || items.length <= options.chunk) {
            return runSequential(items, (item) => this.add(parse(item)).catch((err) => {
                Log.warn('Unable to add item: %s', err && err.message, err);
            }));
        }

        // Add items in task chunks
        return createTasks(items, options.chunk, (chunk) =>
            this.addMany(parse, chunk, { chunk: null })
        );
    }

    add(item) {
        if(!isDefined(item)) {
            return Promise.reject(new Error('Invalid item'));
        }

        // Add item
        if(item instanceof Track) {
            return Promise.resolve(this.addTrack(item));
        }

        if(item instanceof Album) {
            return Promise.resolve(this.addAlbum(item));
        }

        if(item instanceof Artist) {
            return Promise.resolve(this.addArtist(item));
        }

        // Unsupported item
        return Promise.reject(new Error('Unsupported item (type: "' + item.type + '")'));
    }

    addTrack(track) {
        if(!isDefined(track)) {
            return null;
        }

        // Add children
        track.artist = this.addArtist(track.artist);
        track.album = this.addAlbum(track.album, track.artist);

        // Generate track identifier
        let pk = this._createTitleId(
            track.artist.title,
            track.album.title,
            track.title
        );

        // Retrieve existing track
        let current = this._findItem(this.transactionIndex, track.type, {
            '#pk': pk
        });

        // Create (or update existing) track
        if(!isDefined(current)) {
            current = track;
            current['#id'] = Uuid.v4();

            // Ensure `items` collection exist
            if(!isDefined(this.transactionItems[track.type])) {
                this.transactionItems[track.type] = [];
            }

            // Add track to `items` collection
            this.transactionItems[track.type].push(current);
        } else {
            this._update(current, track);
        }

        // Index track by identifiers
        this._indexItem(this.transactionIndex, pk, current);

        // Return track
        return current;
    }

    addAlbum(album, artist) {
        if(!isDefined(album)) {
            return null;
        }

        // Seed children
        album.artist = this.addArtist(album.artist) || artist || null;

        // Generate album identifier
        let pk = this._createTitleId(
            album.artist.title,
            album.title
        );

        // Retrieve existing album
        let current = this._findItem(this.transactionIndex, album.type, {
            '#pk': pk
        });

        // Create (or update existing) album
        if(!isDefined(current)) {
            current = album;
            current['#id'] = Uuid.v4();

            // Ensure `items` collection exist
            if(!isDefined(this.transactionItems[album.type])) {
                this.transactionItems[album.type] = [];
            }

            // Add track to `items` collection
            this.transactionItems[album.type].push(current);
        } else {
            this._update(current, album);
        }

        // Index album by identifiers
        this._indexItem(this.transactionIndex, pk, current);

        // Return album
        return current;
    }

    addArtist(artist) {
        if(!isDefined(artist) || !isDefined(artist.title)) {
            return null;
        }

        // Generate artist identifier
        let pk = this._createTitleId(
            artist.title
        );

        // Retrieve existing track
        let current = this._findItem(this.transactionIndex, artist.type, {
            '#pk': pk
        });

        // Create (or update existing) artist
        if(!isDefined(current)) {
            current = artist;
            current['#id'] = Uuid.v4();

            // Ensure `items` collection exist
            if(!isDefined(this.transactionItems[artist.type])) {
                this.transactionItems[artist.type] = [];
            }

            // Add track to `items` collection
            this.transactionItems[artist.type].push(current);
        } else {
            this._update(current, artist);
        }

        // Index artist by identifiers
        this._indexItem(this.transactionIndex, pk, current);

        // Return artist
        return current;
    }

    // endregion

    // region seed

    seedMany(parse, items, options) {
        parse = parse || ((item) => item);

        options = Merge({}, this.options.seed, options || {});

        Log.trace('Seeding transaction with %d item(s) [chunk: %o]', items.length, options.chunk);

        // Seed items sequentially (if chunks are disabled, or not required)
        if(!isDefined(options.chunk) || items.length <= options.chunk) {
            return runSequential(items, (item) => this.seed(parse(item)).catch((err) => {
                Log.warn('Unable to seed transaction with item: %s', err && err.message, err);
            }));
        }

        // Seed items in task chunks
        return createTasks(items, options.chunk, (chunk) =>
            this.seedMany(parse, chunk, { chunk: null })
        );
    }

    seed(item) {
        if(!isDefined(item)) {
            return Promise.reject(new Error('Invalid item'));
        }

        // Seed item
        if(item instanceof Track) {
            return Promise.resolve(this.seedTrack(item));
        }

        if(item instanceof Album) {
            return Promise.resolve(this.seedAlbum(item));
        }

        if(item instanceof Artist) {
            return Promise.resolve(this.seedArtist(item));
        }

        // Unsupported item
        return Promise.reject(new Error('Unsupported item (type: "' + item.type + '")'));
    }

    seedTrack(track) {
        if(!isDefined(track)) {
            return null;
        }

        // Seed children
        track.artist = this.seedArtist(track.artist);
        track.album = this.seedAlbum(track.album, track.artist);

        // Generate track identifier
        let pk = this._createTitleId(
            track.artist.title,
            track.album.title,
            track.title
        );

        // Retrieve existing track
        let current = this._findItem(this.databaseIndex, track.type, {
            '#pk': pk
        });

        // Create (or update existing) track
        if(!isDefined(current)) {
            current = track;
            current['#id'] = Uuid.v4();
        } else {
            current.update(track.values);
        }

        // Index track by identifiers
        this._indexItem(this.databaseIndex, pk, current);

        // Return track
        return current;
    }

    seedAlbum(album, artist) {
        if(!isDefined(album)) {
            return null;
        }

        // Seed children
        album.artist = this.seedArtist(album.artist) || artist || null;

        // Generate album identifier
        let pk = this._createTitleId(
            album.artist.title,
            album.title
        );

        // Retrieve existing album
        let current = this._findItem(this.databaseIndex, album.type, {
            '#pk': pk
        });

        // Create (or update existing) album
        if(!isDefined(current)) {
            current = album;
            current['#id'] = Uuid.v4();
        } else {
            current.update(album.values);
        }

        // Index album by identifiers
        this._indexItem(this.databaseIndex, pk, current);

        // Return album
        return current;
    }

    seedArtist(artist) {
        if(!isDefined(artist) || !isDefined(artist.title)) {
            return null;
        }

        // Generate artist identifier
        let pk = this._createTitleId(
            artist.title
        );

        // Retrieve existing track
        let current = this._findItem(this.databaseIndex, artist.type, {
            '#pk': pk
        });

        // Create (or update existing) artist
        if(!isDefined(current)) {
            current = artist;
            current['#id'] = Uuid.v4();
        } else {
            current.update(artist.values);
        }

        // Index artist by identifiers
        this._indexItem(this.databaseIndex, pk, current);

        // Return artist
        return current;
    }

    // endregion

    // region process

    process(type) {
        let result = {
            created: 0,
            updated: 0,

            errors: {
                process: 0,
                create: 0,
                update: 0
            }
        };

        function onProcessComplete(results) {
            result.errors.process += Filter(results, (success) => !success);
        }

        // Process items, and update database
        return Promise.resolve()
            // Process items
            .then(() => this.processMany(type, this.transactionItems['music/track']).then(onProcessComplete))
            .then(() => this.processMany(type, this.transactionItems['music/album']).then(onProcessComplete))
            .then(() => this.processMany(type, this.transactionItems['music/artist']).then(onProcessComplete))

            // Create items
            .then(() => Items.createMany(Object.values(this.created[type] || {})).then((results) => {
                result.errors.create += Filter(results, (result) => !result.ok);
            }))

            // Update items
            .then(() => Items.updateMany(Object.values(this.updated[type] || {})).then((results) => {
                result.errors.update += Filter(results, (result) => !result.ok);
            }))

            // Build result
            .then(() => ({
                ...result,

                created: Object.keys(this.created[type] || {}).length,
                updated: Object.keys(this.updated[type] || {}).length,
                matched: Object.keys(this.matched[type] || {}).length
            }));
    }

    processMany(type, items, options) {
        options = Merge({}, this.options.process, options || {});

        Log.trace('Processing %d item(s) [chunk: %o]', items.length, options.chunk);

        // Process items sequentially (if chunks are disabled, or not required)
        if(!isDefined(options.chunk) || items.length <= options.chunk) {
            return runSequential(items, (item) => this.processItem(type, item).catch((err) => {
                Log.warn('Unable to process item: %s', err && err.message, err);
            }));
        }

        // Process items in task chunks
        return createTasks(items, options.chunk, (chunk) =>
            this.processMany(type, chunk, { chunk: null })
        );
    }

    processItem(type, item, parent) {
        if(!isDefined(item)) {
            return Promise.reject(new Error('Invalid item'));
        }

        // Execute children
        return this.processItemChildren(type, item).then(() => {
            if(item.type !== type) {
                return item;
            }

            // Process item
            if(item instanceof Track) {
                return this.processTrack(item, parent);
            }

            if(item instanceof Album) {
                return this.processAlbum(item, parent);
            }

            if(item instanceof Artist) {
                return this.processArtist(item, parent);
            }

            // Unsupported item
            throw new Error('Unsupported item (type: "' + item.type + '")');
        });
    }

    processItemChildren(type, item) {
        return runSequential(item.children, (key) =>
            this.processItem(type, item[key], item).then((result) => {
                item[key] = result;
            }, (err) => {
                Log.error('Unable to execute item: %s', err && err.message, err);
            })
        );
    }

    processTrack(track) {
        if(!isDefined(track)) {
            throw new Error('Invalid track');
        }

        // Generate track identifier
        let pk = this._createTitleId(
            track.artist.title,
            track.album.title,
            track.title
        );

        // Retrieve existing track
        let current = this._findItem(this.databaseIndex, track.type, {
            '#pk': pk
        });

        // Process track
        if(!isDefined(current)) {
            current = track;

            this._storeItem('created', [track.type, current['#id']], current);
        } else if(this._update(current, track)) {
            this._storeItem('updated', [track.type, current['#id']], current);
        } else {
            this._storeItem('matched', [track.type, current['#id']], current);
        }

        // Create track indexes
        this._indexItem(this.databaseIndex, pk, current);

        // Return track
        return current;
    }

    processAlbum(album, parent) {
        if(!isDefined(album)) {
            throw new Error('Invalid album');
        }

        // Use parent artist
        if(!isDefined(album.artist) && isDefined(parent) && parent.type === 'music/track') {
            album.artist = parent.artist || null;
        }

        // Generate album identifier
        let pk = this._createTitleId(
            album.artist.title,
            album.title
        );

        // Retrieve existing album
        let current = this._findItem(this.databaseIndex, album.type, {
            '#pk': pk
        });

        // Process album
        if(!isDefined(current)) {
            current = album;

            this._storeItem('created', [album.type, current['#id']], current);
        } else if(this._update(current, album)) {
            this._storeItem('updated', [album.type, current['#id']], current);
        } else {
            this._storeItem('matched', [album.type, current['#id']], current);
        }

        // Create album indexes
        this._indexItem(this.databaseIndex, pk, current);

        // Return album
        return current;
    }

    processArtist(artist) {
        if(!isDefined(artist)) {
            throw new Error('Invalid artist');
        }

        // Generate artist identifier
        let pk = this._createTitleId(
            artist.title
        );

        // Retrieve existing artist
        let current = this._findItem(this.databaseIndex, artist.type, {
            '#pk': pk
        });

        // Process artist
        if(!isDefined(current)) {
            current = artist;

            this._storeItem('created', [artist.type, current['#id']], current);
        } else if(this._update(current, artist)) {
            this._storeItem('updated', [artist.type, current['#id']], current);
        } else {
            this._storeItem('matched', [artist.type, current['#id']], current);
        }

        // Create artist indexes
        this._indexItem(this.databaseIndex, pk, current);

        // Return artist
        return current;
    }

    // endregion

    _createTitleId(...components) {
        return Map(components, (component) =>
            encodeTitle(cleanTitle(component))
        ).join('/');
    }

    _findItem(collection, type, ids) {
        for(let name in ids) {
            if(!ids.hasOwnProperty(name)) {
                continue;
            }

            // Try retrieve item with identifier
            let result = Get(collection, [type, name, ids[name]]);

            if(isDefined(result)) {
                return result;
            }
        }

        return null;
    }

    _indexItem(collection, pk, item) {
        if(!isDefined(item)) {
            return;
        }

        // Create primary key index
        Set(collection, [item.type, '#pk', pk], item);

        // Create indexes from source identifiers
        ForEach(item.ids[this.source] || {}, (value, name) => {
            Set(collection, [item.type, name, value], item);
        });
    }

    _update(current, item, options) {
        if(!isDefined(current) || !isDefined(item)) {
            return false;
        }

        options = options || {};

        // Encode items
        let currentData = isDefined(options.currentData) ? options.currentData : current.toDocument();
        let itemData = isDefined(options.itemData) ? options.itemData : item.toDocument();

        // Compare properties
        let changed = false;

        for(let key in itemData) {
            if(!itemData.hasOwnProperty(key)) {
                continue;
            }

            if(['changed', 'complete'].indexOf(key) >= 0) {
                continue;
            }

            // Ignore changes to undefined values
            if(!isDefined(item.values[key])) {
                continue;
            }

            // Update child
            if(current.children.indexOf(key) >= 0 || item.children.indexOf(key) >= 0) {
                changed = changed || this._update(current[key], item[key], {
                    ...options,

                    currentData: currentData[key],
                    itemData: itemData[key],
                    prefix: (options.prefix || '') + key + '.'
                });

                continue;
            }

            // Update property
            if(this._updateProperty(current.values, item.values, key)) {
                changed = true;
            }
        }

        return changed;
    }

    _updateProperty(current, item, key) {
        if(!isDefined(current[key]) && isDefined(item[key])) {
            current[key] = item[key];
            return true;
        }

        if(key === 'duration') {
            if(item[key] >= current[key]) {
                return false;
            }

            current[key] = item[key];
            return true;
        }

        if(key === 'ids') {
            let added = Omit(item[key][this.source], Object.keys(current[key][this.source] || {}));

            if(Object.keys(added).length < 1) {
                return false;
            }

            // Update identifiers
            if(!isDefined(current[key][this.source])) {
                current[key][this.source] = added;
            } else {
                Assign(current[key][this.source], added);
            }

            return true;
        }

        return false;
    }

    _storeItem(state, id, current) {
        // Store item in created collection
        if(state === 'created') {
            Set(this.created, id, current);
            Unset(this.updated, id);
            Unset(this.matched, id);
            return;
        }

        if(Has(this.created, id)) {
            return;
        }

        // Store item in updated collections
        if(state === 'updated') {
            Set(this.updated, id, current);
            Unset(this.matched, id);
            return;
        }

        if(Has(this.updated, id)) {
            return;
        }

        // Store item in matched collection
        if(state === 'matched') {
            Set(this.matched, id, current);
            return;
        }

        throw new Error('Unknown state: ' + state);
    }

    _onProcessComplete(name, promise) {
        return promise.then(({created, updated, matched, errors}) => {
            if(created > 0) {
                Log.info('Created %d %s(s) in library', created, name);
            }

            if(updated > 0) {
                Log.info('Updated %d %s(s) in library', updated, name);
            }

            if(matched > 0) {
                Log.info('Matched %d %s(s) in library', matched, name);
            }

            if(errors.process > 0) {
                Log.warn('Unable to process %d %s(s)', errors.process, name);
            }

            if(errors.create > 0) {
                Log.warn('Unable to create %d %s(s)', errors.create, name);
            }

            if(errors.update > 0) {
                Log.warn('Unable to update %d %s(s)', errors.update, name);
            }
        }, (err) => {
            Log.error('Unable to execute %s transaction: %s', name, err && err.message, err);
            return Promise.reject(err);
        });
    }
}
