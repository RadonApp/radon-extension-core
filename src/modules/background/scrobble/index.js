/* eslint-disable no-multi-spaces, key-spacing */
import Registry from 'eon.extension.framework/core/registry';
import MessagingBus, {ContextTypes} from 'eon.extension.framework/messaging/bus';
import Parser from 'eon.extension.framework/models/core/parser';
import {SessionState} from 'eon.extension.framework/models/session';
import {MediaTypes} from 'eon.extension.framework/core/enums';
import {isDefined} from 'eon.extension.framework/core/helpers';

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
                // Update state
                session.state = SessionState.ended;

                // Fire event
                this.onSessionUpdated('stopped', session);
            });
        });
    }

    onSessionUpdated(event, data) {
        // Parse session from `data` object
        let session = Parser.parse(data);

        if(!isDefined(session)) {
            Log.warn('Unable to parse session: %o', data);
            return;
        }

        // Retrieve session metadata
        let metadata = session.metadata;

        // Store session in database
        this.updateSession(data).then((previousState) => {
            if(isDefined(previousState) && session.state !== previousState) {
                Log.info('[%s] State changed from %o to %o', session.id, previousState, session.state);
            }

            if(!this._shouldEmitEvent(event, previousState, session.state)) {
                Log.info('[%s] Ignoring duplicate %o event', session.id, event);
                return;
            }

            // Log session status
            this._log(event, session, metadata);

            // Emit event to available scrobble services
            this.services.then((services) => {
                // Find media services
                services = services[metadata.type.media];

                if(typeof services === 'undefined') {
                    Log.notice('No services available for media: %o', metadata.type.media);
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
        });
    }

    updateSession(session) {
        // Try retrieve existing session
        return SessionDatabase.get(session._id).then((doc) => {
            let previousState = doc.state;

            // Use existing session "_rev"
            session._rev = doc._rev;

            // Update existing session
            return SessionDatabase.put(session).then(() =>
                previousState
            );
        }, (err) => {
            // Create new session
            if(err.status === 404) {
                return SessionDatabase.put(session).then(() =>
                    null
                );
            }

            // Unknown error
            return Promise.reject(err);
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

    _log(event, session, metadata) {
        // Write logger message
        if(metadata.type.media === MediaTypes.Video.Movie) {
            Log.debug(
                '[%s] %o (%o) : [event: %o, state: %o, progress: %o] %O',
                session.id,

                // Name
                metadata.title,
                metadata.year,

                // Status
                event,
                session.state,
                session.progress,

                session
            );
        } else if(metadata.type.media === MediaTypes.Video.Episode) {
            Log.debug(
                '[%s] %o - Season %d (%o) - Episode %d : [event: %o, state: %o, progress: %o] %O',
                session.id,

                // Name
                metadata.show.title,
                metadata.season.number,
                metadata.season.year,
                metadata.number,

                // Status
                event,
                session.state,
                session.progress,

                session
            );
        } else if(metadata.type.media === MediaTypes.Music.Track) {
            Log.debug(
                '[%s] %o - %o : [event: %o, state: %o, progress: %o] %O',
                session.id,

                // Name
                metadata.artist.title,
                metadata.title,

                // Status
                event,
                session.state,
                session.progress,

                session
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
