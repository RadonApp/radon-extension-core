import EventEmitter from 'eventemitter3';
import IsNil from 'lodash-es/isNil';

import Log from '../../Core/Logger';


export default class MessageBrokerClient extends EventEmitter {
    constructor(id, options) {
        super();

        this.id = id;

        this.connected = true;

        // Parse options
        options = options || {};

        this._disconnect = options.disconnect;
        this._post = options.post;
    }

    disconnect() {
        if(IsNil(this._disconnect)) {
            Log.warn('No "disconnect" function available on client: %o', this);
            return false;
        }

        // Disconnect from client
        try {
            this._disconnect();
        } catch(e) {
            return false;
        }

        // Handle disconnection
        this.onDisconnected();
        return true;
    }

    post(message) {
        if(IsNil(this._post)) {
            Log.warn('No "post" function available on client: %o', this);
            return Promise.reject();
        }

        // Post message to client
        try {
            this._post(message);
        } catch(e) {
            return Promise.reject(e);
        }

        return Promise.resolve();
    }

    onDisconnected() {
        if(!this.connected) {
            return;
        }

        // Update state
        this.connected = false;

        // Emit event
        this.emit('disconnect');

        // Remove event listeners
        this.removeAllListeners();
    }
}
