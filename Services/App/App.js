import Debounce from 'lodash-es/debounce';
import IsString from 'lodash-es/isString';
import Runtime from 'wes/runtime';
import Tabs from 'wes/tabs';

import Log from '@radon-extension/framework/Core/Logger';
import Registry from '@radon-extension/framework/Core/Registry';


export default class AppService {
    constructor() {
        this.updatePlugins = Debounce(this._updatePlugins.bind(this), 1000);

        // Bind to extension events
        if(Runtime.$exists() && Runtime.$has('onInstalled')) {
            Runtime.onInstalled.addListener(this._onInstalled.bind(this));
        }

        // Update plugin registration
        this.updatePlugins();
    }

    _onInstalled({reason, previousVersion}) {
        Log.info('Extension installed (reason: %o, previousVersion: %o)', reason, previousVersion);

        // Display configuration page on installation
        if(this._shouldDisplayConfigurationPage(reason, previousVersion)) {
            Tabs.create({ url: Runtime.getURL('Application.html#/configuration') });
        }

        // Update plugin registration
        this.updatePlugins();
    }

    _shouldDisplayConfigurationPage(reason, previousVersion) {
        if(reason === 'install') {
            return true;
        }

        // Update from legacy extension
        if(reason === 'update' && IsString(previousVersion) && previousVersion.indexOf('0.') === 0) {
            return true;
        }

        return false;
    }

    _updatePlugins() {
        return Registry.listPlugins({ disabled: true }).then((plugins) => {
            Log.debug('Updating %d plugins: %o', plugins.length, plugins);

            return Promise.all(plugins.map((plugin) =>
                this._updatePlugin(plugin).catch((err) => {
                    if(IsString(err)) {
                        Log.info(err);
                    } else {
                        Log.warn('Unable to update plugin %o:', plugin.id, err.stack);
                    }

                    return false;
                })
            ));
        });
    }

    _updatePlugin(plugin) {
        Log.debug('Updating plugin %o...', plugin.id);

        // Check plugin has been enabled
        return plugin.isEnabled()
            .then((enabled) => {
                if(!enabled) {
                    return Promise.reject('Plugin "' + plugin.id + '" hasn\'t been enabled');
                }

                return true;
            })
            // Ensure permissions have been granted
            .then(() => plugin.isPermissionsGranted().then((granted) => {
                if(!granted) {
                    return Promise.reject('Permissions for plugin "' + plugin.id + '" haven\'t been granted');
                }

                return true;
            }, (err) => {
                Log.error(`Unable to check permissions have been granted for the "${plugin.id}" plugin`, err);
            }))
            // Remove existing content scripts
            .then(() => plugin.removeContentScripts().catch((err) => {
                Log.error(`Unable to remove existing content scripts for the "${plugin.id}" plugin`, err);
            }))
            // Register content scripts
            .then(() => plugin.registerContentScripts().catch((err) => {
                Log.error(`Unable to register content scripts for the "${plugin.id}" plugin`, err);
            }));
    }
}
