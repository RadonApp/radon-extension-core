import EventEmitter from 'eventemitter3';
import IsString from 'lodash-es/isString';

import Log from 'neon-extension-core/core/logger';
import MessageClient from 'neon-extension-framework/messaging/client';
import Messaging from 'neon-extension-browser/messaging';
import Tabs from 'neon-extension-browser/tabs';
import {isDefined} from 'neon-extension-framework/core/helpers';
import {parseMessageName} from 'neon-extension-framework/messaging/core/helpers';

import MessageBrokerChannel from './channel';
import MessageBrokerClient from './client';


export class MessageBroker extends EventEmitter {
    constructor(options) {
        super();

        this.channels = {};

        // Create request handler
        this.requests = new EventEmitter();

        // Parse options
        options = options || {};

        this.requestTimeout = options.requestTimeout || 6000;

        // Bind broker events
        this.on('connect', this._onConnect.bind(this));

        // Bind to client events
        MessageClient.on('connect', this._onClientConnected.bind(this));
        MessageClient.bind(this);

        // Bind to messaging events
        if(!Messaging.supported) {
            return;
        }

        Messaging.on('connect', this._onPortConnected.bind(this));
        Messaging.on('message', this._onMessage.bind(this));
    }

    channel(name) {
        if(!IsString(name)) {
            throw new Error('Invalid value provided for the "name" parameter (expected string)');
        }

        // Create channel (if one doesn't exist)
        if(!isDefined(this.channels[name])) {
            this.channels[name] = new MessageBrokerChannel(this, name);
        }

        // Return instance
        return this.channels[name];
    }

    service(channel, name) {
        return this.channel(channel).service(name);
    }

    // region Event Handlers

    _onClientConnected(instance) {
        let client = new MessageBrokerClient(instance.id, {
            post: (message) => instance.emit('receive', message)
        });

        // Bind to events
        instance.on('post', (message) => client.emit('message', message));

        // Fire broker "connected" event
        this.emit('connect', client);
    }

    _onPortConnected(port) {
        let client = new MessageBrokerClient(port.name, {
            disconnect: () => port.disconnect(),
            post: (message) => port.postMessage(message)
        });

        // Bind to events
        port.on('message', (message) => client.emit('message', message));
        port.on('disconnect', () => client.onDisconnected());

        // Bind to tab events
        if(isDefined(port.sender.tab) && isDefined(port.sender.tab.id)) {
            Tabs.once('removed#' + port.sender.tab.id, () => client.onDisconnected());
        }

        // Fire event
        this.emit('connect', client);
    }

    _onConnect(client) {
        Log.debug('Client "%s" has connected', client.id);

        // Bind to events
        client.on('message', (message) => this._onMessage(message, client));
        client.on('disconnect', () => this._onDisconnected(client));
    }

    _onDisconnected(client) {
        Log.debug('Client "%s" has disconnected', client.id);

        // Fire event
        this.emit('disconnect', client);
    }

    _onMessage(message, sender) {
        if(message.type === 'request') {
            this.processRequest(message, sender);
        } else if(message.type === 'event') {
            this.processEvent(message, sender);
        } else {
            Log.warn('Received unknown message: %o (sender: %o)', message, sender);
        }
    }

    // endregion

    processEvent(message, sender) {
        Log.trace('Processing event: %s', message.name);

        // Parse name
        let event = parseMessageName(message.name);

        if(!isDefined(event)) {
            Log.warn('Unable to parse event name: %s', message.name);
            return;
        }

        // Retrieve event target
        let target;

        if(isDefined(event.channel) && isDefined(event.service)) {
            target = this.service(event.channel, event.service);
        } else if(isDefined(event.channel)) {
            target = this.channel(event.channel);
        } else {
            Log.warn('Unsupported event: %s', message.name);
            return;
        }

        // Emit event
        target.emit(event.name, message.payload, {
            broadcastExclude: [sender.id],
            localArguments: [sender]
        });
    }

    processRequest(request, sender) {
        let timeoutId;

        Log.trace('Processing request: %s (id: %o)', request.name, request.id);

        // Create base response
        let response = {
            type: 'response',
            id: request.id,
            name: request.name,

            success: false
        };

        // Post message function
        function post(response) {
            // Cancel timeout callback
            if(isDefined(timeoutId)) {
                clearTimeout(timeoutId);
            }

            // Post message to sender
            sender.post(response);
        }

        // Start timeout callback
        timeoutId = setTimeout(
            function() {
                post({...response, message: 'Internal request timeout'});
            },
            this.requestTimeout
        );

        // Request resolve function
        function _resolve(result) {
            post({
                ...response,
                success: true,
                result
            });
        }

        // Request reject function
        function _reject(err) {
            post({
                ...response,
                message: err.message
            });
        }

        // Emit request event
        this.requests.emit(request.name, request.payload, _resolve, _reject, request, sender);
    }
}

export default new MessageBroker();
