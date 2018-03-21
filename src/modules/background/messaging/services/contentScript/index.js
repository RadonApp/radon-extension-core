import Plugin from 'neon-extension-core/core/plugin';

import BaseService from '../core/base';
import BasicContentScript from './basic';
import DeclarativeContentScript from './declarative';


export class ContentScriptService extends BaseService {
    constructor() {
        super(Plugin, 'contentScript');

        // Bind to events
        this.requests.on('isRegistered', this.isRegistered.bind(this));
        this.requests.on('register', this.register.bind(this));
        this.requests.on('unregister', this.unregister.bind(this));
    }

    // region Public Methods

    isRegistered(payload, resolve, reject) {
        Promise.resolve().then(() =>
            this._call('isRegistered', payload.pluginId, payload.contentScripts)
        ).then(
            resolve,
            reject
        );
    }

    register(payload, resolve, reject) {
        Promise.resolve().then(() =>
            this._call('register', payload.pluginId, payload.contentScripts)
        ).then(
            resolve,
            reject
        );
    }

    unregister(payload, resolve, reject) {
        Promise.resolve().then(() =>
            this._call('unregister', payload.pluginId, payload.contentScripts)
        ).then(
            resolve,
            reject
        );
    }

    // endregion

    // region Private Methods

    _call(name, ...args) {
        if(DeclarativeContentScript.supported) {
            return DeclarativeContentScript[name](...args);
        }

        if(BasicContentScript.supported) {
            return BasicContentScript[name](...args);
        }

        throw new Error('Dynamic content scripts are not supported');
    }

    // endregion
}

export default new ContentScriptService();
