import Registry from 'eon.extension.framework/core/registry';

import React from 'react';


export default class Options extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            plugin: {}
        };
    }

    componentWillReceiveProps(nextProps) {
        // Retrieve plugin
        var plugin = Registry.getPluginById(nextProps.params.pluginId);

        // Update component state
        this.setState({
            plugin: plugin || {}
        });
    }

    render() {
        return (
            <div>
                <h2>Options</h2>
                <i>{this.state.plugin.id}</i>
            </div>
        );
    }
}
