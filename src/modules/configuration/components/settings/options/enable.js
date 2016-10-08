import DeclarativeContent, {RequestContentScript, PageStateMatcher} from 'eon.extension.browser/declarative/content';
import Permissions from 'eon.extension.browser/permissions';
import Preferences from 'eon.extension.browser/preferences';

import {OptionComponent} from 'eon.extension.framework/services/configuration/components';

import merge from 'lodash-es/merge';
import React from 'react';


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
        console.timeStamp('EnableComponent.componentWillMount()');
        this.refresh(this.props);
    }

    componentWillReceiveProps(nextProps) {
        console.timeStamp('EnableComponent.componentWillReceiveProps()');
        this.refresh(nextProps);
    }

    shouldComponentUpdate(nextProps, nextState) {
        console.timeStamp('EnableComponent.shouldComponentUpdate()');

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

        // Retrieve option state
        return Preferences.getBoolean(props.id).then((enabled) => {
            if(this._currentRefreshId !== id) {
                return false;
            }

            if(!enabled) {
                this.setState({id: props.id, enabled: false});
                return true;
            }

            // Ensure permissions have been granted (if defined)
            if(props.options.permissions) {
                return Permissions.contains(props.options.permissions).then((granted) => {
                    if(this._currentRefreshId !== id) {
                        return false;
                    }

                    this.setState({id: props.id, enabled: granted});
                    return true;
                });
            }

            this.setState({id: props.id, enabled: true});
            return true;
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
                console.warn('Unable to update permissions: %o', error);
            });
    }

    updateContentScripts(enabled) {
        if(!this.props.options.contentScripts) {
            console.debug('No content scripts required');
            return Promise.resolve();
        }

        // Build list of declarative rules
        let rules = [];
        let ruleIds = [];

        this.props.options.contentScripts.forEach((script) => {
            script = merge({
                id: null,
                conditions: [],
                css: [],
                js: []
            }, script);

            if(script.id === null) {
                console.warn('Ignoring invalid content script: %O (invalid/missing "id" property)', script);
                return;
            }

            // Add rule identifier
            if(ruleIds.indexOf(script.id) !== -1) {
                console.warn('Content script with identifier %o has already been defined', script.id);
                return;
            }

            ruleIds.push(script.id);

            // Build rule
            if(!Array.isArray(script.conditions) || script.conditions.length < 1) {
                console.warn('Ignoring invalid content script: %O (invalid/missing "conditions" property)', script);
                return;
            }

            rules.push({
                id: script.id,

                actions: [
                    new RequestContentScript({
                        css: script.css,
                        js: script.js
                    })
                ],
                conditions: script.conditions.map((condition) => {
                    return new PageStateMatcher(condition);
                })
            });
        });

        if(enabled) {
            console.debug('Updating declarative rules...');
            return DeclarativeContent.removeRules(ruleIds)
                .then(() => DeclarativeContent.addRules(rules));
        }

        console.debug('Removing declarative rules...');
        return DeclarativeContent.removeRules(ruleIds);
    }

    updatePermissions(enabled) {
        if(!this.props.options.permissions) {
            console.debug('No permissions required');
            return Promise.resolve();
        }

        if(enabled) {
            console.debug('Requesting permissions...');
            return Permissions.request(this.props.options.permissions);
        }

        console.debug('Removing permissions...');
        return Permissions.remove(this.props.options.permissions);
    }

    updatePreference(enabled) {
        // Update preference
        return Preferences.putBoolean(this.props.id, enabled)
            .then(() => {
                // Update component
                this.setState({enabled: enabled});
            });
    }

    render() {
        console.timeStamp('EnableComponent.render()');

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

    options: {
        summary: null,

        contentScripts: [],
        permissions: {}
    },

    onChange: null
};
