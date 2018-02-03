import React from 'react';

import Registry from 'neon-extension-framework/core/registry';
import FrameworkPlugin from 'neon-extension-framework/core/plugin';

import './about.scss';


export default class About extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            modules: []
        };
    }

    componentDidMount() {
        // Fetch modules
        Registry.listPlugins({ disabled: true })
            .then((modules) => this.setState({ modules }));
    }

    render() {
        return (
            <div data-view="neon-extension-core:about">
                <h3>Neon</h3>

                <div className="build">
                    <p><b>Version: </b> {FrameworkPlugin.manifest.version}</p>
                </div>

                <h4>Modules</h4>

                <div className="modules">
                    {this.state.modules.map(this.renderModule)}
                </div>
            </div>
        );
    }

    renderModule(module) {
        if(module.id === 'neon-extension') {
            return null;
        }

        return (
            <div className="module card">
                <div className="module-header">
                    <h5 title={module.id}>
                        {module.id}
                    </h5>
                </div>

                <div className="module-body">
                    <p className="version">v{module.manifest.version}</p>
                </div>
            </div>
        );
    }
}
