export default class BrokerEmitter {
    constructor(emitter, name, options) {
        this.emitter = emitter;
        this.name = name;

        // Parse options
        options = options || {};

        this.prefix = options.prefix || '/';
    }

    on(type, callback) {
        return this.emitter.on(this.name + this.prefix + type, callback);
    }

    once(type, callback) {
        return this.emitter.once(this.name + this.prefix + type, callback);
    }
}
