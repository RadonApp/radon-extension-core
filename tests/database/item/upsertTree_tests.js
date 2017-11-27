import ItemDatabase from 'neon-extension-core/database/item';
import {Artist, Album, Track} from 'neon-extension-framework/models/item/music';

import ForEach from 'lodash-es/forEach';
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
        let artist = Artist.create('test', {
            title: 'Gorillaz'
        });

        let album = Album.create('test', {
            title: 'Humanz'
        }, {
            artist
        });

        it('upserts tree of items', function() {
            return db.upsertTree(new Track({
                title: 'Andromeda (feat. D.R.A.M.)',

                number: 10,
                duration: 198000
            }, {
                artist,
                album
            })).then(({updated, item}) => {
                expect(updated).toBe(true);

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
            });
        });
    });

    afterAll(function() {
        return db.destroy();
    });
});
