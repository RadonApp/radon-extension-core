import React from 'react';

import Log from 'neon-extension-core/core/logger';
import Preferences from 'neon-extension-framework/preferences';
import {isDefined} from 'neon-extension-framework/core/helpers';

import Group from '../components/settings/group';
import './settings.scss';


export default class Options extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            page: {}
        };
    }

    componentWillMount() {
        this.refresh(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.refresh(nextProps);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextProps.type !== this.state.type) {
            return true;
        }

        if(nextProps.pageId !== this.state.pageId) {
            return true;
        }

        return false;
    }

    refresh(props) {
        let type = props.params.type || 'neon';
        let pluginId = props.params.pluginId || 'neon-extension';
        let key = props.params.key || null;

        // Build page identifier
        let pageId;

        if(isDefined(key)) {
            pageId = pluginId + ':' + key;
        } else {
            pageId = pluginId;
        }

        // Try find matching preference page
        let page = Preferences.pages[type][pageId];

        if(!isDefined(page)) {
            Log.warn('Unable to find %o preference page: %o', type, pageId);
            return;
        }

        // Update state
        this.setState({
            type: type || null,
            pageId: pageId || null,
            page: page || {}
        });
    }

    render() {
        return (
            <div data-view="neon-extension-core:settings" className="options">
                <Group
                    type="flat"
                    title={this.state.page.title}
                    children={this.state.page.children}
                />
            </div>
        );
    }
}
