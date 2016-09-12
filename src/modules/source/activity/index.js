import Registry from 'eon.extension.framework/core/registry';
import Bus from 'eon.extension.framework/core/bus';


function initialize() {
    // Validate activity services
    if(typeof Registry.servicesByType['source/activity'] === 'undefined') {
        console.error('Unable to initialize activity module, no activity services are available');
        return;
    }

    var serviceIds = Object.keys(Registry.servicesByType['source/activity']);

    if(serviceIds.length !== 1) {
        console.error('Unable to initialize activity module, exactly one activity service should be defined');
        return;
    }

    // Initialize activity service
    var service = Registry.servicesByType['source/activity'][serviceIds[0]];

    console.log('Initializing activity service: ' + service.id);
    service.initialize();
}

// Initialize activity service
initialize();
