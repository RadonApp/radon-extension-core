import Log from 'neon-extension-core/core/logger';
import Registry from 'neon-extension-framework/core/registry';


function initialize() {
    if(typeof Registry.servicesByType['source/library'] === 'undefined') {
        Log.error('No "library" service available');
        return;
    }

    // Retrieve registered service identifiers
    let serviceIds = Object.keys(Registry.servicesByType['source/library']);

    // Ensure only one service is defined
    if(serviceIds.length !== 1) {
        Log.error('Exactly one "library" service should be defined');
        return;
    }

    // Retrieve service
    let service = Registry.servicesByType['source/library'][serviceIds[0]];

    // Ensure service hasn't already been initialized
    if(service.initialized) {
        return;
    }

    // Initialize service
    Log.debug('Initializing "library" service "%s"...', service.id);

    try {
        service.initialize();

        Log.info('Initialized "library" service "%s"', service.id);
    } catch(err) {
        Log.error('Unable to initialize "library" service "%s": %s', service.id, err && err.message, err);
    }
}

// Initialize library service
initialize();
