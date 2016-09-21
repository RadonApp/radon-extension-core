import Registry from 'eon.extension.framework/core/registry';

import Group from '../components/group';

import React from 'react';


export default class Options extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            plugin: {},
            service: {}
        };
    }

    componentWillReceiveProps(nextProps) {
        // Find plugin
        var plugin = Registry.getPluginById(nextProps.params.pluginId);

        // Find configuration service
        var service = Registry.getPluginServiceByType(plugin.id, 'configuration');

        // Update component state
        this.setState({
            plugin: plugin || {},
            service: service || {}
        });
    }

    render() {
        return (
            <div>
                <h2>Options</h2>
                <i>{this.state.plugin.id}</i>
                <Group children={this.state.service.options}/>
            </div>
        );
    }
}
