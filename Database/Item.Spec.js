/* eslint-disable jasmine/no-promise-without-done-fail */
import Uuid from 'uuid';

import {Artist, Album, Track} from '@radon-extension/framework/Models/Metadata/Music';
import {Show, Season, Episode} from '@radon-extension/framework/Models/Metadata/Video';

import {ItemDatabase} from './Item';


let db;

function createDatabase() {
    db = new ItemDatabase(Uuid.v4());

    // Wait until database is ready
    return db.ready.then(() => {
        console.log('Database ready');
    });
}

function destroyDatabase() {
    return db.destroy();
}

describe('ItemDatabase', function() {
    afterAll(destroyDatabase);

    describe('create', function() {
        beforeAll(createDatabase);

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

    describe('createMany', function() {
        beforeAll(createDatabase);

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

    describe('fetch', function() {
        beforeAll(createDatabase);

        it('should support items with missing children', () => {
            // Create item
            return db.upsertTree(Episode.create('test', {
                keys: {
                    id: 1
                },

                number: 2,
                title: 'Top Banana'
            })).then(({created, updated, children, item}) => {
                expect(created).toBe(true);
                expect(updated).toBe(false);

                expect(item.season).toBeNull();

                let id = item.id;
                let revision = item.revision;

                // Fetch item
                let current = Episode.create('test', {
                    keys: {
                        id: 1
                    },

                    number: 2,
                    title: 'Top Banana',

                    season: Season.create('test', {
                        number: 1,
                        title: 'Season 1',

                        show: Show.create('test', {
                            title: 'Arrested Development'
                        })
                    })
                });

                return db.fetch(current).then(() => {
                    expect(current.id).toBe(id);
                    expect(current.revision).toBe(revision);

                    expect(current.season).toBeDefined();
                    expect(current.season.show).toBeDefined();
                });
            });
        });
    });

    describe('update', function() {
        beforeAll(createDatabase);

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

                    expect(current.resolve('test').title).toBe('Gorillaz');
                    expect(current.resolve('test').get('created')).toBe(true);
                    expect(current.resolve('test').get('updated')).toBe(true);

                    expect(current.resolve('test').keys).toBeDefined();
                    expect(current.resolve('test').keys.id).toBe(1);
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

    describe('updateMany', function() {
        beforeAll(createDatabase);

        it('updates items', function() {
            let items = [
                Artist.create('test', {
                    keys: {
                        id: 1
                    },

                    title: 'Gorillaz',

                    created: true,
                    updated: false
                }),
                Artist.create('test', {
                    keys: {
                        id: 2
                    },

                    title: 'Post Malone',

                    created: true,
                    updated: false
                }),
                Artist.create('test', {
                    keys: {
                        id: 3
                    },

                    title: 'Everything Everything',

                    created: true,
                    updated: false
                })
            ];

            // Create items
            return db.createMany(items).then(() => {
                // Update items
                return db.updateMany([
                    Artist.create('test', {
                        id: items[0].id,

                        keys: {
                            id: 1
                        },

                        title: 'gorillaz',

                        updated: true
                    }),
                    Artist.create('test', {
                        id: items[1].id,

                        keys: {
                            id: 2
                        },

                        title: 'post malone',

                        updated: true
                    })
                ]).then(({updated, errors, items: currentItems}) => {
                    expect(updated).toBe(2);
                    expect(errors.failed).toBe(0);
                    expect(errors.invalid).toBe(0);
                    expect(errors.notCreated).toBe(0);

                    expect(currentItems.length).toBe(2);

                    // Gorillaz
                    expect(currentItems[0].id).toBe(items[0].id);
                    expect(currentItems[0].revision).not.toBe(items[0].revision);

                    expect(currentItems[0].title).toBe('Gorillaz');
                    expect(currentItems[0].createdAt).toBe(items[0].createdAt);
                    expect(currentItems[0].updatedAt).toBeGreaterThan(items[0].updatedAt);

                    expect(currentItems[0].resolve('test').title).toBe('Gorillaz');
                    expect(currentItems[0].resolve('test').get('created')).toBe(true);
                    expect(currentItems[0].resolve('test').get('updated')).toBe(true);

                    // Post Malone
                    expect(currentItems[1].id).toBe(items[1].id);
                    expect(currentItems[1].revision).not.toBe(items[1].revision);

                    expect(currentItems[1].title).toBe('Post Malone');
                    expect(currentItems[1].createdAt).toBe(items[1].createdAt);
                    expect(currentItems[1].updatedAt).toBeGreaterThan(items[1].updatedAt);

                    expect(currentItems[1].resolve('test').title).toBe('Post Malone');
                    expect(currentItems[1].resolve('test').get('created')).toBe(true);
                    expect(currentItems[1].resolve('test').get('updated')).toBe(true);
                });
            });
        });

        it('ignores items that haven\'t changed', function() {
            let items = [
                Artist.create('test', {
                    keys: {
                        id: 7
                    },

                    title: 'LCD Soundsystem',

                    created: true
                })
            ];

            // Create items
            return db.createMany(items).then(() => {
                // Update items
                return db.updateMany([
                    Artist.create('test', {
                        id: items[0].id,
                        revision: items[0].revision,

                        keys: {
                            id: 7
                        },

                        title: 'LCD Soundsystem'
                    })
                ]).then(({updated, errors, items}) => {
                    expect(updated).toBe(0);

                    expect(errors.failed).toBe(0);
                    expect(errors.invalid).toBe(0);
                    expect(errors.notCreated).toBe(0);

                    expect(items.length).toBe(1);

                    expect(items[0].id).toBeDefined();
                    expect(items[0].createdAt).toBeDefined();
                    expect(items[0].title).toBe('LCD Soundsystem');

                    expect(items[0].resolve('test').get('created')).toBe(true);
                    expect(items[0].resolve('test').get('updated')).toBeUndefined();
                });
            });
        });

        it('ignores zero-length arrays', function() {
            return db.updateMany([]);
        });

        it('rejects on invalid item arrays', function(done) {
            db.updateMany().then(
                () => done.fail(),
                (err) => done(err)
            );
        });

        it('marks invalid items', function() {
            let items = [
                Artist.create('test', {
                    keys: {
                        id: 4
                    },

                    title: 'Midnight Oil',

                    created: true,
                    updated: false
                })
            ];

            // Create items
            return db.createMany(items).then(() => {
                // Update items
                return db.updateMany([
                    Artist.create('test', {
                        id: items[0].id,
                        revision: items[0].revision,

                        keys: {
                            id: 4
                        },

                        title: 'Midnight Oil',

                        updated: true
                    }),
                    {},
                    5,
                    false
                ]).then(({updated, errors, items}) => {
                    expect(updated).toBe(1);

                    expect(errors.failed).toBe(0);
                    expect(errors.invalid).toBe(3);
                    expect(errors.notCreated).toBe(0);

                    expect(items.length).toBe(4);

                    expect(items[0].id).toBeDefined();
                    expect(items[0].createdAt).toBeDefined();
                    expect(items[0].title).toBe('Midnight Oil');

                    expect(items[0].resolve('test').get('created')).toBe(true);
                    expect(items[0].resolve('test').get('updated')).toBe(true);

                    expect(Object.keys(items[1]).length).toBe(0);
                    expect(items[2]).toBe(5);
                    expect(items[3]).toBe(false);
                });
            });
        });

        it('marks items that haven\'t been created', function() {
            let items = [
                Artist.create('test', {
                    keys: {
                        id: 5
                    },

                    title: 'Miike Snow',

                    created: true,
                    updated: false
                })
            ];

            // Create items
            return db.createMany(items).then(() => {
                // Update items
                return db.updateMany([
                    Artist.create('test', {
                        id: items[0].id,
                        revision: items[0].revision,

                        keys: {
                            id: 5
                        },

                        title: 'Miike Snow',

                        updated: true
                    }),
                    Artist.create('test', {
                        keys: {
                            id: 6
                        },

                        title: 'Talking Heads',

                        updated: true
                    }),
                    5,
                    false
                ]).then(({updated, errors, items}) => {
                    expect(updated).toBe(1);

                    expect(errors.failed).toBe(0);
                    expect(errors.invalid).toBe(2);
                    expect(errors.notCreated).toBe(1);

                    expect(items.length).toBe(4);

                    expect(items[0].id).toBeDefined();
                    expect(items[0].createdAt).toBeDefined();
                    expect(items[0].title).toBe('Miike Snow');

                    expect(items[0].resolve('test').get('created')).toBe(true);
                    expect(items[0].resolve('test').get('updated')).toBe(true);

                    expect(items[1].id).toBeNull();
                    expect(items[1].createdAt).toBeDefined();
                    expect(items[1].title).toBe('Talking Heads');

                    expect(items[1].resolve('test').get('created')).toBeUndefined();
                    expect(items[1].resolve('test').get('updated')).toBe(true);

                    expect(items[2]).toBe(5);
                    expect(items[3]).toBe(false);
                });
            });
        });
    });

    describe('upsert', function() {
        beforeAll(createDatabase);

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

    describe('upsertTree', function() {
        beforeAll(createDatabase);

        it('creates items', function() {
            let artist = Artist.create('test', {
                title: 'Gorillaz'
            });

            let album = Album.create('test', {
                title: 'Humanz',
                artist
            });

            let item = Track.create('test', {
                title: 'Andromeda (feat. D.R.A.M.)',

                number: 10,
                duration: 198000,
                artist,
                album
            });

            return db.upsertTree(item).then(({created, updated, children, item}) => {
                let id = item.id;
                let revision = item.revision;

                expect(created).toBe(true);
                expect(updated).toBe(false);

                expect(children.created['music/artist']).toBe(true);
                expect(children.created['music/album']).toBe(true);

                expect(children.updated['music/artist']).toBe(false);
                expect(children.updated['music/album']).toBe(false);

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

                    expect(children.created['music/artist']).toBe(false);
                    expect(children.created['music/album']).toBe(false);

                    expect(children.updated['music/artist']).toBe(false);
                    expect(children.updated['music/album']).toBe(false);

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
                title: 'Sound Of Silver',
                artist
            });

            let item = Track.create('test', {
                title: 'Time to Get Away',

                number: 2,
                duration: 251000,

                artist,
                album
            });

            return db.upsertTree(item).then(({created, updated, children, item}) => {
                expect(created).toBe(true);
                expect(updated).toBe(false);

                expect(children.created['music/artist']).toBe(true);
                expect(children.created['music/album']).toBe(true);

                expect(children.updated['music/artist']).toBe(false);
                expect(children.updated['music/album']).toBe(false);

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

                    expect(children.created['music/artist']).toBe(false);
                    expect(children.created['music/album']).toBe(false);

                    expect(children.updated['music/artist']).toBe(true);
                    expect(children.updated['music/album']).toBe(true);

                    expect(artist.resolve('test').keys.id).toBe(1);
                    expect(album.resolve('test').keys.id).toBe(2);
                    expect(item.resolve('test').keys.id).toBe(3);
                });
            }, (err) => {
                console.log('Error returned:', err.message);
            });
        });

        it('replaces items with missing children', () => {
            // Create item
            return db.upsertTree(Episode.create('test', {
                keys: {
                    id: 1
                },

                number: 2,
                title: 'Top Banana'
            })).then(({created, updated, children, item}) => {
                expect(created).toBe(true);
                expect(updated).toBe(false);

                // Replace item with season
                return db.upsertTree(Episode.create('test', {
                    id: item.id,
                    revision: item.revision,

                    keys: {
                        id: 1
                    },

                    number: 2,
                    title: 'Top Banana',

                    season: Season.create('test', {
                        number: 1,
                        title: 'Season 1',

                        show: Show.create('test', {
                            title: 'Arrested Development'
                        })
                    })
                })).then(({created, updated, children, item}) => {
                    expect(created).toBe(true);
                    expect(updated).toBe(false);

                    expect(item).toBeDefined();
                    expect(item.season).toBeDefined();
                    expect(item.season.show).toBeDefined();
                });
            });
        });

        it('rejects on unknown items', function(done) {
            return db.upsertTree({}).then(
                () => done.fail(),
                (err) => done(err)
            );
        });
    });
});
