import ItemDatabase from 'neon-extension-core/database/item';
import {Artist} from 'neon-extension-framework/models/item/music';

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

                title: 'gorillaz',

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

                    title: 'Gorillaz',

                    updated: true
                })).then(({created, updated, item: current}) => {
                    expect(created).toBe(false);
                    expect(updated).toBe(true);

                    expect(current.id).toBe(item.id);
                    expect(current.revision).not.toBe(item.revision);

                    expect(current.title).toBe('Gorillaz');
                    expect(current.createdAt).toBe(item.createdAt);
                    expect(current.updatedAt).toBeGreaterThan(item.updatedAt);

                    expect(current.get('neon-extension-source-googlemusic').title).toBe('Gorillaz');
                    expect(current.get('neon-extension-source-googlemusic').created).toBe(true);
                    expect(current.get('neon-extension-source-googlemusic').updated).toBe(true);

                    expect(current.get('neon-extension-source-googlemusic').keys).toBeDefined();
                    expect(current.get('neon-extension-source-googlemusic').keys.id).toBe(1);
                });
            });
        });

        it('matches items by slug', function() {
            let item = Artist.create('neon-extension-source-googlemusic', {
                keys: {
                    id: 1
                },

                title: 'Röyksopp'
            });

            // Create item
            return db.upsert(item).then(({created, updated}) => {
                expect(created).toBe(true);
                expect(updated).toBe(false);

                expect(item.keys['item'].slug).toBe('royksopp');
                expect(item.title).toBe('Röyksopp');

                expect(item.get('neon-extension-source-googlemusic').keys.id).toBe(1);
                expect(item.get('neon-extension-source-googlemusic').title).toBe('Röyksopp');

                // Update item
                return db.upsert(Artist.create('neon-extension-destination-lastfm', {
                    keys: {
                        id: 1
                    },

                    title: 'Royksopp'
                })).then(({created, updated, item: current}) => {
                    expect(created).toBe(false);
                    expect(updated).toBe(true);

                    expect(current.id).toBe(item.id);
                    expect(current.revision).not.toBe(item.revision);

                    expect(current.keys['item'].slug).toBe('royksopp');
                    expect(current.title).toBe('Röyksopp');

                    expect(current.get('neon-extension-source-googlemusic').keys.id).toBe(1);
                    expect(current.get('neon-extension-source-googlemusic').title).toBe('Röyksopp');

                    expect(current.get('neon-extension-destination-lastfm').keys.id).toBe(1);
                    expect(current.get('neon-extension-destination-lastfm').title).toBe('Royksopp');
                });
            });
        });
    });

    afterAll(function() {
        return db.destroy();
    });
});
