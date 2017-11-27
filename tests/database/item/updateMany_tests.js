import ItemDatabase from 'neon-extension-core/database/item';
import {Artist, Album, Track} from 'neon-extension-framework/models/item/music';

import Uuid from 'uuid';


describe('ItemDatabase', function() {
    let db;

    beforeAll(function() {
        db = new ItemDatabase(Uuid.v4());

        // Wait until database is ready
        return db.ready.then(() => {
            console.log('Database ready');
        });
    });

    describe('updateMany', function() {
        it('updates items', function() {
            let items = [
                Artist.create('test', {
                    keys: {
                        id: 1
                    },

                    title: 'gorillaz',

                    created: true,
                    updated: false
                }),
                Artist.create('test', {
                    keys: {
                        id: 2
                    },

                    title: 'post malone',

                    created: true,
                    updated: false
                }),
                Artist.create('test', {
                    keys: {
                        id: 3
                    },

                    title: 'Everything Everything',

                    created: true,
                    updated: false
                })
            ];

            // Create items
            return db.createMany(items).then(() => {
                // Update items
                return db.updateMany([
                    Artist.create('test', {
                        id: items[0].id,

                        keys: {
                            id: 1
                        },

                        title: 'Gorillaz',

                        updated: true
                    }),
                    Artist.create('test', {
                        id: items[1].id,

                        keys: {
                            id: 2
                        },

                        title: 'Post Malone',

                        updated: true
                    })
                ]).then(({updated, errors, items: currentItems}) => {
                    expect(updated).toBe(2);
                    expect(errors.failed).toBe(0);
                    expect(errors.invalid).toBe(0);
                    expect(errors.notCreated).toBe(0);

                    expect(currentItems.length).toBe(2);

                    // Gorillaz
                    expect(currentItems[0].id).toBe(items[0].id);
                    expect(currentItems[0].revision).not.toBe(items[0].revision);

                    expect(currentItems[0].title).toBe('Gorillaz');
                    expect(currentItems[0].createdAt).toBe(items[0].createdAt);
                    expect(currentItems[0].updatedAt).toBeGreaterThan(items[0].updatedAt);

                    expect(currentItems[0].get('test').title).toBe('Gorillaz');
                    expect(currentItems[0].get('test').created).toBe(true);
                    expect(currentItems[0].get('test').updated).toBe(true);

                    // Post Malone
                    expect(currentItems[1].id).toBe(items[1].id);
                    expect(currentItems[1].revision).not.toBe(items[1].revision);

                    expect(currentItems[1].title).toBe('Post Malone');
                    expect(currentItems[1].createdAt).toBe(items[1].createdAt);
                    expect(currentItems[1].updatedAt).toBeGreaterThan(items[1].updatedAt);

                    expect(currentItems[1].get('test').title).toBe('Post Malone');
                    expect(currentItems[1].get('test').created).toBe(true);
                    expect(currentItems[1].get('test').updated).toBe(true);
                });
            });
        });
    });

    afterAll(function() {
        return db.destroy();
    });
});
