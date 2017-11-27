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

    describe('createMany', function() {
        it('creates items', function() {
            return db.createMany([
                Artist.create('test', {
                    keys: {
                        id: 1
                    },

                    title: 'Gorillaz'
                }),
                Artist.create('test', {
                    keys: {
                        id: 2
                    },

                    title: 'Post Malone'
                }),
                Artist.create('test', {
                    keys: {
                        id: 3
                    },

                    title: 'Everything Everything'
                })
            ]).then(({created, errors, items}) => {
                expect(created).toBe(3);
                expect(errors.exists).toBe(0);
                expect(errors.failed).toBe(0);
                expect(errors.invalid).toBe(0);

                expect(items.length).toBe(3);

                expect(items[0].id).toBeDefined();
                expect(items[0].createdAt).toBeDefined();
                expect(items[0].title).toBe('Gorillaz');

                expect(items[1].id).toBeDefined();
                expect(items[1].createdAt).toBeDefined();
                expect(items[1].title).toBe('Post Malone');

                expect(items[2].id).toBeDefined();
                expect(items[2].createdAt).toBeDefined();
                expect(items[2].title).toBe('Everything Everything');
            });
        });

        it('ignores zero-length arrays', function() {
            return db.createMany([]);
        });

        it('rejects on invalid item arrays', function(done) {
            return db.createMany().then(
                () => done.fail(),
                (err) => done(err)
            );
        });

        it('marks invalid items', function() {
            return db.createMany([
                Artist.create('test', {
                    keys: {
                        id: 1
                    },

                    title: 'Gorillaz'
                }),
                {},
                5,
                false
            ]).then(({created, errors, items}) => {
                expect(created).toBe(1);

                expect(errors.exists).toBe(0);
                expect(errors.failed).toBe(0);
                expect(errors.invalid).toBe(3);

                expect(items.length).toBe(4);

                expect(items[0].id).toBeDefined();
                expect(items[0].createdAt).toBeDefined();
                expect(items[0].title).toBe('Gorillaz');

                expect(Object.keys(items[1]).length).toBe(0);
                expect(items[2]).toBe(5);
                expect(items[3]).toBe(false);
            });
        });

        it('marks items which have already been created', function() {
            return db.createMany([
                Artist.create('test', {
                    id: 'test',

                    keys: {
                        id: 1
                    },

                    title: 'Gorillaz'
                }),
                Artist.create('test', {
                    keys: {
                        id: 4
                    },

                    title: 'Atlas Genius'
                }),
                false,
                12
            ]).then(({created, errors, items}) => {
                expect(created).toBe(1);
                expect(errors.exists).toBe(1);
                expect(errors.failed).toBe(0);
                expect(errors.invalid).toBe(2);

                expect(items.length).toBe(4);

                expect(items[0].id).toBeDefined();
                expect(items[0].createdAt).toBeDefined();
                expect(items[0].title).toBe('Gorillaz');

                expect(items[1].id).toBeDefined();
                expect(items[1].createdAt).toBeDefined();
                expect(items[1].title).toBe('Atlas Genius');

                expect(items[2]).toBe(false);
                expect(items[3]).toBe(12);
            });
    });
    });

    afterAll(function() {
        return db.destroy();
    });
});
