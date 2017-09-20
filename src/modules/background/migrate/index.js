import Log from 'eon.extension.framework/core/logger';
import Messaging from 'eon.extension.browser/messaging';
import Registry from 'eon.extension.framework/core/registry';
import {isDefined} from 'eon.extension.framework/core/helpers';

import Plugin from '../../../core/plugin';


export class Migrate {
    constructor() {
        // Request legacy preferences
        Messaging.sendMessage({type: 'migrate/preferences'}, (preferences) => this.onPreferences(preferences));
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
