import {ItemDatabase} from 'neon-extension-core/database/item';
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

                    title: 'Gorillaz',

                    created: true,
                    updated: false
                }),
                Artist.create('test', {
                    keys: {
                        id: 2
                    },

                    title: 'Post Malone',

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

                        title: 'gorillaz',

                        updated: true
                    }),
                    Artist.create('test', {
                        id: items[1].id,

                        keys: {
                            id: 2
                        },

                        title: 'post malone',

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

                    expect(currentItems[0].resolve('test').title).toBe('Gorillaz');
                    expect(currentItems[0].resolve('test').get('created')).toBe(true);
                    expect(currentItems[0].resolve('test').get('updated')).toBe(true);

                    // Post Malone
                    expect(currentItems[1].id).toBe(items[1].id);
                    expect(currentItems[1].revision).not.toBe(items[1].revision);

                    expect(currentItems[1].title).toBe('Post Malone');
                    expect(currentItems[1].createdAt).toBe(items[1].createdAt);
                    expect(currentItems[1].updatedAt).toBeGreaterThan(items[1].updatedAt);

                    expect(currentItems[1].resolve('test').title).toBe('Post Malone');
                    expect(currentItems[1].resolve('test').get('created')).toBe(true);
                    expect(currentItems[1].resolve('test').get('updated')).toBe(true);
                });
            });
        });

        it('ignores items that haven\'t changed', function() {
            let items = [
                Artist.create('test', {
                    keys: {
                        id: 7
                    },

                    title: 'LCD Soundsystem',

                    created: true
                })
            ];

            // Create items
            return db.createMany(items).then(() => {
                // Update items
                return db.updateMany([
                    Artist.create('test', {
                        id: items[0].id,
                        revision: items[0].revision,

                        keys: {
                            id: 7
                        },

                        title: 'LCD Soundsystem'
                    })
                ]).then(({updated, errors, items}) => {
                    expect(updated).toBe(0);

                    expect(errors.failed).toBe(0);
                    expect(errors.invalid).toBe(0);
                    expect(errors.notCreated).toBe(0);

                    expect(items.length).toBe(1);

                    expect(items[0].id).toBeDefined();
                    expect(items[0].createdAt).toBeDefined();
                    expect(items[0].title).toBe('LCD Soundsystem');

                    expect(items[0].resolve('test').get('created')).toBe(true);
                    expect(items[0].resolve('test').get('updated')).toBeUndefined();
                });
            });
        });

        it('ignores zero-length arrays', function() {
            return db.updateMany([]);
        });

        it('rejects on invalid item arrays', function(done) {
            db.updateMany().then(
                () => done.fail(),
                (err) => done(err)
            );
        });

        it('marks invalid items', function() {
            let items = [
                Artist.create('test', {
                    keys: {
                        id: 4
                    },

                    title: 'Midnight Oil',

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
                        revision: items[0].revision,

                        keys: {
                            id: 4
                        },

                        title: 'Midnight Oil',

                        updated: true
                    }),
                    {},
                    5,
                    false
                ]).then(({updated, errors, items}) => {
                    expect(updated).toBe(1);

                    expect(errors.failed).toBe(0);
                    expect(errors.invalid).toBe(3);
                    expect(errors.notCreated).toBe(0);

                    expect(items.length).toBe(4);

                    expect(items[0].id).toBeDefined();
                    expect(items[0].createdAt).toBeDefined();
                    expect(items[0].title).toBe('Midnight Oil');

                    expect(items[0].resolve('test').get('created')).toBe(true);
                    expect(items[0].resolve('test').get('updated')).toBe(true);

                    expect(Object.keys(items[1]).length).toBe(0);
                    expect(items[2]).toBe(5);
                    expect(items[3]).toBe(false);
                });
            });
        });

        it('marks items that haven\'t been created', function() {
            let items = [
                Artist.create('test', {
                    keys: {
                        id: 5
                    },

                    title: 'Miike Snow',

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
                        revision: items[0].revision,

                        keys: {
                            id: 5
                        },

                        title: 'Miike Snow',

                        updated: true
                    }),
                    Artist.create('test', {
                        keys: {
                            id: 6
                        },

                        title: 'Talking Heads',

                        updated: true
                    }),
                    5,
                    false
                ]).then(({updated, errors, items}) => {
                    expect(updated).toBe(1);

                    expect(errors.failed).toBe(0);
                    expect(errors.invalid).toBe(2);
                    expect(errors.notCreated).toBe(1);

                    expect(items.length).toBe(4);

                    expect(items[0].id).toBeDefined();
                    expect(items[0].createdAt).toBeDefined();
                    expect(items[0].title).toBe('Miike Snow');

                    expect(items[0].resolve('test').get('created')).toBe(true);
                    expect(items[0].resolve('test').get('updated')).toBe(true);

                    expect(items[1].id).toBeNull();
                    expect(items[1].createdAt).toBeDefined();
                    expect(items[1].title).toBe('Talking Heads');

                    expect(items[1].resolve('test').get('created')).toBeUndefined();
                    expect(items[1].resolve('test').get('updated')).toBe(true);

                    expect(items[2]).toBe(5);
                    expect(items[3]).toBe(false);
                });
            });
        });
    });

    afterAll(function() {
        return db.destroy();
    });
});
