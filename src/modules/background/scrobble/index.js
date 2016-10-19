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
        this.bus.on('activity.progress', (session) => this.onSessionUpdated('progress', session));
        this.bus.on('activity.paused', (session) => this.onSessionUpdated('paused', session));
        this.bus.on('activity.ended', (session) => this.onSessionUpdated('ended', session));
    }

    onSessionUpdated(event, session) {
        let item = session.item;

        // Retrieve source key
        let sourceKey = item.source.id.substring(item.source.id.lastIndexOf('.') + 1);

        // Log session status
        if(item.type.media === MediaTypes.Video.Movie) {
            Log.debug(
                '%o (%o) (%s: %o) : [event: %o, state: %o, progress: %o]',
                item.title,
                item.year,

                // Identifier
                sourceKey,
                item.id,

                // Status
                event,
                session.state,
                Math.round(session.progress * 100)
            );
        } else if(item.type.media === MediaTypes.Video.Episode) {
            Log.debug(
                '%o - Season %d (%o) - Episode %d (%s: %o) : [event: %o, state: %o, progress: %o]',
                item.show.title,
                item.season.number,
                item.season.year,
                item.number,

                // Identifier
                sourceKey,
                item.id,

                // Status
                event,
                session.state,
                Math.round(session.progress * 100)
            );
        } else if(item.type.media === MediaTypes.Music.Track) {
            Log.debug(
                '%o - %o (%s: %o) : [event: %o, state: %o, progress: %o]',
                // Name
                item.artist.title,
                item.title,

                // Identifier
                sourceKey,
                item.id,

                // Status
                event,
                session.state,
                Math.round(session.progress * 100)
            );
        }

        // Emit event to services
        let services = this.services[item.type.media];

        if(typeof services === 'undefined') {
            Log.notice('No services available for media: %o', item.type.media);
            return;
        }

        for(let i = 0; i < services.length; ++i) {
            let service = services[i];

            if(!service.plugin.enabled) {
                Log.debug('Plugin %o is disabled', service.plugin.id);
                continue;
            }

            if(!service.enabled) {
                Log.debug('Service %o is disabled', service.id);
                continue;
            }

            service.onSessionUpdated(event, session);
        }
    }

    // region Private methods

    _getServices() {
        let result = {};

        // Iterate over scrobble services
        let services = Registry.listServices('destination/scrobble', {
            disabled: true
        });

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
    }

    // region endregion
}

export default new Scrobble();
