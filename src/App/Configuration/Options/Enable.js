import IsNil from 'lodash-es/isNil';
import React from 'react';

import Log from 'neon-extension-core/core/logger';
import {OptionComponent} from 'neon-extension-framework/services/configuration/components';
import {isString} from 'neon-extension-framework/core/helpers';


export default class EnableOptionComponent extends OptionComponent {
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
        if(!IsNil(nextProps.item) && nextProps.item.id !== this.state.id) {
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

            this.setState({
                id: props.item.id,

                enabled: enabled
            });
        });
    }

    onChanged(event) {
        let enabled = event.target.checked;

        // Process state change event
        return this.updatePermissions(enabled)
            .then(() => this.updateContentScripts(enabled))
            .then(() => this.updatePreference(enabled))
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
        return props.item.preferences.getBoolean(props.item.name)
            .then((enabled) => {
                if(!enabled) {
                    if(props.item.options.type === 'plugin') {
                        return Promise.reject('Plugin "' + props.item.plugin.id + '" hasn\'t been enabled');
                    }

                    return Promise.reject('Option "' + props.item.id + '" hasn\'t been enabled');
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
        if(!props.item.options.permissions) {
            return Promise.resolve(true);
        }

        return props.item.plugin.isPermissionsGranted().then((granted) => {
            if(!granted) {
                return Promise.reject(
                    'Permissions for ' + props.item.options.type +
                    ' "' + props.item.plugin.id + '" haven\'t been granted'
                );
            }

            return true;
        });
    }

    isContentScriptsRegistered(props) {
        if(!props.item.options.contentScripts) {
            return Promise.resolve(true);
        }

        return props.item.plugin.isContentScriptsRegistered().then((registered) => {
            if(!registered) {
                return Promise.reject(
                    'Content scripts for ' + props.item.options.type +
                    ' "' + props.item.plugin.id + '" haven\'t been registered'
                );
            }

            return true;
        });
    }

    // endregion

    // region Update state

    updatePreference(enabled) {
        // Update preference
        return this.preferences.putBoolean(this.props.item.name, enabled)
            .then(() => {
                this.setState({ enabled });
            });
    }

    updatePermissions(enabled) {
        if(!this.props.item.options.permissions) {
            return Promise.resolve();
        }

        // Update permissions state
        if(enabled) {
            return this.plugin.requestPermissions();
        }

        return this.plugin.removePermissions();
    }

    updateContentScripts(enabled) {
        if(!this.props.item.options.contentScripts) {
            return Promise.resolve();
        }

        // Update content scripts state
        if(enabled) {
            return this.plugin.registerContentScripts();
        }

        return this.plugin.removeContentScripts();
    }

    // endregion

    render() {
        return (
            <div data-component="neon-extension-core:settings.options.enable" className="switch tiny">
                <input
                    className="switch-input"
                    id={this.id}
                    type="checkbox"
                    checked={this.state.enabled}
                    onChange={this.onChanged.bind(this)}
                />

                <label className="switch-paddle" htmlFor={this.id}>
                    {this.props.item && this.props.item.options.summary &&
                        <span className="show-for-sr">
                            {this.props.item.options.summary}
                        </span>
                    }
                </label>
            </div>
        );
    }
}

EnableOptionComponent.defaultProps = {
    onChange: null
};
