import Registry from 'eon.extension.framework/core/registry';


function initialize() {
    // Validate activity services
    if(typeof Registry.servicesByType['source/activity'] === 'undefined') {
        console.error('Unable to initialize activity module, no activity services are available');
        return;
    }

    let serviceIds = Object.keys(Registry.servicesByType['source/activity']);

    if(serviceIds.length !== 1) {
        console.error('Unable to initialize activity module, exactly one activity service should be defined');
        return;
    }

    // Retrieve service
    let service = Registry.servicesByType['source/activity'][serviceIds[0]];

    if(service.initialized) {
        return;
    }

    // Initialize service
    console.debug('Initializing activity service: ' + service.id);
    service.initialize();
}

// Initialize activity service
initialize();
