import MessagingBus, {ContextTypes} from 'eon.extension.framework/messaging/bus';


export class Sync {
    constructor() {
        // Construct messaging bus
        this.bus = new MessagingBus('eon.extension.core:sync', {
            context: ContextTypes.Background
        });
    }
}

export default new Sync();
