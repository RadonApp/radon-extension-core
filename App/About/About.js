import IsNil from 'lodash-es/isNil';
import React from 'react';
import {translate} from 'react-i18next';

import FrameworkPlugin from '@radon-extension/framework/Core/Plugin';
import Registry from '@radon-extension/framework/Core/Registry';
import PageHeader from '@radon-extension/framework/Components/Page/Header';

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
        Registry.listPlugins({ disabled: true }).then((modules) =>
            this.setState({ modules })
        );
    }

    getRepositoryUrl(plugin) {
        let repository = plugin.repository;

        // Ensure repository exists
        if(IsNil(repository)) {
            return null;
        }

        // Ignore dirty plugins
        if(repository.dirty) {
            return null;
        }

        if(!IsNil(repository.tag)) {
            return `https://github.com/NeApp/${plugin.name}/releases/tag/${repository.tag}`;
        }

        if(!IsNil(repository.commit)) {
            return `https://github.com/NeApp/${plugin.name}/commit/${repository.commit}`;
        }

        return null;
    }

    render() {
        const { t } = this.props;

        // Update page title
        document.title = `${t('title')} - ${t('neon-extension/common:title')}`;

        // Render page
        return (
            <div id="container" className="expanded row">
                <PageHeader title={t('neon-extension/common:title')} subtitle={this.renderVersion(FrameworkPlugin)}/>

                <div data-view="neon-extension-core:about" className="row">
                    <div className="modules">
                        {this.state.modules.map(this.renderModule.bind(this))}
                    </div>
                </div>
            </div>
        );
    }

    renderModule(plugin) {
        if(IsNil(plugin) || plugin.id === 'neon-extension') {
            return null;
        }

        return (
            <div className="module card">
                <div className="module-header">
                    <a href={`https://github.com/NeApp/${plugin.name}`} target="_blank">
                        <h5 title={plugin.id}>
                            {plugin.title}
                        </h5>
                    </a>
                </div>

                <div className="module-body">
                    {this.renderVersion(plugin)}
                </div>
            </div>
        );
    }

    renderVersion(plugin) {
        let url = this.getRepositoryUrl(plugin);
        let version = `v${plugin.versionName}`;

        // Render element
        if(!IsNil(url)) {
            return <a className="version" href={url} target="_blank">{version}</a>;
        }

        return <p className="version">{version}</p>;
    }
}

export default translate([
    'neon-extension/about',
    'neon-extension/common'
], { wait: true })(About);
