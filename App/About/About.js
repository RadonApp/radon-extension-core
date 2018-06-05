import React from 'react';
import {Trans, translate} from 'react-i18next';

import FrameworkPlugin from 'neon-extension-framework/Core/Plugin';
import Registry from 'neon-extension-framework/Core/Registry';
import PageHeader from 'neon-extension-framework/Components/Page/Header';

import './About.scss';


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

        // Update page title
        document.title = `${t('title')} - ${t('neon-extension/common:title')}`;

        // Render about page
        let version = FrameworkPlugin.version;

        return (
            <div id="container" className="expanded row">
                <PageHeader title={t('neon-extension/common:title')}/>

                <div data-view="neon-extension-core:about" className="row">
                    <h4>{t('build.title')}</h4>

                    <div className="build">
                        <Trans i18nKey="build.version" version={version}>
                            <b>Version:</b> {{version}}
                        </Trans>
                    </div>

                    <h4>{t('modules.title')}</h4>

                    <div className="modules">
                        {this.state.modules.map(this.renderModule)}
                    </div>
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
                    <p className="version">v{module.version}</p>
                </div>
            </div>
        );
    }
}

export default translate([
    'neon-extension/about',
    'neon-extension/common'
], { wait: true })(About);
