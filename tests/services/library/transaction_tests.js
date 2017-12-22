import LibraryTransaction from 'neon-extension-core/modules/background/messaging/services/library/transaction';
import {ItemDatabase} from 'neon-extension-core/database/item';
import {Artist, Album, Track} from 'neon-extension-framework/models/item/music';

import Uuid from 'uuid';


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

        let artist = Artist.create('alpha', {
            title: 'Gorillaz'
        });

        let album = Album.create('alpha', {
            title: 'Demon Days',
            artist
        });

        let tracks = [
            Track.create('alpha', {
                title: 'Feel Good Inc',
                type: 'music/track',

                artist,
                album
            })
        ];

        return Promise.resolve()
            .then(() => transaction.fetch())
            .then(() => transaction.addMany(tracks))
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

                expect(artist.createdAt).toBeDefined();
                expect(artist.updatedAt).toBeDefined();

                expect(artist.resolve('alpha').title).toBe('Gorillaz');
                expect(artist.resolve('alpha').updatedAt).toBeDefined();

                // Album
                let album = transaction.created['music/album'][albumIds[0]];

                expect(album.id).toBeDefined();
                expect(album.revision).toBeDefined();

                expect(album.title).toBe('Demon Days');

                expect(album.artist.id).toBe(artist.id);

                expect(album.createdAt).toBeDefined();
                expect(album.updatedAt).toBeDefined();

                expect(album.resolve('alpha').title).toBe('Demon Days');
                expect(album.resolve('alpha').updatedAt).toBeDefined();

                // Track
                let track = transaction.created['music/track'][trackIds[0]];

                expect(track.id).toBeDefined();
                expect(track.revision).toBeDefined();

                expect(track.title).toBe('Feel Good Inc');

                expect(track.artist.id).toBe(artist.id);
                expect(track.album.id).toBe(album.id);

                expect(track.createdAt).toBeDefined();
                expect(track.updatedAt).toBeDefined();

                expect(track.resolve('alpha').title).toBe('Feel Good Inc');
                expect(track.resolve('alpha').updatedAt).toBeDefined();
            });
    });

    it('updates items', function() {
        let artist = Artist.create('alpha', {
            title: 'Gorillaz'
        });

        let album = Album.create('alpha', {
            title: 'Demon Days',
            artist
        });

        let track = Track.create('alpha', {
            title: 'Feel Good Inc',
            type: 'music/track',

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
                }
            });

            let album = Album.create('beta', {
                title: 'demon days',

                keys: {
                    id: 2
                },

                artist
            });

            let track = Track.create('beta', {
                title: 'feel good inc',
                type: 'music/track',

                keys: {
                    id: 3
                },

                artist,
                album
            });

            return Promise.resolve()
                .then(() => transaction.fetch())
                .then(() => transaction.add(track))
                .then(() => transaction.execute())
                .then(() => {
                    console.log(transaction.created);
                    console.log(transaction.updated);

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

                    expect(artist.createdAt).toBeDefined();
                    expect(artist.updatedAt).toBeDefined();

                    expect(artist.resolve('alpha').title).toBe('Gorillaz');
                    expect(artist.resolve('alpha').updatedAt).toBeDefined();

                    expect(artist.resolve('beta').title).toBe('gorillaz');
                    expect(artist.resolve('beta').updatedAt).toBeDefined();

                    // Album
                    let album = transaction.updated['music/album'][albumIds[0]];

                    expect(album.id).toBeDefined();
                    expect(album.revision).toBeDefined();

                    expect(album.title).toBe('Demon Days');

                    expect(album.artist.id).toBe(artist.id);

                    expect(album.createdAt).toBeDefined();
                    expect(album.updatedAt).toBeDefined();

                    expect(album.resolve('alpha').title).toBe('Demon Days');
                    expect(album.resolve('alpha').updatedAt).toBeDefined();

                    expect(album.resolve('beta').title).toBe('demon days');
                    expect(album.resolve('beta').updatedAt).toBeDefined();

                    // Track
                    let track = transaction.updated['music/track'][trackIds[0]];

                    expect(track.id).toBeDefined();
                    expect(track.revision).toBeDefined();

                    expect(track.title).toBe('Feel Good Inc');

                    expect(track.artist.id).toBe(artist.id);
                    expect(track.album.id).toBe(album.id);

                    expect(track.createdAt).toBeDefined();
                    expect(track.updatedAt).toBeDefined();

                    expect(track.resolve('alpha').title).toBe('Feel Good Inc');
                    expect(track.resolve('alpha').updatedAt).toBeDefined();

                    expect(track.resolve('beta').title).toBe('feel good inc');
                    expect(track.resolve('beta').updatedAt).toBeDefined();
                });
        });
    });

    afterEach(function() {
        return db.destroy();
    });
});
