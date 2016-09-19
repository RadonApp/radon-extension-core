import Bus from 'eon.extension.framework/core/bus';


export class Scrobble {
    constructor() {
        // Configure event bus
        Bus.configure('background/scrobble');

        // Events
        Bus.on('activity.created', (session) => this._onActivityUpdate('created', session));
        Bus.on('activity.started', (session) => this._onActivityUpdate('started', session));
        Bus.on('activity.progress', (session) => this._onActivityUpdate('progress', session));
        Bus.on('activity.paused', (session) => this._onActivityUpdate('paused', session));
        Bus.on('activity.ended', (session) => this._onActivityUpdate('ended', session));
    }

    _onActivityUpdate(event, session) {
        var item = session.item;

        // Retrieve source key
        var sourceKey = item.source.id.substring(item.source.id.lastIndexOf('.') + 1);

        // Log session status
        if(item.type === 'movie') {
            console.debug(
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
        } else if(item.type === 'episode') {
            console.debug(
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
        } else if(item.type === 'track') {
            console.debug(
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
    }
}

export default new Scrobble();
