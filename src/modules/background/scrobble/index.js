import {MediaTypes} from 'eon.extension.framework/core/enums';
import Registry from 'eon.extension.framework/core/registry';
import MessagingBus, {ContextTypes} from 'eon.extension.framework/messaging/bus';

import Log from '../../../core/logger';


export class Scrobble {
    constructor() {
        // Retrieve scrobble services, group by supported media
        this.services = this._getServices();

        // Construct messaging bus
        this.bus = new MessagingBus('eon.extension.core:scrobble', {
            context: ContextTypes.Background
        });

        window.bus = this.bus;

        // Events
        this.bus.on('activity.created', (session) => this.onSessionUpdated('created', session));
        this.bus.on('activity.started', (session) => this.onSessionUpdated('started', session));
        this.bus.on('activity.seeked', (session) => this.onSessionUpdated('seeked', session));
        this.bus.on('activity.progress', (session) => this.onSessionUpdated('progress', session));
        this.bus.on('activity.paused', (session) => this.onSessionUpdated('paused', session));
        this.bus.on('activity.stopped', (session) => this.onSessionUpdated('stopped', session));
    }

    onSessionUpdated(event, session) {
        let metadata = session.metadata;

        // Retrieve source key
        let sourceKey = metadata.source.id.substring(metadata.source.id.lastIndexOf('.') + 1);

        // Log session status
        if(metadata.type.media === MediaTypes.Video.Movie) {
            Log.debug(
                '%o (%o) (%s: %o) : [event: %o, state: %o, progress: %o]',
                metadata.title,
                metadata.year,

                // Identifier
                sourceKey,
                metadata.id,

                // Status
                event,
                session.state,
                session.progress
            );
        } else if(metadata.type.media === MediaTypes.Video.Episode) {
            Log.debug(
                '%o - Season %d (%o) - Episode %d (%s: %o) : [event: %o, state: %o, progress: %o]',
                metadata.show.title,
                metadata.season.number,
                metadata.season.year,
                metadata.number,

                // Identifier
                sourceKey,
                metadata.id,

                // Status
                event,
                session.state,
                session.progress
            );
        } else if(metadata.type.media === MediaTypes.Music.Track) {
            Log.debug(
                '%o - %o (%s: %o) : [event: %o, state: %o, progress: %o]',
                // Name
                metadata.artist.title,
                metadata.title,

                // Identifier
                sourceKey,
                metadata.id,

                // Status
                event,
                session.state,
                session.progress
            );
        }

        // Retrieve current services
        this.services.then((services) => {
            // Find media services
            services = services[metadata.type.media];

            if(typeof services === 'undefined') {
                Log.notice('No services available for media: %o', metadata.type.media);
                return;
            }

            // Emit event to matching services
            for(let i = 0; i < services.length; ++i) {
                let service = services[i];

                service.onSessionUpdated(event, session);
            }
        });
    }

    // region Private methods

    _getServices() {
        return Registry.listServices('destination/scrobble').then((services) => {
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

    // region endregion
}

export default new Scrobble();
