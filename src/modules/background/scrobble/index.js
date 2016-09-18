import Bus from 'eon.extension.framework/core/bus';


export class Scrobble {
    constructor() {
        // Configure event bus
        Bus.configure('background/scrobble');

        // Events
        Bus.on('activity.progress', this.onProgress)
    }

    onProgress(session) {
        var item = session.item;

        // Retrieve source key
        var sourceKey = item.source.id.substring(item.source.id.lastIndexOf('.') + 1);

        // Log status message
        if(item.type === 'movie') {
            console.log('[' + sourceKey + ': ' + item.id + '] ' + item.title + ' (' + item.year + ') [progress: ' + Math.round(session.progress * 100) + ']');
        } else if(item.type === 'episode') {
            console.log('[' + sourceKey + ': ' + item.id + '] ' + item.show.title + ' ' + item.season.number + 'x' + item.number + ' [progress: ' + Math.round(session.progress * 100) + ']');
        } else if(item.type === 'track') {
            console.log('[' + sourceKey + ': ' + item.id + '] ' + item.title + ' - ' + item.artist.title + ' [progress: ' + Math.round(session.progress * 100) + ']');
        }
    }
}

export default new Scrobble();
