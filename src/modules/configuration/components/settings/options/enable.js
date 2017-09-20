import React from 'react';

import Log from 'eon.extension.core/core/logger';
import Preferences from 'eon.extension.framework/preferences';
import {OptionComponent} from 'eon.extension.framework/services/configuration/components';
import {isString} from 'eon.extension.framework/core/helpers';


export default class EnableComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            enabled: false
        };

        this._currentRefreshId = 0;
    }

    componentWillMount() {
        this.refresh(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.refresh(nextProps);
    }

    componentWillUnmount() {
        this._currentRefreshId++;
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextProps.id !== this.state.id) {
            return true;
        }

        if(nextState.enabled !== this.state.enabled) {
            return true;
        }

        return false;
    }

    refresh(props) {
        let id = ++this._currentRefreshId;

        // Check plugin enabled state
        this.isEnabled(props).then((enabled) => {
            if(this._currentRefreshId !== id) {
                return;
            }

            this.setState({id: props.id, enabled: enabled});
        });
    }

    onChanged(event) {
        let enabled = event.target.checked;

        // Process state change event
        return this.updatePermissions(this.props, enabled)
            .then(() => this.updateContentScripts(this.props, enabled))
            .then(() => this.updatePreference(this.props, enabled))
            .then(() => {
                if(this.props.onChange === null) {
                    return;
                }

                // Trigger callback
                this.props.onChange(enabled);
            })
            .catch((error) => {
                Log.warn('Unable to update permissions: %o', error);
            });
    }

    // region Check state

    isEnabled(props) {
        // Retrieve current plugin enabled state
        return Preferences.getBoolean(props.id)
            .then((enabled) => {
                if(!enabled) {
                    if(props.options.type === 'plugin') {
                        return Promise.reject('Plugin "' + props.plugin.id + '" hasn\'t been enabled');
                    }

                    return Promise.reject('Option "' + props.id + '" hasn\'t been enabled');
                }

                return true;
            })
            .then(() => this.isPermissionsGranted(props))
            .then(() => this.isContentScriptsRegistered(props))
            .catch((err) => {
                if(isString(err)) {
                    Log.info(err);
                } else {
                    Log.warn('Unable to check enabled state, error:', err.stack);
                }
                return false;
            });
    }

    isPermissionsGranted(props) {
        if(!props.options.permissions) {
            return Promise.resolve(true);
        }

        return props.plugin.isPermissionsGranted().then((granted) => {
            if(!granted) {
                return Promise.reject(
                    'Permissions for ' + props.options.type + ' "' + props.plugin.id + '" haven\'t been granted'
                );
            }

            return true;
        });
    }

    isContentScriptsRegistered(props) {
        if(!props.options.contentScripts) {
            return Promise.resolve(true);
        }

        return props.plugin.isContentScriptsRegistered().then((registered) => {
            if(!registered) {
                return Promise.reject(
                    'Content scripts for ' + props.options.type + ' "' + props.plugin.id + '" haven\'t been registered'
                );
            }

            return true;
        });
    }

    // endregion

    // region Update state

    updatePreference(props, enabled) {
        // Update preference
        return Preferences.putBoolean(props.id, enabled)
            .then(() => {
                // Update component
                this.setState({enabled: enabled});
            });
    }

    updatePermissions(props, enabled) {
        if(!props.options.permissions) {
            return Promise.resolve();
        }

        // Update permissions state
        if(enabled) {
            return this.props.plugin.requestPermissions();
        }

        return this.props.plugin.removePermissions();
    }

    updateContentScripts(props, enabled) {
        if(!props.options.contentScripts) {
            return Promise.resolve();
        }

        // Update content scripts state
        if(enabled) {
            return this.props.plugin.registerContentScripts();
        }

        return this.props.plugin.removeContentScripts();
    }

    // endregion

    render() {
        return (
            <div data-component="eon.extension.core:settings.options.enable" className="switch tiny">
                <input
                    className="switch-input"
                    id={this.props.id}
                    type="checkbox"
                    checked={this.state.enabled}
                    onChange={this.onChanged.bind(this)}
                />

                <label className="switch-paddle" htmlFor={this.props.id}>
                    {this.props.options.summary && <span className="show-for-sr">
                        {this.props.options.summary}
                    </span>}
                </label>
            </div>
        );
    }
}

EnableComponent.defaultProps = {
    id: null,
    label: null,
    plugin: null,

    options: {
        summary: null,

        type: 'option',
        permissions: false,
        contentScripts: false
    },

    onChange: null
};
