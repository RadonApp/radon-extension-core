import MessageBroker from '../Broker';


export default class Service {
    constructor(plugin, name) {
        this.plugin = plugin;
        this.name = name;

        // Retrieve broker service
        this.service = MessageBroker.service(this.plugin.id, this.name);
    }

    get requests() {
        return this.service.requests;
    }

    emit(name, payload, options) {
        return this.service.emit(name, payload, options);
    }

    emitTo(clientId, name, payload, options) {
        return this.service.emitTo(clientId, name, payload, options);
    }

    on(name, callback) {
        return this.service.on(name, callback);
    }
}
