/* eslint-disable no-multi-spaces, key-spacing */
import Registry from 'eon.extension.framework/core/registry';
import MessagingBus, {ContextTypes} from 'eon.extension.framework/messaging/bus';
import Session from 'eon.extension.framework/models/session';
import {Track} from 'eon.extension.framework/models/item/music';
import {MediaTypes} from 'eon.extension.framework/core/enums';
import {isDefined} from 'eon.extension.framework/core/helpers';

import IsPlainObject from 'lodash-es/isPlainObject';

import ItemDatabase from 'eon.extension.core/database/item';
import SessionDatabase from 'eon.extension.core/database/session';
import Log from 'eon.extension.core/core/logger';


export class Scrobble {
    constructor() {
        // Retrieve scrobble services, group by supported media
        this.services = this._getServices();

        // Construct messaging bus
        this.bus = new MessagingBus('eon.extension.core:scrobble', {
            context: ContextTypes.Background
        });

        window.bus = this.bus;

        // Activity events
        this.bus.on('activity.created',  this.onSessionUpdated.bind(this, 'created'));
        this.bus.on('activity.started',  this.onSessionUpdated.bind(this, 'started'));
        this.bus.on('activity.seeked',   this.onSessionUpdated.bind(this, 'seeked'));
        this.bus.on('activity.progress', this.onSessionUpdated.bind(this, 'progress'));
        this.bus.on('activity.paused',   this.onSessionUpdated.bind(this, 'paused'));
        this.bus.on('activity.stopped',  this.onSessionUpdated.bind(this, 'stopped'));

        // Channel events
        this.bus.on('channel.disconnected', this.onChannelDisconnected.bind(this));
    }

    onChannelDisconnected(channelId) {
        // Ensure disconnected channel was an "activity" service
        let {plugin, service} = this._parseChannelId(channelId);

        if(!isDefined(plugin) || plugin.indexOf('eon.extension.source.') !== 0) {
            return;
        }

        if(!isDefined(service) || service !== 'activity') {
            return;
        }

        Log.debug('Activity service disconnected: %o', channelId);

        // Find active sessions created by this channel
        SessionDatabase.find({
            selector: {
                channelId: channelId,
                state: 'playing'
            }
        }).then((result) => {
            Log.debug('Found %d active sessions for channel %o', result.docs.length, channelId);

            // Fire "stopped" event for sessions that are still active
            result.docs.forEach((session) => {
                this.onSessionUpdated('stopped', session);
            });
        });
    }

    onSessionUpdated(event, data) {
        let session = Session.fromPlainObject(data);

        if(!isDefined(session) || !isDefined(session.item)) {
            Log.warn('Unable to parse session: %o', data);
            return;
        }

        // Store session in database
        this.upsertItems(session.item)
            .then((updated) => this.upsertSession(session).then((result) => ({
                ...result,
                updated
            })))
            .then(({session, created, updated, previous}) => {
                if(created) {
                    this.bus.emitTo(session.channelId, 'session.created', session.toPlainObject());
                } else if(updated) {
                    this.bus.emitTo(session.channelId, 'session.updated', session.toPlainObject());
                }

                if(isDefined(previous) && session.state !== previous.state) {
                    Log.debug('[%s] State changed from %o to %o', session.id, previous.state, session.state);
                }

                if(isDefined(previous) && !this._shouldEmitEvent(event, previous.state, session.state)) {
                    Log.info('[%s] Ignoring duplicate %o event', session.id, event);
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
            })
            .catch((err) => {
                Log.error('Unable to update session: %s', err.message, err);
            });
    }

    upsertItems(item) {
        let updated = false;

        function resolve(result) {
            if(result) {
                updated = true;
            }
        }

        if(item instanceof Track) {
            return Promise.resolve()
                .then(() => this.upsertItem(item.artist).then(resolve))
                .then(() => this.upsertItem(item.album.artist, { force: updated }).then(resolve))
                .then(() => this.upsertItem(item.album, { force: updated }).then(resolve))
                .then(() => this.upsertItem(item, { force: updated }).then(resolve))
                .then(() => updated);
        }

        return Promise.reject();
    }

    upsertItem(item, options) {
        options = options || {};
        options.force = options.force || false;

        if(!isDefined(item)) {
            return Promise.resolve(false);
        }

        // Ignore items that have already been matched
        if(isDefined(item.id) && !item.changed && !options.force) {
            return Promise.resolve(false);
        }

        Log.trace('Upserting item: %o', item);

        // Build query
        let query = {
            fields: ['_id'],
            selector: {$or: []}
        };

        function buildQuery(prefix, ids) {
            for(let key in ids) {
                if(!ids.hasOwnProperty(key)) {
                    continue;
                }

                if(IsPlainObject(ids[key])) {
                    buildQuery(prefix + '.' + key, ids[key]);
                    continue;
                }

                // Create selector
                let selector = {};

                selector[prefix + '.' + key] = {$eq: ids[key]};

                // Add selector to OR clause
                query.selector['$or'].push(selector);
            }
        }

        buildQuery('ids', item.ids);

        // Find items
        Log.trace('Finding items matching: %o', query);

        return ItemDatabase.find(query).then((result) => {
            if(result.docs.length > 0) {
                // Update item
                item.id = result.docs[0]['_id'];

                // Update item in database
                return this.updateItem(item);
            }

            return this.createItem(item);
        }, (err) => {
            // Unknown error
            Log.warn('Unable to upsert item: %s', err.message, err);
            return Promise.reject(err);
        });
    }

    createItem(item) {
        Log.trace('Creating item: %o', item);

        let document = {
            createdAt: Date.now(),
            ...item.toDocument(),

            seenAt: Date.now()
        };

        // Create item in database
        return ItemDatabase.post(document).then((result) => {
            item.id = result.id;
            item.createdAt = document.createdAt;
            item.updatedAt = document.updatedAt;
            item.seenAt = document.seenAt;

            item.changed = false;
            return true;
        });
    }

    updateItem(item) {
        Log.trace('Updating item: %o', item);

        // Update item in database
        return ItemDatabase.get(item.id).then((doc) => {
            let document = {
                createdAt: Date.now(),
                ...doc,
                ...item.toDocument(),

                updatedAt: Date.now(),
                seenAt: Date.now()
            };

            return ItemDatabase.put(document).then(() => {
                item.createdAt = document.createdAt;
                item.updatedAt = document.updatedAt;
                item.seenAt = document.seenAt;

                item.changed = false;
                return true;
            });
        });
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
        return Registry.listServices('destination/scrobble', { disabled: true }).then((services) => {
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
        if(item.type === MediaTypes.Movie) {
            Log.debug(
                '[%s] %o (%o) : [event: %o, state: %o, progress: %o]',
                session.id,

                // Name
                item.title,
                item.year,

                // Status
                event,
                session.state,
                session.progress
            );
        } else if(item.type === MediaTypes.Television.Episode) {
            Log.debug(
                '[%s] %o - Season %d (%o) - Episode %d : [event: %o, state: %o, progress: %o]',
                session.id,

                // Name
                item.show.title,
                item.season.number,
                item.season.year,
                item.number,

                // Status
                event,
                session.state,
                session.progress
            );
        } else if(item.type === MediaTypes.Music.Track) {
            Log.debug(
                '[%s] %o - %o : [event: %o, state: %o, progress: %o]',
                session.id,

                // Name
                item.artist.title,
                item.title,

                // Status
                event,
                session.state,
                session.progress
            );
        }
    }

    _parseChannelId(channelId) {
        let parts = channelId.split(':');

        if(parts.length !== 3) {
            return {};
        }

        return {
            plugin: parts[0],
            service: parts[1],
            key: parts[2]
        };
    }

    _shouldEmitEvent(event, previousState, currentState) {
        if(event === 'progress') {
            return true;
        }

        return previousState !== currentState;
    }

    // region endregion
}

export default new Scrobble();
