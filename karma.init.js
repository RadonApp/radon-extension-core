/* globals jasmine */
jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;

// Import all modules in context
function importAll(r) {
    r.keys().forEach(r);
}

// Import source directories
importAll(require.context('./App', true, /.js$/));
importAll(require.context('./Components', true, /.js$/));
importAll(require.context('./Core', true, /.js$/));
importAll(require.context('./Database', true, /.js$/));
importAll(require.context('./Messaging', true, /.js$/));
importAll(require.context('./Models', true, /.js$/));
importAll(require.context('./Services', true, /.js$/));
