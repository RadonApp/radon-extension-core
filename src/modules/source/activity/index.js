import Registry from 'neon-extension-framework/core/registry';

import Log from '../../../core/logger';


function initialize() {
    // Validate activity services
    if(typeof Registry.servicesByType['source/activity'] === 'undefined') {
        Log.error('Unable to initialize activity module, no activity services are available');
        return;
    }

    let serviceIds = Object.keys(Registry.servicesByType['source/activity']);

    if(serviceIds.length !== 1) {
        Log.error('Unable to initialize activity module, exactly one activity service should be defined');
        return;
    }

    // Retrieve service
    let service = Registry.servicesByType['source/activity'][serviceIds[0]];

    if(service.initialized) {
        return;
    }

    // Initialize service
    Log.debug('Initializing activity service: ' + service.id);
    service.initialize();
}

// Initialize activity service
initialize();
