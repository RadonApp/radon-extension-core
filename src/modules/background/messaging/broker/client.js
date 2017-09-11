import EventEmitter from 'eventemitter3';

import Log from 'eon.extension.core/core/logger';
import {isDefined} from 'eon.extension.framework/core/helpers';


export default class MessageBrokerClient extends EventEmitter {
    constructor(id, options) {
        super();

        this.id = id;

        // Parse options
        options = options || {};

        this._post = options.post;
    }

    post(message) {
        if(!isDefined(this._post)) {
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
}
