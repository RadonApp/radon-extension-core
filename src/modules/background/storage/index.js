import {default as _Storage} from 'eon.extension.browser/storage';
import MessagingBus, {ContextTypes} from 'eon.extension.framework/messaging/bus';


export class Storage {
    constructor() {
        // Construct messaging bus
        this.bus = new MessagingBus('eon.extension.core:storage', {
            context: ContextTypes.Background
        });

        // Bind to requests
        this.bus.on('request:storage.get', this.get.bind(this));
    }

    get(key, callback) {
        console.debug('Requesting item %o from storage...', key);

        _Storage.get(key).then((value) => {
            console.debug('Got value: %o', value);

            callback({
                success: true,
                value: value
            });
        }, (err) => {
            console.warn('Unable to retrieve storage entry %o:', key, err.stack);

            callback({
                success: false
            });
        })
    }
}

export default new Storage();
