jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;

// Include all source files (so they are included in coverage reports)
var req = require.context('../src', true, /\.js$/);

req.keys().forEach(req);
