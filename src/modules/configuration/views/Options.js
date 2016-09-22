import Registry from 'eon.extension.framework/core/registry';

import Group from '../components/group';

import React from 'react';


export default class Options extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            plugin: {},
            configuration: {}
        };
    }

    componentWillReceiveProps(nextProps) {
        var plugin = Registry.getPluginById(nextProps.params.pluginId);

        // Try find configuration service
        var configuration;

        if(plugin) {
            configuration = Registry.getPluginServiceByType(plugin.id, 'configuration')
        }

        // Update component state
        this.setState({
            plugin: plugin || {},
            configuration: configuration || {}
        });
    }

    render() {
        return (
            <div className="options row">
                <Group
                    type="flat"
                    title={this.state.plugin.title}
                    children={this.state.configuration.options}
                />
            </div>
        );
    }
}
