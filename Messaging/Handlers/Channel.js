import IsNil from 'lodash-es/isNil';

import Log from '../../Core/Logger';
import MessageBroker from '../Broker';


export class ChannelHandler {
    constructor() {
        // Bind request methods
        MessageBroker.requests.on('join', this.join.bind(this));
        MessageBroker.requests.on('leave', this.leave.bind(this));
    }

    join(params, resolve, reject, request, sender) {
        if(IsNil(params) || IsNil(params.channel)) {
            reject(new Error('Invalid request parameters'));
            return;
        }

        let channel = MessageBroker.channel(params.channel);

        try {
            if(channel.join(sender)) {
                Log.trace('Client "%s" joined the "%s" channel', sender.id, params.channel);
            }

            resolve(true);
        } catch(err) {
            Log.warn('Client "%s" was unable to join the "%s" channel: %s', sender.id, params.channel, err.message);
            reject(err);
        }
    }

    leave(params, resolve, reject, request, sender) {
        if(IsNil(params) || IsNil(params.channel)) {
            reject(new Error('Invalid request parameters'));
            return;
        }

        let channel = MessageBroker.channel(params.channel);

        try {
            if(channel.leave(sender)) {
                Log.trace('Client "%s" left the "%s" channel', sender.id, params.channel);
            }

            resolve(true);
        } catch(err) {
            Log.warn('Client "%s" was unable to leave the "%s" channel: %s', sender.id, params.channel, err.message);
            reject(err);
        }
    }
}

export default new ChannelHandler();
