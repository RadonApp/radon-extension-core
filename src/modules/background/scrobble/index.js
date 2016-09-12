import Bus from 'eon.extension.framework/core/bus';


export class Scrobble {
    constructor() {
        // Configure event bus
        Bus.configure('background/scrobble');

        // Events
        Bus.on('activity.progress', this.onProgress)
    }

    onProgress(session) {
        console.log('onProgress', session);
    }
}

export default new Scrobble();
