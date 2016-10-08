import MessagingBus, {ContextTypes} from 'eon.extension.framework/messaging/bus';


export class Relay {
    constructor() {
        // Construct messaging bus
        this.bus = new MessagingBus('eon.extension.core:relay', {
            context: ContextTypes.Background
        });
    }
}

export default new Relay();
