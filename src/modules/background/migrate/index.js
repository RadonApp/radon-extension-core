import ForEach from 'lodash-es/forEach';

import Log from 'neon-extension-framework/core/logger';
import Messaging from 'neon-extension-browser/messaging';
import Registry from 'neon-extension-framework/core/registry';
import {isDefined} from 'neon-extension-framework/core/helpers';

import Plugin from '../../../core/plugin';


export class Migrate {
    constructor() {
        // Migrate preference/storage keys
        this.migrateKeys();

        // Request legacy preferences
        Messaging.sendMessage({type: 'migrate/preferences'}, (preferences) => this.onPreferences(preferences));
    }

    migrateKeys() {
        let keys = Object.keys(localStorage);

        ForEach(keys, (key) => {
            try {
                // Migrate preference/storage key
                if(key.startsWith('preferences:eon.extension')) {
                    this.migratePreferenceKey(key, localStorage[key]);
                } else if(key.startsWith('eon.extension')) {
                    this.migrateStorageKey(key, localStorage[key]);
                } else {
                    return;
                }
            } catch(err) {
                Log.warn('Unable to migrate "%s" key: %s', key, err.message, err);
                return;
            }

            // Remove key
            delete localStorage[key];
        });
    }

    migratePreferenceKey(key, value) {
        let targetKey = this.transformKey(key, 1);

        // Ensure target key hasn't already been defined
        if(isDefined(localStorage[targetKey])) {
            Log.debug('Preference "%s" has already been defined', targetKey);
            return;
        }

        // Store value
        localStorage[targetKey] = value;
    }

    migrateStorageKey(key, value) {
        let targetKey = this.transformKey(key, 0);

        // Ensure target key hasn't already been defined
        if(isDefined(localStorage[targetKey])) {
            Log.debug('Value "%s" has already been defined', targetKey);
            return;
        }

        // Store value
        localStorage[targetKey] = value;
    }

    transformKey(key, position) {
        let parts = key.split(':');

        // Ensure context matches old format
        if(!parts[position].startsWith('eon.extension')) {
            throw new Error('Invalid context: ' + parts[position]);
        }

        // Transform context
        parts[position] = this.transformContextName(parts[position]);

        // Combine parts
        return parts.join(':');
    }

    transformContextName(name) {
        let parts = name.split('.');

        // Ensure context matches old format
        if(parts[0] !== 'eon' || parts[1] !== 'extension') {
            throw new Error('Invalid context: ' + name);
        }

        // Update name
        parts[0] = 'neon';

        // Combine parts
        return parts.join('-');
    }

    onPreferences(preferences) {
        if(!isDefined(preferences)) {
            return;
        }

        Plugin.storage.getBoolean('migrate:preferences').then((migrated) => {
            if(migrated) {
                Log.debug('Preferences have already been migrated');
                return;
            }

            Log.info('Migrating preferences...');

            // Mark preferences as migrated
            Plugin.storage.putBoolean('migrate:preferences', true)
                // Trigger migration services
                .then(Registry.listServices('migrate', { disabled: true }).then((services) => {
                    for(let i = 0; i < services.length; ++i) {
                        services[i].onPreferences(preferences);
                    }
                }));
        });
    }
}

export default new Migrate();
