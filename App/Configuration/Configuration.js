import $ from 'jquery';
import Map from 'lodash-es/map';
import Merge from 'lodash-es/merge';
import React from 'react';
import {Foundation} from 'foundation-sites/js/foundation.core';
import {Link} from 'react-router';
import {OffCanvas} from 'foundation-sites/js/foundation.offcanvas';
import {PropTypes} from 'prop-types';
import {translate} from 'react-i18next';

import Preferences from '@radon-extension/framework/Preferences';
import Registry from '@radon-extension/framework/Core/Registry';

import Log from '../../Core/Logger';
import './Configuration.scss';


class Configuration extends React.Component {
    constructor() {
        super();

        this.state = {
            pages: {
                core: [],
                destination: [],
                source: []
            }
        };
    }

    componentWillMount() {
        // Register foundation plugins
        Foundation.plugin(OffCanvas, 'OffCanvas');

        // Listen for route changes
        this.context.router.listen(this.onRouteChange.bind(this));

        // Update state
        this.setState({
            pages: Merge({
                core: [],
                destination: [],
                source: []
            }, Preferences.pages)
        });
    }

    componentDidMount() {
        // Initialize navigation
        this.offcanvas = new Foundation.OffCanvas($('#navigation'));
    }

    componentWillUnmount() {
        try {
            this.offcanvas.destroy();
        } catch(e) {
            Log.warn('App: Unable to destroy offcanvas:', e);
        }
    }

    onRouteChange() {
        try {
            $('#navigation').foundation('close');
        } catch(e) { }
    }

    render() {
        const { t } = this.props;

        // Update page title
        document.title = `${t('title')} - ${t('neon-extension/common:title')}`;

        // Render configuration page
        return (
            <div id="container" className="expanded row">
                <div id="navigation" className="off-canvas position-left reveal-for-large" data-off-canvas>
                    <ul className="vertical menu">
                        {this.renderLinks('core')}

                        <li className="title-link"><a>{t('destinations')}</a></li>
                        {this.renderLinks('destination')}

                        <li className="title-link"><a>{t('sources')}</a></li>
                        {this.renderLinks('source')}
                    </ul>
                </div>

                <div id="content" className="off-canvas-content" data-off-canvas-content>
                    {this.props.children}
                </div>
            </div>
        );
    }

    renderLinks(type) {
        return Object.keys(this.state.pages[type]).map((id) =>
            this.renderLink(this.state.pages[type][id])
        );
    }

    renderLink(page) {
        const { t } = this.props;

        if(page.plugin.type === 'core') {
            return (
                <li key={page.id}>
                    <Link to={'/configuration/' + page.name} activeClassName="active">
                        {t(`${page.namespace}:title`)}
                    </Link>
                </li>
            );
        }

        return (
            <li key={page.id}>
                <Link to={`/configuration/${page.plugin.type}/${page.plugin.id}`} activeClassName="active">
                    {t(`${page.plugin.namespace}:title`)}
                </Link>
            </li>
        );
    }
}

Configuration.contextTypes = {
    router: PropTypes.object.isRequired
};

export default translate([
    'neon-extension/configuration',
    'neon-extension/common',

    // Load "core" page namespaces
    ...Map(Preferences.pages['core'], (page) =>
        page.namespace
    ),

    // Load "common" plugin namespaces
    ...Map(Registry.plugins, (plugin) =>
        plugin.namespace
    )
], { wait: true })(Configuration);
