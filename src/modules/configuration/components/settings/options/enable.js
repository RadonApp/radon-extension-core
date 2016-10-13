import DeclarativeContent, {RequestContentScript, PageStateMatcher} from 'eon.extension.browser/declarative/content';
import Permissions from 'eon.extension.browser/permissions';
import Preferences from 'eon.extension.browser/preferences';

import {isDefined} from 'eon.extension.framework/core/helpers';
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

        // Check plugin enabled state
        this.isEnabled(props.id, props.options).then((enabled) => {
            if(this._currentRefreshId !== id) {
                return;
            }

            this.setState({id: props.id, enabled: enabled});
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

    // region Check state

    isEnabled(id, options) {
        return Preferences.getBoolean(id)
            .then((enabled) => {
                if(!enabled) {
                    return Promise.reject(new Error('Plugin hasn\'t been enabled'));
                }

                return enabled;
            })
            .then(() => this.isPermissionGranted(options.permissions))
            .then(() => this.isContentScriptsEnabled(options.contentScripts))
            .catch(() => {
                return false;
            });
    }

    isPermissionGranted(permissions) {
        if(!Permissions.supported || !permissions || permissions.length < 1) {
            return Promise.resolve(true);
        }

        // Check if `permissions` have been granted
        return Permissions.contains(permissions).then((granted) => {
            if(!granted) {
                return Promise.reject(new Error('Plugin permissions haven\'t been granted'));
            }

            return granted;
        });
    }

    isContentScriptsEnabled(contentScripts) {
        if(!DeclarativeContent.supported || !contentScripts || contentScripts.length < 1) {
            return Promise.resolve(true);
        }

        // Create declarative rules
        let {rules, rulesMap, ruleIds} = this._createDeclarativeRules(contentScripts);

        // Retrieve existing content scripts
        return DeclarativeContent.getRules(ruleIds).then((existingRules) => {
            if(rules.length !== existingRules.length) {
                return false;
            }

            // Build map of existing rules
            let existingRulesMap = {};

            existingRules.forEach((rule) => {
                existingRulesMap[rule.id] = rule;
            });

            // Verify rules match
            let matched = true;

            Object.keys(rulesMap).forEach((ruleId) => {
                let rule = rulesMap[ruleId];

                // Retrieve existing rule
                let existingRule = existingRulesMap[ruleId];

                if(!isDefined(existingRule)) {
                    matched = false;
                    return;
                }

                // Check if the rules match
                if(!DeclarativeContent.matches(rule, existingRule)) {
                    matched = false;
                }
            });

            console.log('rulesMap: %o, existingRulesMap: %o, matched: %o', rulesMap, existingRulesMap, matched);
            return matched;
        });
    }

    // endregion

    // region Update state

    updateContentScripts(enabled) {
        if(!DeclarativeContent.supported || !this.props.options.contentScripts) {
            return Promise.resolve();
        }

        if(this.props.options.contentScripts.length < 1) {
            return Promise.resolve();
        }

        // Create declarative rules
        let {rules, ruleIds} = this._createDeclarativeRules(this.props.options.contentScripts);

        // Update declarative rules
        if(enabled) {
            console.debug('Updating declarative rules...');
            return DeclarativeContent.removeRules(ruleIds)
                .then(() => DeclarativeContent.addRules(rules));
        }

        console.debug('Removing declarative rules...');
        return DeclarativeContent.removeRules(ruleIds);
    }

    updatePermissions(enabled) {
        if(!Permissions.supported || !this.props.options.permissions) {
            return Promise.resolve();
        }

        if(Object.keys(this.props.options.permissions).length < 1) {
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

    // endregion

    // region Helpers

    _createDeclarativeRules(contentScripts) {
        let rules = [];
        let rulesMap = {};
        let ruleIds = [];

        // Create declarative rules from content scripts
        contentScripts.forEach((script) => {
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

            let rule = {
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
            };

            // Store rule
            rules.push(rule);
            rulesMap[script.id] = rule;
        });

        return {
            rules: rules,
            rulesMap: rulesMap,

            ruleIds: ruleIds
        };
    }

    // endregion

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
