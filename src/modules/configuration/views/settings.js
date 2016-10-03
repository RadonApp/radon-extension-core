import Registry from 'eon.extension.framework/core/registry';

import React from 'react';

import Group from '../components/settings/group';
import './settings.scss';


export default class Options extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            plugin: {},
            configuration: {}
        };
    }

    componentWillReceiveProps(nextProps) {
        console.timeStamp('Settings.componentWillReceiveProps()');

        let plugin = Registry.getPluginById(nextProps.params.pluginId);

        // Try find configuration service
        let configuration;

        if(plugin) {
            configuration = Registry.getPluginServiceByType(plugin.id, 'configuration');
        }

        // Update component state
        this.setState({
            plugin: plugin || {},
            configuration: configuration || {}
        });
    }

    render() {
        console.timeStamp('Settings.render()');

        return (
            <div data-view="eon.extension.core:settings" className="options row">
                <Group
                    type="flat"
                    title={this.state.plugin.title}
                    children={this.state.configuration.options}
                />
            </div>
        );
    }
}
