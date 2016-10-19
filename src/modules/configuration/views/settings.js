import Preferences from 'eon.extension.browser/preferences';
import {isDefined} from 'eon.extension.framework/core/helpers';

import React from 'react';

import Log from '../../../core/logger';
import Group from '../components/settings/group';
import './settings.scss';


export default class Options extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            page: {}
        };
    }

    componentWillReceiveProps(nextProps) {
        let type = nextProps.params.type || 'eon';
        let pluginId = nextProps.params.pluginId || 'eon.extension';
        let key = nextProps.params.key || null;

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
            page: page || {}
        });
    }

    render() {
        return (
            <div data-view="eon.extension.core:settings" className="options row">
                <Group
                    type="flat"
                    title={this.state.page.title}
                    children={this.state.page.children}
                />
            </div>
        );
    }
}
