import IsNil from 'lodash-es/isNil';

import Log from 'neon-extension-core/Core/Logger';

import MessageBroker from '../Broker';


export class ServiceHandler {
    constructor() {
        // Bind request methods
        MessageBroker.requests.on('subscribe', this.subscribe.bind(this));
        MessageBroker.requests.on('unsubscribe', this.unsubscribe.bind(this));
    }

    subscribe(params, resolve, reject, request, sender) {
        if(IsNil(params) || IsNil(params.channel) || IsNil(params.service)) {
            reject(new Error('Invalid request parameters'));
            return;
        }

        let service = MessageBroker.service(params.channel, params.service);

        try {
            if(service.subscribe(sender)) {
                Log.trace(
                    'Client "%s" subscribed to the "%s/%s" service',
                    sender.id, params.channel, params.service
                );
            }

            resolve(true);
        } catch(err) {
            Log.warn(
                'Client "%s" was unable to subscribe to the "%s/%s" service: %s',
                sender.id, params.channel, params.service, err.message
            );
            reject(err);
        }
    }

    unsubscribe(params, resolve, reject, request, sender) {
        if(IsNil(params) || IsNil(params.channel) || IsNil(params.service)) {
            reject(new Error('Invalid request parameters'));
            return;
        }

        let service = MessageBroker.service(params.channel, params.service);

        try {
            if(service.unsubscribe(sender)) {
                Log.trace(
                    'Client "%s" un-subscribed from the "%s/%s" service',
                    sender.id, params.channel, params.service
                );
            }

            resolve(true);
        } catch(err) {
            Log.warn(
                'Client "%s" was unable to un-subscribe from the "%s/%s" service: %s',
                sender.id, params.channel, params.service, err.message
            );
            reject(err);
        }
    }
}

export default new ServiceHandler();
