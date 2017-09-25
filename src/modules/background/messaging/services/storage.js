/* eslint-disable no-multi-spaces, key-spacing */
import Plugin from 'neon-extension-core/core/plugin';
import Storage from 'neon-extension-browser/storage';

import BaseService from './core/base';


export class StorageService extends BaseService {
    constructor() {
        super(Plugin, 'storage');

        // Get
        this.requests.on('get',         this.get.bind(this, 'get'));
        this.requests.on('getBoolean',  this.get.bind(this, 'getBoolean'));
        this.requests.on('getObject',   this.get.bind(this, 'getObject'));
        this.requests.on('getString',   this.get.bind(this, 'getString'));

        // Put
        this.requests.on('put',         this.put.bind(this, 'put'));
        this.requests.on('putBoolean',  this.put.bind(this, 'putBoolean'));
        this.requests.on('putObject',   this.put.bind(this, 'putObject'));
        this.requests.on('putString',   this.put.bind(this, 'putString'));
    }

    get(name, params, resolve, reject) {
        return Storage[name](params.key).then(resolve, reject);
    }

    put(name, params, resolve, reject) {
        return Storage[name](params.key, params.value)
            .then(() => this.emit('change', {
                key: params.key,
                value: params.value
            }))
            .then(() => this.emit('change#' + params.key, {
                key: params.key,
                value: params.value
            }))
            .then(resolve, reject);
    }
}

export default new StorageService();
