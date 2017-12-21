import {ItemDatabase} from 'neon-extension-core/database/item';
import {Artist, Album} from 'neon-extension-framework/models/item/music';

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

    describe('upsert', function() {
        it('upserts items', function() {
            let item = Artist.create('neon-extension-source-googlemusic', {
                keys: {
                    id: 1
                },

                title: 'Gorillaz',

                created: true,
                updated: false
            });

            // Create item
            return db.upsert(item).then(({created, updated}) => {
                expect(created).toBe(true);
                expect(updated).toBe(false);

                // Update item
                return db.upsert(Artist.create('neon-extension-source-googlemusic', {
                    keys: {
                        id: 1
                    },

                    title: 'gorillaz',

                    updated: true
                })).then(({created, updated, item: current}) => {
                    expect(created).toBe(false);
                    expect(updated).toBe(true);

                    expect(current.id).toBe(item.id);
                    expect(current.revision).not.toBe(item.revision);

                    expect(current.title).toBe('Gorillaz');
                    expect(current.createdAt).toBe(item.createdAt);
                    expect(current.updatedAt).toBeGreaterThan(item.updatedAt);

                    expect(current.resolve('neon-extension-source-googlemusic').title).toBe('Gorillaz');
                    expect(current.resolve('neon-extension-source-googlemusic').get('created')).toBe(true);
                    expect(current.resolve('neon-extension-source-googlemusic').get('updated')).toBe(true);

                    expect(current.resolve('neon-extension-source-googlemusic').keys).toBeDefined();
                    expect(current.resolve('neon-extension-source-googlemusic').keys.id).toBe(1);
                });
            });
        });

        it('matches items by slug', function() {
            let item = Artist.create('neon-extension-source-googlemusic', {
                keys: {
                    id: 2
                },

                title: 'Röyksopp'
            });

            // Create item
            return db.upsert(item).then(({created, updated}) => {
                expect(created).toBe(true);
                expect(updated).toBe(false);

                expect(item.keys['item'].slug).toBe('royksopp');
                expect(item.title).toBe('Röyksopp');

                expect(item.resolve('neon-extension-source-googlemusic').keys.id).toBe(2);
                expect(item.resolve('neon-extension-source-googlemusic').title).toBe('Röyksopp');

                // Update item
                return db.upsert(Artist.create('neon-extension-destination-lastfm', {
                    keys: {
                        id: 2
                    },

                    title: 'Royksopp'
                })).then(({created, updated, item: current}) => {
                    expect(created).toBe(false);
                    expect(updated).toBe(true);

                    expect(current.id).toBe(item.id);
                    expect(current.revision).not.toBe(item.revision);

                    expect(current.keys['item'].slug).toBe('royksopp');
                    expect(current.title).toBe('Röyksopp');

                    expect(current.resolve('neon-extension-source-googlemusic').keys.id).toBe(2);
                    expect(current.resolve('neon-extension-source-googlemusic').title).toBe('Röyksopp');

                    expect(current.resolve('neon-extension-destination-lastfm').keys.id).toBe(2);
                    expect(current.resolve('neon-extension-destination-lastfm').title).toBe('Royksopp');
                });
            });
        });

        it('rejects on invalid items', function(done) {
            db.upsert().then(
                () => done.fail(),
                (err) => {
                    console.log('Error returned:', err.message);
                    done(err);
                }
            );
        });
    });

    afterAll(function() {
        return db.destroy();
    });
});
