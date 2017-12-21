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
                expect(transaction.created['music/artist'][artistIds[0]].title).toBe('Gorillaz');

                // Album
                expect(transaction.created['music/album'][albumIds[0]].title).toBe('Demon Days');

                // Track
                expect(transaction.created['music/track'][trackIds[0]].title).toBe('Feel Good Inc');
            });
    });

    afterEach(function() {
        return db.destroy();
    });
});
