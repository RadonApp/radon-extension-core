import React from 'react';
import {Trans, translate} from 'react-i18next';

import Registry from 'neon-extension-framework/core/registry';
import FrameworkPlugin from 'neon-extension-framework/core/plugin';

import './about.scss';


class About extends React.Component {
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
        const { t } = this.props;

        let version = FrameworkPlugin.manifest.version;

        return (
            <div data-view="neon-extension-core:about">
                <h3>{t('neon-extension/common:title')}</h3>

                <div className="build">
                    <Trans i18nKey="version" version={version}>
                        <b>Version:</b> {{version}}
                    </Trans>
                </div>

                <h4>{t('modules')}</h4>

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

export default translate([
    'neon-extension/about',
    'neon-extension/common'
], { wait: true })(About);
