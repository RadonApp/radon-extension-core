import {default as _Storage} from 'eon.extension.browser/storage';
import MessagingBus, {ContextTypes} from 'eon.extension.framework/messaging/bus';

import Log from '../../../core/logger';


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
        _Storage.get(key).then((value) => {
            callback({
                success: true,
                value: value
            });
        }, (err) => {
            Log.warn('Unable to retrieve storage entry %o:', key, err.stack);

            callback({
                success: false
            });
        });
    }
}

export default new Storage();
