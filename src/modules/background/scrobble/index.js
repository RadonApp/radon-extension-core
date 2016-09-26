import {MediaTypes} from 'eon.extension.framework/core/enums';
import Bus from 'eon.extension.framework/core/bus';
import Registry from 'eon.extension.framework/core/registry';


export class Scrobble {
    constructor() {
        // Retrieve scrobble services, group by supported media
        this.services = this._getServices();

        // Configure event bus
        Bus.configure('background/scrobble');

        // Events
        Bus.on('activity.created', (session) => this.onSessionUpdated('created', session));
        Bus.on('activity.started', (session) => this.onSessionUpdated('started', session));
        Bus.on('activity.progress', (session) => this.onSessionUpdated('progress', session));
        Bus.on('activity.paused', (session) => this.onSessionUpdated('paused', session));
        Bus.on('activity.ended', (session) => this.onSessionUpdated('ended', session));
    }

    onSessionUpdated(event, session) {
        var item = session.item;

        // Retrieve source key
        var sourceKey = item.source.id.substring(item.source.id.lastIndexOf('.') + 1);

        // Log session status
        if(item.type.media === MediaTypes.Video.Movie) {
            console.log(
                '%o (%d) (%s: %o) : [event: %o, state: %o, progress: %o]',
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
            console.log(
                '%o - Season %d (%d) - Episode %d (%s: %o) : [event: %o, state: %o, progress: %o]',
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
            console.log(
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
        var services = this.services[item.type.media];

        if(typeof services === 'undefined') {
            console.log('No services available for media: %o', item.type.media);
            return;
        }

        for(var i = 0; i < services.length; ++i) {
            var service = services[i];

            if(!service.plugin.enabled) {
                console.log('Plugin %o is disabled', service.plugin.id);
                continue;
            }

            if(!service.enabled) {
                console.log('Service %o is disabled', service.id);
                continue;
            }

            service.onSessionUpdated(event, session);
        }
    }

    // region Private methods

    _getServices() {
        var result = {};

        // Iterate over scrobble services
        var services = Registry.listServices('destination/scrobble', {
            disabled: true
        });

        for(var i = 0; i < services.length; ++i) {
            var service = services[i];

            if(typeof service.accepts === 'undefined' || service.accepts === null) {
                console.warn('Service %o has an invalid value specified for the "accepts" property', service.id);
                continue;
            }

            for(var j = 0; j < service.accepts.length; ++j) {
                var media = service.accepts[j];

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
