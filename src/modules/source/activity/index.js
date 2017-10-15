import Log from 'neon-extension-core/core/logger';
import Registry from 'neon-extension-framework/core/registry';


function initialize() {
    if(typeof Registry.servicesByType['source/activity'] === 'undefined') {
        Log.error('No "activity" service available');
        return;
    }

    // Retrieve registered service identifiers
    let serviceIds = Object.keys(Registry.servicesByType['source/activity']);

    // Ensure only one service is defined
    if(serviceIds.length !== 1) {
        Log.error('Exactly one "activity" service should be defined');
        return;
    }

    // Retrieve service
    let service = Registry.servicesByType['source/activity'][serviceIds[0]];

    // Ensure service hasn't already been initialized
    if(service.initialized) {
        return;
    }

    // Initialize service
    Log.debug('Initializing "activity" service "%s"...', service.id);

    try {
        service.initialize();

        Log.info('Initialized "activity" service "%s"', service.id);
    } catch(err) {
        Log.error('Unable to initialize "activity" service "%s": %s', service.id, err && err.message, err);
    }
}

// Initialize activity service
initialize();
