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

    describe('create', function() {
        it('creates items', function() {
            return db.create(Artist.create('test', {
                keys: {
                    id: 1
                },

                title: 'Gorillaz'
            })).then((artist) => {
                expect(artist.id).toBeDefined();
                expect(artist.createdAt).toBeDefined();
            });
        });

        it('rejects on invalid items', function(done) {
            db.create().then(
                () => done.fail(),
                (err) => done(err)
            );
        });

        it('rejects on items which have already been created', function(done) {
            let item = Artist.create('test', {
                id: 'test',

                keys: {
                    id: 1
                },

                title: 'Gorillaz'
            });

            db.create(item).then(
                () => done.fail(),
                (err) => done(err)
            );
        });
    });

    afterAll(function() {
        return db.destroy();
    });
});
