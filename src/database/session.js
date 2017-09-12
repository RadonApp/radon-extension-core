import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';


// Construct database
let Database = new (PouchDB.plugin(PouchFind))('sessions', {
    'auto_compaction': true,
    'revs_limit': 1
});

// Delete indexes
let deleteIndexes = [
    'channel'
];

Database.getIndexes().then((result) => {
    for(let i = 0; i < result.indexes.length; i++) {
        let index = result.indexes[i];

        if(deleteIndexes.indexOf(index.name) >= 0) {
            Database.deleteIndex(index);
        }
    }
});

// Ensure indexes have been created
Database.createIndex({
    index: {
        fields: ['clientId'],
        name: 'client'
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
