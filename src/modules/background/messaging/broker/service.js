import EventEmitter from 'eventemitter3';
import Merge from 'lodash-es/merge';

import BrokerEmitter from './emitter';
import {isDefined} from 'eon.extension.framework/core/helpers';


export default class MessageBrokerService extends EventEmitter {
    constructor(channel, name) {
        super();

        this.channel = channel;
        this.name = name;

        this.subscribed = {};

        // Bind events
        this.broker.on('disconnect', this.onClientDisconnected.bind(this));

        // Create request emitter
        this.requests = new BrokerEmitter(this.channel.requests, name);
    }

    get broker() {
        return this.channel.broker;
    }

    emit(name, payload, options) {
        options = Merge({
            broadcast: true,
            broadcastExclude: [],
            local: true,
            localArguments: []
        }, options || {});

        // Emit event locally
        if(options.local) {
            super.emit(name, payload, ...options.localArguments);
        }

        // Send event to subscribed clients
        if(options.broadcast) {
            for(let id in this.subscribed) {
                if(!this.subscribed.hasOwnProperty(id)) {
                    continue;
                }

                if(options.broadcastExclude.indexOf(id) >= 0) {
                    continue;
                }

                // Send event to client
                this.subscribed[id].post({
                    type: 'event',
                    name: this.channel.name + '/' + this.name + '/' + name,
                    payload
                });
            }
        }

        return true;
    }

    emitTo(clientId, name, payload, options) {
        options = Merge({
            local: true
        }, options || {});

        // Emit event locally
        if(options.local) {
            super.emit(name, payload);
        }

        // Ensure client exists
        if(!isDefined(this.subscribed[clientId])) {
            return false;
        }

        // Send event to client
        this.subscribed[clientId].post({
            type: 'event',
            name: this.channel.name + '/' + this.name + '/' + name,
            payload
        });

        return true;
    }

    subscribe(client) {
        if(isDefined(this.subscribed[client.id])) {
            return false;
        }

        this.subscribed[client.id] = client;
        return true;
    }

    unsubscribe(client) {
        if(!isDefined(this.subscribed[client.id])) {
            return false;
        }

        delete this.subscribed[client.id];
        return true;
    }

    // region Event Handlers

    onClientDisconnected(client) {
        // Remove client
        this.unsubscribe(client);
    }

    // endregion
}
