import Uuid from 'uuid';

import {Artist, Album, Track} from 'neon-extension-framework/Models/Metadata/Music';

import LibraryTransaction from './LibraryTransaction';
import {ItemDatabase} from '../../Database/Item';


describe('LibraryTransaction', function() {
    let db;

    beforeEach(function() {
        db = new ItemDatabase(Uuid.v4());

        // Wait until database is ready
        return db.ready.then(() => {
            console.log('Database ready');
        });
    });

    it('creates items', function() {
        let transaction = new LibraryTransaction([
            'music/artist',
            'music/album',
            'music/track'
        ], {
            database: db,
            source: 'alpha'
        });

        let tracks = [
            Track.create('alpha', {
                keys: {
                    id: 300
                },

                title: 'Feel Good Inc',

                createdAt: 2000,
                updatedAt: 2000,

                artist: Artist.create('alpha', {
                    keys: {
                        id: 100
                    },

                    title: 'Gorillaz',

                    createdAt: 2000,
                    updatedAt: 2000
                }),

                album: Album.create('alpha', {
                    keys: {
                        id: 200
                    },

                    title: 'Demon Days',

                    createdAt: 2000,
                    updatedAt: 2000,

                    artist: Artist.create('alpha', {
                        keys: {
                            id: 100
                        },

                        title: 'Gorillaz',

                        createdAt: 2000,
                        updatedAt: 2000
                    })
                })
            }),

            Track.create('alpha', {
                keys: {
                    id: 301
                },

                title: 'Feel Good Inc',

                createdAt: 2000,
                updatedAt: 2000,

                artist: Artist.create('alpha', {
                    keys: {
                        id: 101
                    },

                    title: 'Gorillaz',

                    createdAt: 2000,
                    updatedAt: 2000
                }),

                album: Album.create('alpha', {
                    keys: {
                        id: 201
                    },

                    title: 'Demon Days',

                    createdAt: 2000,
                    updatedAt: 2000,

                    artist: Artist.create('alpha', {
                        keys: {
                            id: 101
                        },

                        title: 'Gorillaz',

                        createdAt: 2000,
                        updatedAt: 2000
                    })
                })
            })
        ];

        return Promise.resolve()
            .then(() => transaction.fetch())
            .then(() => transaction.addMany(tracks, { chunk: 1 }).then(({ added, ignored }) => {
                expect(added).toBe(2);
                expect(ignored).toBe(0);
            }))
            .then(() => transaction.execute())
            .then(() => {
                let artistIds = Object.keys(transaction.created['music/artist'] || {});
                let albumIds = Object.keys(transaction.created['music/album'] || {});
                let trackIds = Object.keys(transaction.created['music/track'] || {});

                // Validate created item counts
                expect(artistIds.length).toBe(1);
                expect(albumIds.length).toBe(1);
                expect(trackIds.length).toBe(1);

                // Artist
                let artist = transaction.created['music/artist'][artistIds[0]];

                expect(artist.id).toBeDefined();
                expect(artist.revision).toBeDefined();

                expect(artist.title).toBe('Gorillaz');

                expect(artist.createdAt).toBe(2000);
                expect(artist.updatedAt).toBe(2000);

                expect(artist.resolve('alpha').title).toBe('Gorillaz');
                expect(artist.resolve('alpha').updatedAt).toBe(2000);

                // Album
                let album = transaction.created['music/album'][albumIds[0]];

                expect(album.id).toBeDefined();
                expect(album.revision).toBeDefined();

                expect(album.title).toBe('Demon Days');

                expect(album.artist.id).toBe(artist.id);

                expect(album.createdAt).toBe(2000);
                expect(album.updatedAt).toBe(2000);

                expect(album.resolve('alpha').title).toBe('Demon Days');
                expect(album.resolve('alpha').updatedAt).toBe(2000);

                // Track
                let track = transaction.created['music/track'][trackIds[0]];

                expect(track.id).toBeDefined();
                expect(track.revision).toBeDefined();

                expect(track.title).toBe('Feel Good Inc');

                expect(track.artist.id).toBe(artist.id);
                expect(track.album.id).toBe(album.id);

                expect(track.createdAt).toBe(2000);
                expect(track.updatedAt).toBe(2000);

                expect(track.resolve('alpha').title).toBe('Feel Good Inc');
                expect(track.resolve('alpha').updatedAt).toBe(2000);
            });
    });

    it('updates items', function() {
        let artist = Artist.create('alpha', {
            title: 'Gorillaz',

            createdAt: 2000,
            updatedAt: 2000
        });

        let album = Album.create('alpha', {
            title: 'Demon Days',

            createdAt: 2000,
            updatedAt: 2000,

            artist
        });

        let track = Track.create('alpha', {
            title: 'Feel Good Inc',

            createdAt: 2000,
            updatedAt: 2000,

            artist,
            album
        });

        return db.upsertTree(track).then(() => {
            let transaction = new LibraryTransaction([
                'music/artist',
                'music/album',
                'music/track'
            ], {
                database: db,
                source: 'alpha'
            });

            let artist = Artist.create('beta', {
                title: 'gorillaz',

                keys: {
                    id: 1
                },

                createdAt: 2001,
                updatedAt: 2001
            });

            let album = Album.create('beta', {
                title: 'demon days',

                keys: {
                    id: 2
                },

                createdAt: 2001,
                updatedAt: 2001,

                artist
            });

            let track = Track.create('beta', {
                title: 'feel good inc',
                type: 'music/track',

                keys: {
                    id: 3
                },

                createdAt: 2001,
                updatedAt: 2001,

                artist,
                album
            });

            return Promise.resolve()
                .then(() => transaction.fetch())
                .then(() => transaction.add(track))
                .then(() => transaction.execute())
                .then(() => {
                    let artistIds = Object.keys(transaction.updated['music/artist'] || {});
                    let albumIds = Object.keys(transaction.updated['music/album'] || {});
                    let trackIds = Object.keys(transaction.updated['music/track'] || {});

                    // Validate created item counts
                    expect(artistIds.length).toBe(1);
                    expect(albumIds.length).toBe(1);
                    expect(trackIds.length).toBe(1);

                    // Artist
                    let artist = transaction.updated['music/artist'][artistIds[0]];

                    expect(artist.id).toBeDefined();
                    expect(artist.revision).toBeDefined();

                    expect(artist.title).toBe('Gorillaz');

                    expect(artist.createdAt).toBe(2000);
                    expect(artist.updatedAt).toBe(2001);

                    expect(artist.resolve('alpha').title).toBe('Gorillaz');
                    expect(artist.resolve('alpha').updatedAt).toBe(2000);

                    expect(artist.resolve('beta').title).toBe('gorillaz');
                    expect(artist.resolve('beta').updatedAt).toBe(2001);

                    // Album
                    let album = transaction.updated['music/album'][albumIds[0]];

                    expect(album.id).toBeDefined();
                    expect(album.revision).toBeDefined();

                    expect(album.title).toBe('Demon Days');

                    expect(album.artist.id).toBe(artist.id);

                    expect(album.createdAt).toBe(2000);
                    expect(album.updatedAt).toBe(2001);

                    expect(album.resolve('alpha').title).toBe('Demon Days');
                    expect(album.resolve('alpha').updatedAt).toBe(2000);

                    expect(album.resolve('beta').title).toBe('demon days');
                    expect(album.resolve('beta').updatedAt).toBe(2001);

                    // Track
                    let track = transaction.updated['music/track'][trackIds[0]];

                    expect(track.id).toBeDefined();
                    expect(track.revision).toBeDefined();

                    expect(track.title).toBe('Feel Good Inc');

                    expect(track.artist.id).toBe(artist.id);
                    expect(track.album.id).toBe(album.id);

                    expect(track.createdAt).toBe(2000);
                    expect(track.updatedAt).toBe(2001);

                    expect(track.resolve('alpha').title).toBe('Feel Good Inc');
                    expect(track.resolve('alpha').updatedAt).toBe(2000);

                    expect(track.resolve('beta').title).toBe('feel good inc');
                    expect(track.resolve('beta').updatedAt).toBe(2001);
                });
        });
    });

    afterEach(function() {
        return db.destroy();
    });
});
