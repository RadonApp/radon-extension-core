import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';


// Construct database
let Database = new (PouchDB.plugin(PouchFind))('sessions', {
    'auto_compaction': true,
    'revs_limit': 100
});

// Ensure indexes exist
Database.createIndex({
    index: {
        fields: ['channelId'],
        name: 'channel'
    }
});

Database.createIndex({
    index: {
        fields: ['state'],
        name: 'state'
    }
});

// Export database
export default Database;
