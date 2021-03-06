import ClassNames from 'classnames';
import IsEqual from 'lodash-es/isEqual';
import IsNil from 'lodash-es/isNil';
import React from 'react';

import PageHeader from '@radon-extension/framework/Components/Page/Header';
import Preferences from '@radon-extension/framework/Preferences';
import TranslationNamespace from '@radon-extension/framework/Components/Translation/Namespace';
import {Options} from '@radon-extension/framework/Models/Configuration';

import ConfigurationGroup from './ConfigurationGroup';
import Log from '../../Core/Logger';
import './ConfigurationPage.scss';


export default class ConfigurationPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            enabled: true,

            page: null,
            headerOption: null,

            namespaces: []
        };
    }

    componentWillMount() {
        this.refresh(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.refresh(nextProps);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            // Properties
            !IsEqual(this.props.params, nextProps.params) ||

            // State
            !IsEqual(this.state.namespaces, nextState.namespaces) ||
            this.state.enabled !== nextState.enabled ||
            this.state.page !== nextState.page ||
            this.state.headerOption !== nextState.headerOption
        );
    }

    onEnableChanged(enabled) {
        this.setState({
            enabled: enabled
        });
    }

    refresh(props) {
        let type = props.params.type || 'core';

        // Retrieve page identifiers
        let pageId = this._getPageIdentifier(
            props.params.pluginId || 'neon-extension',
            props.params.key || null
        );

        // Try find matching preference page
        let page = Preferences.pages[type][pageId];

        if(IsNil(page)) {
            Log.warn('Unable to find %o preference page: %o', type, pageId);
            return;
        }

        // Build locale namespaces
        let namespaces = [];

        if(!IsNil(page)) {
            namespaces = [
                page.namespace,
                page.plugin.namespace
            ];
        }

        // Find header option
        let headerOption = this._getHeaderOption(page.children);

        // Update state
        this.setState({
            enabled: true,

            page: page || null,
            headerOption,

            namespaces
        });

        // Refresh enable option
        this.refreshEnableState(headerOption);
    }

    refreshEnableState(headerOption) {
        if(IsNil(headerOption)) {
            this.setState({ enabled: true });
            return;
        }

        if(!(headerOption instanceof Options.EnableOption)) {
            this.setState({ enabled: true });
            return;
        }

        // Update current state
        headerOption.isEnabled().then((enabled) => {
            this.setState({ enabled });
        });
    }

    render() {
        return (
            <TranslationNamespace ns={this.state.namespaces} nsMode="fallback">
                {(t) => (
                    <div data-view="neon-extension-core:settings"
                        className={ClassNames('group group-flat expanded row', {'enabled': this.state.enabled})}>
                        <PageHeader title={t('title')}>
                            {this.state.headerOption &&
                                <div className="PageHeader-option small-2 columns" style={{ textAlign: 'right' }}>
                                    {this.state.headerOption.type === 'enable' &&
                                        ConfigurationGroup.renderItem(
                                            this.state.headerOption,
                                            this.onEnableChanged.bind(this)
                                        )
                                    }
                                </div>
                            }
                        </PageHeader>

                        {this.state.page && this.state.page.children && <div className="content columns">
                            <div className="children row">
                                {this.state.page.children.map((item) => {
                                    if(item.type === 'enable') {
                                        return null;
                                    }

                                    return ConfigurationGroup.renderItem(item);
                                })}
                            </div>

                            <div className="overlay"/>
                        </div>}
                    </div>
                )}
            </TranslationNamespace>
        );
    }

    _getHeaderOption(children) {
        for(let i = 0; i < children.length; ++i) {
            let item = children[i];

            if(item.type === 'enable') {
                return item;
            }
        }

        return null;
    }

    _getPageIdentifier(pluginId, key = null) {
        let pageId;

        if(!IsNil(key)) {
            pageId = `${pluginId}:${key}`;
        } else {
            pageId = pluginId;
        }

        return pageId;
    }
}
