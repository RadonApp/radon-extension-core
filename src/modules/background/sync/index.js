import Bus from 'eon.extension.framework/core/bus';


export class Sync {
    constructor() {
        // Configure event bus
        Bus.configure('background/sync');
    }
}

export default new Sync();
