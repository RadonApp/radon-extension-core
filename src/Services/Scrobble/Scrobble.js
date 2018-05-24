/* eslint-disable no-multi-spaces, key-spacing */
import IsNil from 'lodash-es/isNil';

import ItemDatabase from 'neon-extension-core/Database/Item';
import Log from 'neon-extension-core/Core/Logger';
import Plugin from 'neon-extension-core/Core/Plugin';
import Registry from 'neon-extension-framework/Core/Registry';
import Service from 'neon-extension-core/Messaging/Core/Service';
import Session from 'neon-extension-framework/Models/Session';
import SessionDatabase from 'neon-extension-core/Database/Session';
import {MediaTypes} from 'neon-extension-framework/Core/Enums';
import {Services} from 'neon-extension-framework/Core/Constants';


export default class ScrobbleService extends Service {
    constructor() {
        super(Plugin, 'scrobble');

        this._activeClients = {};

        // Retrieve scrobble services, group by supported media
        this.services = this._getServices();

        // Activity Events
        this.on('activity.created',  this.onSessionUpdated.bind(this, 'created'));
        this.on('activity.started',  this.onSessionUpdated.bind(this, 'started'));
        this.on('activity.seeked',   this.onSessionUpdated.bind(this, 'seeked'));
        this.on('activity.progress', this.onSessionUpdated.bind(this, 'progress'));
        this.on('activity.paused',   this.onSessionUpdated.bind(this, 'paused'));
        this.on('activity.stopped',  this.onSessionUpdated.bind(this, 'stopped'));
    }

    onClientConnected(client) {
        if(!IsNil(this._activeClients[client.id])) {
            return;
        }

        Log.debug('Client "%s" connected', client.id);

        // Store client reference
        this._activeClients[client.id] = client;

        // Bind to events
        client.on('disconnect', this.onClientDisconnected.bind(this, client));
    }

    onClientDisconnected(client) {
        Log.debug('Client "%s" disconnected, searching for active sessions...', client.id);

        // Find active sessions created by this channel
        SessionDatabase.find({
            selector: {
                clientId: client.id,
                state: 'playing'
            }
        }).then((result) => {
            Log.debug('Updating %d active session(s) for client "%s"', result.docs.length, client.id);

            // Fire "stopped" event for sessions that are still active
            result.docs.forEach((data) => {
                // Parse session
                let session = Session.fromDocument(data);

                if(IsNil(session) || IsNil(session.item)) {
                    Log.warn('Unable to parse session: %o', data);
                    return;
                }

                // Update session state
                session.state = 'ended';

                // Emit session "stopped" event
                this.process('stopped', session, client);
            });
        });
    }

    onSessionUpdated(event, payload, sender) {
        // Parse session
        let session = Session.fromPlainObject(payload);

        if(IsNil(session) || IsNil(session.item)) {
            Log.warn('Unable to parse session: %o', payload);
            return;
        }

        // Process session event
        this.process(event, session, sender);
    }

    process(event, session, sender) {
        // Track client (subscribe to "disconnect" event)
        this.onClientConnected(sender);

        // Fetch item from database
        ItemDatabase.fetch(session.item).catch(() => false).then(() => {
            // Process event
            return this.processEvent(event, session, sender);
        });
    }

    processEvent(event, session, sender) {
        // Update session (and item metadata)
        return this.update(event, session).then(({session, created, updated, previous}) => {
            if(created) {
                this.emitTo(sender.id, 'session.created', session.toPlainObject());
            } else if(updated) {
                this.emitTo(sender.id, 'session.updated', session.toPlainObject());
            }

            if(!IsNil(previous) && session.state !== previous.state) {
                Log.debug('[%s] State changed from %o to %o', session.id, previous.state, session.state);
            }

            if(!IsNil(previous) && !this._shouldEmitEvent(event, previous.state, session.state)) {
                Log.info(
                    '[%s] Ignoring duplicate %o event (previous: %o, current: %o)',
                    session.id, event, previous, session.state
                );
                return;
            }

            // Log session status
            this._log(event, session);

            // Emit event to available scrobble services
            this.services.then((services) => {
                // Find media services
                services = services[session.item.type];

                if(typeof services === 'undefined') {
                    Log.notice('No services available for media: %o', session.item.type);
                    return false;
                }

                // Emit event to matching services
                return Promise.all(services.map((service) => {
                    return service.isEnabled().then((enabled) => {
                        if(!enabled) {
                            return false;
                        }

                        // Emit event
                        service.onSessionUpdated(event, session);
                        return true;
                    });
                }));
            });
        }, (err) => {
            Log.error('Unable to update session: %s', err.message, err);
        });
    }

    update(event, session) {
        // Update item, and store session in database
        return this.updateItem(event, session.item).then(({updated}) =>
            this.upsertSession(session).then((result) => ({
                ...result,

                updated
            }))
        );
    }

    updateItem(event, item) {
        if(['created', 'started'].indexOf(event) < 0) {
            return Promise.resolve({ updated: false });
        }

        // Store item in database
        return ItemDatabase.upsertTree(item);
    }

    upsertSession(session) {
        Log.trace('Upserting session: %o', session);

        // Try update session
        return this.updateSession(session).then((result) => ({
            ...result,

            created: false
        }), (err) => {
            // Create new session
            if(err.status === 404) {
                Log.trace('Session doesn\'t exist, creating it instead', err);

                return this.createSession(session).then((result) => ({
                    ...result,

                    created: true,
                    previous: null
                }));
            }

            // Unknown error
            Log.warn('Unable to upsert session: %s', err.message, err);
            return Promise.reject(err);
        });
    }

    createSession(session) {
        Log.trace('Creating session: %o', session);

        // Create session in database
        return SessionDatabase.put({
            createdAt: Date.now(),
            ...session.toDocument(),

            updatedAt: Date.now()
        }).then((result) => ({
            session
        }));
    }

    updateSession(session) {
        Log.trace('Updating session: %o', session);

        // Update session in database
        return SessionDatabase.get(session.id).then((doc) => {
            return SessionDatabase.put({
                createdAt: Date.now(),
                ...doc,
                ...session.toDocument(),

                updatedAt: Date.now()
            }).then((result) => ({
                session,
                previous: doc
            }));
        });
    }

    // region Private methods

    _getServices() {
        return Registry.listServices(Services.Destination.Scrobble, { disabled: true }).then((services) => {
            let result = {};

            for(let i = 0; i < services.length; ++i) {
                let service = services[i];

                if(typeof service.accepts === 'undefined' || service.accepts === null) {
                    Log.warn('Service %o has an invalid value specified for the "accepts" property', service.id);
                    continue;
                }

                for(let j = 0; j < service.accepts.length; ++j) {
                    let media = service.accepts[j];

                    if(typeof result[media] === 'undefined') {
                        result[media] = [];
                    }

                    result[media].push(service);
                }
            }

            return result;
        });
    }

    _log(event, session) {
        let item = session.item;

        // Write logger message
        if(item.type === MediaTypes.Video.Movie) {
            Log.debug(
                '[%s] %s (%s) : [event: %s, state: %s, progress: %.2f]',
                session.id,

                // Movie
                item.title,
                item.year,

                // Status
                event,
                session.state,
                session.progress
            );
        } else if(item.type === MediaTypes.Video.Episode) {
            Log.debug(
                '[%s] %s (%s) - Season %2d (%s) - Episode %2d : [event: %s, state: %s, progress: %.2f]',
                session.id,

                // Show
                item.season.show.title,
                item.season.show.year,

                // Season
                item.season.number,
                item.season.year,

                // Episode
                item.number,

                // Status
                event,
                session.state,
                session.progress
            );
        } else if(item.type === MediaTypes.Music.Track) {
            Log.debug(
                '[%s] %s - %s : [event: %s, state: %s, progress: %.2f]',
                session.id,

                // Artist
                item.artist.title,

                // Track
                item.title,

                // Status
                event,
                session.state,
                session.progress
            );
        }
    }

    _shouldEmitEvent(event, previousState, currentState) {
        if(['progress', 'seeked'].indexOf(event) >= 0) {
            return true;
        }

        return previousState !== currentState;
    }

    // region endregion
}
