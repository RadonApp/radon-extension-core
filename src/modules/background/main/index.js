import Extension from 'neon-extension-browser/extension';
import Log from 'neon-extension-framework/core/logger';
import Registry from 'neon-extension-framework/core/registry';
import {isString} from 'neon-extension-framework/core/helpers';


export class Main {
    constructor() {
        // Bind to extension events
        Extension.on('installed', this._onInstalled.bind(this));

        // Update plugin registration
        this._updatePlugins();
    }

    _onInstalled(details) {
        Log.info('Extension installed, details: %o', details);

        // Update plugin registration
        this._updatePlugins();
    }

    _updatePlugins() {
        return Registry.listPlugins({ disabled: true }).then((plugins) => {
            Log.debug('Updating %d plugins: %o', plugins.length, plugins);

            return Promise.all(plugins.map((plugin) =>
                this._updatePlugin(plugin).catch((err) => {
                    if(isString(err)) {
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
            // Check permissions have been granted
            .then(() => plugin.isPermissionsGranted().then((granted) => {
                if(!granted) {
                    return Promise.reject('Permissions for plugin "' + plugin.id + '" haven\'t been granted');
                }

                return true;
            }))
            // Ensure content scripts are registered
            .then(() => plugin.isContentScriptsRegistered().then((registered) => {
                if(registered) {
                    return true;
                }

                // Register plugin content scripts
                return plugin.registerContentScripts().then(() => {
                    return true;
                });
            }));
    }
}

export default new Main();
