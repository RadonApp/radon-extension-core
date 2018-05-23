import ContentScripts from 'wes/contentScripts';
import ForEach from 'lodash-es/forEach';
import IsEqual from 'lodash-es/isEqual';
import IsNil from 'lodash-es/isNil';
import Map from 'lodash-es/map';
import Merge from 'lodash-es/merge';

import Log from 'neon-extension-core/Core/Logger';


export class BasicContentScript {
    constructor() {
        this._registered = {};
    }

    get supported() {
        return ContentScripts.$exists();
    }

    // region Public Methods

    isRegistered(pluginId, contentScripts) {
        let {ids, itemsById} = this._parseContentScripts(pluginId, contentScripts);

        for(let i = 0; i < ids.length; i++) {
            let id = ids[i];

            if(IsNil(this._registered[id])) {
                return false;
            }

            if(!this._matches(itemsById[id], this._registered[id].state)) {
                return false;
            }
        }

        return true;
    }

    register(pluginId, contentScripts) {
        let {itemsById} = this._parseContentScripts(pluginId, contentScripts);

        // Register content scripts
        ForEach(itemsById, (state, id) => {
            // Unregister existing content script
            if(!IsNil(this._registered[id])) {
                try {
                    this._registered[id].instance.unregister();
                } catch(e) {
                    Log.warn(`Unable to unregister existing "${id}" content script`, e);
                }
            }

            // Register content script
            ContentScripts.register(state).then((instance) => {
                // Store instance (for later un-registration)
                this._registered[id] = { instance, state };
            }, (err) => {
                Log.warn(`Unable to register "${id}" content script`, err);
            });
        });
    }

    unregister(pluginId, contentScripts) {
        let {itemsById} = this._parseContentScripts(pluginId, contentScripts);

        // Register content scripts
        ForEach(itemsById, (state, id) => {
            if(IsNil(this._registered[id])) {
                return;
            }

            Log.debug('Un-registering content script:', this._registered[id]);

            try {
                // Unregister content script
                this._registered[id].instance.unregister();

                // Clear state
                delete this._registered[id];
            } catch(e) {
                Log.warn(`Unable to unregister "${id}" content script`, e);
            }
        });
    }

    // endregion

    // region Private Methods

    _parseContentScripts(pluginId, contentScripts) {
        let itemsById = {};

        // Create declarative rules from content scripts
        ForEach(contentScripts, (script) => {
            script = Merge({
                id: null,
                conditions: [],
                css: [],
                js: []
            }, script);

            if(script.id === null) {
                Log.warn('Ignoring invalid content script: %O (invalid/missing "id" property)', script);
                return;
            }

            // Add prefix to identifier
            script.id = pluginId + '/' + script.id;

            // Add rule identifier
            if(!IsNil(itemsById[script.id])) {
                Log.warn('Content script with identifier %o has already been defined', script.id);
                return;
            }

            // Create rule
            itemsById[script.id] = {
                matches: script.matches,

                css: Map(script.css, (file) => ({ file })),
                js: Map(script.js, (file) => ({ file }))
            };
        });

        return {
            ids: Object.keys(itemsById),

            items: Object.values(itemsById),
            itemsById: itemsById
        };
    }

    _matches(a, b) {
        if(IsNil(a) && IsNil(b)) {
            return true;
        }

        if(IsNil(a) || IsNil(b)) {
            return false;
        }

        return IsEqual(a, b);
    }

    // endregion
}

export default new BasicContentScript();
