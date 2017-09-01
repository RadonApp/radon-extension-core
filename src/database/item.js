import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';


// Construct database
let Database = new (PouchDB.plugin(PouchFind))('items', {
    'auto_compaction': true,
    'revs_limit': 1
});

// Ensure indexes exist
Database.createIndex({ index: { fields: ['ids.googlemusic.id'] } });
Database.createIndex({ index: { fields: ['ids.googlemusic.path'] } });

// Export database
export default Database;
