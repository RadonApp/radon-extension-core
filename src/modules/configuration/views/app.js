import $ from 'jquery';
import ClassNames from 'classnames';
import IsNil from 'lodash-es/isNil';
import Merge from 'lodash-es/merge';
import QueryString from 'querystring';
import React from 'react';
import {Foundation} from 'foundation-sites/js/foundation.core';
import {DropdownMenu} from 'foundation-sites/js/foundation.dropdownMenu';
import {OffCanvas} from 'foundation-sites/js/foundation.offcanvas';
import {Link} from 'react-router';
import {PropTypes} from 'prop-types';
import {translate} from 'react-i18next';

import Log from 'neon-extension-core/core/logger';
import Plugin from 'neon-extension-core/core/plugin';
import Preferences from 'neon-extension-framework/preferences';

import I18n from '../components/I18n';


class App extends React.Component {
    constructor() {
        super();

        this.state = {
            embedded: false,

            pages: {
                core: [],
                destination: [],
                source: []
            }
        };
    }

    componentWillMount() {
        // Register foundation plugins
        Foundation.plugin(DropdownMenu, 'DropdownMenu');
        Foundation.plugin(OffCanvas, 'OffCanvas');

        // Parse query parameters
        let query = {};

        if(window.location.search.length > 1) {
            query = QueryString.decode(window.location.search.substring(1));
        }

        // Detect embedded configuration frame
        let embedded = !IsNil(query.embedded);

        if(neon.browser.name === 'chrome') {
            if(window.innerHeight > 550) {
                embedded = false;
            }
        } else if(neon.browser.name === 'firefox') {
            if(window.innerHeight > 500) {
                embedded = false;
            }
        }

        // Listen for route changes
        this.context.router.listen(this.onRouteChange.bind(this));

        // Update state
        this.setState({
            embedded: embedded,

            pages: Merge({
                core: [],
                destination: [],
                source: []
            }, Preferences.pages)
        });
    }

    componentDidMount() {
        // Update page title
        document.title = `Options - ${Plugin.title}`;

        // Initialize navigation
        this.headerDropdownMenus = new Foundation.DropdownMenu($('#header'));
        this.offcanvas = new Foundation.OffCanvas($('#navigation'));
    }

    componentWillUnmount() {
        try {
            this.headerDropdownMenus.destroy();
        } catch(e) {
            Log.warn('App: Unable to destroy header dropdown menus:', e);
        }

        try {
            this.offcanvas.destroy();
        } catch(e) {
            Log.warn('App: Unable to destroy offcanvas:', e);
        }
    }

    onRouteChange(location, action) {
        try {
            $('#navigation').foundation('close');
        } catch(e) { }
    }

    render() {
        const { t } = this.props;

        return (
            <app data-view="neon-extension-core:app" data-platform={neon.browser.name} className={ClassNames({
                'embedded': this.state.embedded
            })}>
                <div id="header" className="top-bar">
                    <div className="top-bar-left">
                        <button className="menu-toggle hide-for-large" data-toggle="navigation">
                            <i className="menu-icon"/>
                        </button>
                        <ul className="menu">
                            <li className="menu-text">{t('neon-extension/common:title')}</li>
                        </ul>
                    </div>

                    <div className="top-bar-right">
                        <ul className="dropdown menu" data-dropdown-menu>
                            <li>
                                <a>{t('neon-extension/navigation:about')}</a>

                                <ul className="menu vertical">
                                    <li><Link to="/about">
                                        {t('neon-extension/common:title')}
                                    </Link></li>

                                    <li><Link to="/about/credits">
                                        {t('neon-extension/navigation:credits')}
                                    </Link></li>

                                    <li><Link to="/about/libraries">
                                        {t('neon-extension/navigation:libraries')}
                                    </Link></li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>

                <div id="container" className="expanded row">
                    <div id="navigation" className="off-canvas position-left reveal-for-large" data-off-canvas>
                        <ul className="vertical menu">
                            {Object.keys(this.state.pages['core']).map((id) => {
                                let page = this.state.pages['core'][id];

                                return (
                                    <I18n ns={page.namespace}>
                                        {(t) => (
                                            <li key={page.id}><Link to={'/' + page.name}>
                                                {t('title')}
                                            </Link></li>
                                        )}
                                    </I18n>
                                );
                            })}

                            <li className="title-link"><a>{t('destinations')}</a></li>
                            {Object.keys(this.state.pages['destination']).map((id) => {
                                let page = this.state.pages['destination'][id];

                                return (
                                    <I18n ns={page.plugin.namespace}>
                                        {(t) => (
                                            <li key={page.id}><Link to={'/destination/' + page.plugin.id}>
                                                {t('title')}
                                            </Link></li>
                                        )}
                                    </I18n>
                                );
                            })}

                            <li className="title-link"><a>{t('sources')}</a></li>
                            {Object.keys(this.state.pages['source']).map((id) => {
                                let page = this.state.pages['source'][id];

                                return (
                                    <I18n ns={page.plugin.namespace}>
                                        {(t) => (
                                            <li key={page.id}><Link to={'/source/' + page.plugin.id}>
                                                {t('title')}
                                            </Link></li>
                                        )}
                                    </I18n>
                                );
                            })}
                        </ul>
                    </div>

                    <div id="content" className="off-canvas-content" data-off-canvas-content>
                        {this.props.children}
                    </div>
                </div>
            </app>
        );
    }
}

App.contextTypes = {
    router: PropTypes.object.isRequired
};

export default translate([
    'neon-extension/configuration',
    'neon-extension/navigation',
    'neon-extension/common'
], { wait: true })(App);
