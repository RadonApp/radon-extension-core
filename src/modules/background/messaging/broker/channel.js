import EventEmitter from 'eventemitter3';
import Merge from 'lodash-es/merge';

import BrokerEmitter from './emitter';
import MessageBrokerService from './service';
import {isDefined} from 'eon.extension.framework/core/helpers';


export default class MessageBrokerChannel extends EventEmitter {
    constructor(broker, name) {
        super();

        this.broker = broker;
        this.name = name;

        this.joined = {};
        this.services = {};

        // Bind events
        this.broker.on('disconnect', this.onClientDisconnected.bind(this));

        // Create request emitter
        this.requests = new BrokerEmitter(this.broker.requests, name);
    }

    service(name) {
        // Create channel (if one doesn't exist)
        if(!isDefined(this.services[name])) {
            this.services[name] = new MessageBrokerService(this, name);
        }

        // Return channel instance
        return this.services[name];
    }

    emit(name, payload, options) {
        options = Merge({
            broadcast: true,
            broadcastExclude: [],
            local: true
        }, options || {});

        // Emit event locally
        if(options.local) {
            super.emit(name, payload);
        }

        // Send event to joined clients
        if(options.broadcast) {
            for(let id in this.joined) {
                if(!this.joined.hasOwnProperty(id)) {
                    continue;
                }

                if(options.broadcastExclude.indexOf(id) >= 0) {
                    continue;
                }

                // Send event to client
                this.joined[id].post({
                    type: 'event',
                    name: this.name + '/' + name,
                    payload
                });
            }
        }
    }

    join(client) {
        if(isDefined(this.joined[client.id])) {
            return false;
        }

        this.joined[client.id] = client;
        return true;
    }

    leave(client) {
        if(!isDefined(this.joined[client.id])) {
            return false;
        }

        delete this.joined[client.id];
        return true;
    }

    // region Event Handlers

    onClientDisconnected(client) {
        // Remove client
        this.leave(client);
    }

    // endregion
}
