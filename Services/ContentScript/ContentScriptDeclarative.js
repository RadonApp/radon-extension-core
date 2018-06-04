import DeclarativeContent, {PageStateMatcher, RequestContentScript} from 'wes/declarativeContent';
import ForEach from 'lodash-es/forEach';
import IsEqual from 'lodash-es/isEqual';
import IsEqualWith from 'lodash-es/isEqualWith';
import IsNil from 'lodash-es/isNil';
import Merge from 'lodash-es/merge';

import Log from '../../Core/Logger';


export class DeclarativeContentScript {
    get supported() {
        return DeclarativeContent.$exists();
    }

    // region Public Methods

    isRegistered(pluginId, contentScripts) {
        let {ruleIds, rules} = this._parseContentScripts(pluginId, contentScripts);

        // Retrieve existing rules
        return DeclarativeContent.onPageChanged.getRules(ruleIds).then((existingRules) => {
            if(ruleIds.length !== existingRules.length) {
                return false;
            }

            // Build map of existing rules
            let existingRulesMap = {};

            existingRules.forEach((rule) => {
                existingRulesMap[rule.id] = rule;
            });

            // Verify rules match
            let matched = true;

            Object.keys(rules).forEach((ruleId) => {
                let rule = rules[ruleId];

                // Retrieve existing rule
                let existingRule = existingRulesMap[ruleId];

                if(IsNil(existingRule)) {
                    matched = false;
                    return;
                }

                // Check if the rules match
                if(!this._ruleMatches(rule, existingRule)) {
                    matched = false;
                }
            });

            return matched;
        });
    }

    register(pluginId, contentScripts) {
        let {rules} = this._parseContentScripts(pluginId, contentScripts);

        // Register rules
        return DeclarativeContent.onPageChanged.addRules(rules);
    }

    unregister(pluginId, contentScripts) {
        let {ruleIds} = this._parseContentScripts(pluginId, contentScripts);

        // Remove declarative rules
        return DeclarativeContent.onPageChanged.removeRules(ruleIds);
    }

    // endregion

    // region Private Methods

    _parseContentScripts(pluginId, contentScripts) {
        let rules = {};

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
            if(!IsNil(rules[script.id])) {
                Log.warn('Content script with identifier %o has already been defined', script.id);
                return;
            }

            // Create rule
            rules[script.id] = {
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
        });

        return {
            ruleIds: Object.keys(rules),
            rules
        };
    }

    _ruleMatches(a, b) {
        if(IsNil(a) && IsNil(b)) {
            return true;
        }

        if(IsNil(a) || IsNil(b)) {
            return false;
        }

        return (
            IsEqual(a.id, b.id) &&

            IsEqualWith(a.actions, b.actions, (a, b) => {
                if(Array.isArray(a) && Array.isArray(b)) {
                    return a.length === b.length;
                }

                return a.matches(b);
            }) &&

            IsEqualWith(a.conditions, b.conditions, (a, b) => {
                if(Array.isArray(a) && Array.isArray(b)) {
                    return a.length === b.length;
                }

                return a.matches(b);
            })
        );
    }

    // endregion
}

export default new DeclarativeContentScript();
