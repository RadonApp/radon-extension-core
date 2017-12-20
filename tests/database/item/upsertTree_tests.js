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

    describe('upsertTree', function() {
        it('creates items', function() {
            let artist = Artist.create('test', {
                title: 'Gorillaz'
            });

            let album = Album.create('test', {
                title: 'Humanz'
            }, {
                artist
            });

            let item = Track.create('test', {
                title: 'Andromeda (feat. D.R.A.M.)',

                number: 10,
                duration: 198000
            }, {
                artist,
                album
            });

            return db.upsertTree(item).then(({created, updated, children, item}) => {
                let id = item.id;
                let revision = item.revision;

                expect(created).toBe(true);
                expect(updated).toBe(false);

                expect(children.created['artist']).toBe(true);
                expect(children.created['album']).toBe(true);

                expect(children.updated['artist']).toBe(false);
                expect(children.updated['album']).toBe(false);

                // Track
                expect(item.id).toBeDefined();
                expect(item.revision).toBeDefined();

                expect(item.title).toBe('Andromeda (feat. D.R.A.M.)');

                // Album
                expect(item.album.id).toBeDefined();
                expect(item.album.revision).toBeDefined();

                expect(item.album.title).toBe('Humanz');

                // Album Artist
                expect(item.album.artist.id).toBeDefined();
                expect(item.album.artist.revision).toBeDefined();

                expect(item.album.artist.title).toBe('Gorillaz');

                // Artist
                expect(item.artist.id).toBe(item.album.artist.id);
                expect(item.artist.revision).toBe(item.album.artist.revision);

                expect(item.artist.title).toBe('Gorillaz');

                // Ensure unchanged items are detected
                return db.upsertTree(item).then(({created, updated, children}) => {
                    expect(created).toBe(false);
                    expect(updated).toBe(false);

                    expect(children.created['artist']).toBe(false);
                    expect(children.created['album']).toBe(false);

                    expect(children.updated['artist']).toBe(false);
                    expect(children.updated['album']).toBe(false);

                    expect(item.id).toBe(id);
                    expect(item.revision).toBe(revision);
                });
            }, (err) => {
                console.log('Error returned:', err.message);
            });
        });

        it('updates items', function() {
            let artist = Artist.create('test', {
                title: 'LCD Soundsystem'
            });

            let album = Album.create('test', {
                title: 'Sound Of Silver'
            }, {
                artist
            });

            let item = Track.create('test', {
                title: 'Time to Get Away',

                number: 2,
                duration: 251000
            }, {
                artist,
                album
            });

            return db.upsertTree(item).then(({created, updated, children, item}) => {
                expect(created).toBe(true);
                expect(updated).toBe(false);

                expect(children.created['artist']).toBe(true);
                expect(children.created['album']).toBe(true);

                expect(children.updated['artist']).toBe(false);
                expect(children.updated['album']).toBe(false);

                // Update artist
                artist.update('test', {
                    keys: {
                        id: 1
                    }
                });

                // Update album
                album.update('test', {
                    keys: {
                        id: 2
                    }
                });

                // Update track
                item.update('test', {
                    keys: {
                        id: 3
                    }
                });

                // Update database
                return db.upsertTree(item).then(({created, updated, children}) => {
                    expect(created).toBe(false);
                    expect(updated).toBe(true);

                    expect(children.created['artist']).toBe(false);
                    expect(children.created['album']).toBe(false);

                    expect(children.updated['artist']).toBe(true);
                    expect(children.updated['album']).toBe(true);

                    expect(artist.resolve('test').keys.id).toBe(1);
                    expect(album.resolve('test').keys.id).toBe(2);
                    expect(item.resolve('test').keys.id).toBe(3);
                });
            }, (err) => {
                console.log('Error returned:', err.message);
            });
        });

        it('rejects on unknown items', function(done) {
            return db.upsertTree({}).then(
                () => done.fail(),
                (err) => done(err)
            );
        });
    });

    afterAll(function() {
        return db.destroy();
    });
});
