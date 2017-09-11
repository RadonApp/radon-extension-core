import MessageBroker from '../../broker';


export default class BaseService {
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
}
