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

    describe('update', function() {
        it('updates items', function() {
            let item = Artist.create('test', {
                keys: {
                    id: 1
                },

                title: 'Gorillaz',

                created: true,
                updated: false
            });

            // Create item
            return db.create(item).then(() => {
                // Update item
                return db.update(Artist.create('test', {
                    id: item.id,

                    keys: {
                        id: 1
                    },

                    title: 'gorillaz',

                    updated: true
                })).then(({updated, item: current}) => {
                    expect(updated).toBe(true);

                    expect(current.id).toBe(item.id);
                    expect(current.revision).not.toBe(item.revision);

                    expect(current.title).toBe('Gorillaz');
                    expect(current.createdAt).toBe(item.createdAt);
                    expect(current.updatedAt).toBeGreaterThan(item.updatedAt);

                    expect(current.get('test').title).toBe('gorillaz');
                    expect(current.get('test').created).toBe(true);
                    expect(current.get('test').updated).toBe(true);

                    expect(current.get('test').keys).toBeDefined();
                    expect(current.get('test').keys.id).toBe(1);
                });
            });
        });

        it('rejects on invalid items', function(done) {
            db.update().then(
                () => done.fail(),
                (err) => done(err)
            );
        });

        it('rejects on items which haven\'t been created', function(done) {
            let item = Artist.create('test', {
                keys: {
                    id: 1
                },

                title: 'Gorillaz'
            });

            db.update(item).then(
                () => done.fail(),
                (err) => done(err)
            );
        });
    });

    afterAll(function() {
        return db.destroy();
    });
});
