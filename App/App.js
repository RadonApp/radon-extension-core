/* eslint-disable no-console */
import $ from 'jquery';
import ClassNames from 'classnames';
import IsNil from 'lodash-es/isNil';
import QueryString from 'querystring';
import React from 'react';
import {Foundation} from 'foundation-sites/js/foundation.core';
import {DropdownMenu} from 'foundation-sites/js/foundation.dropdownMenu';
import {Link} from 'react-router';
import {translate} from 'react-i18next';

import Log from '../Core/Logger';


class App extends React.Component {
    constructor() {
        super();

        this.state = {
            embedded: false
        };
    }

    componentWillMount() {
        // Register foundation plugins
        Foundation.plugin(DropdownMenu, 'DropdownMenu');

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

        // Update state
        this.setState({
            embedded: embedded
        });
    }

    componentDidMount() {
        // Initialize header
        this.headerDropdownMenus = new Foundation.DropdownMenu($('#header'));
    }

    componentWillUnmount() {
        try {
            this.headerDropdownMenus.destroy();
        } catch(e) {
            Log.warn('App: Unable to destroy header dropdown menus:', e);
        }
    }

    render() {
        const { t } = this.props;

        // Render application
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
                            <li className="menu-text">
                                {t('neon-extension/common:title')}
                            </li>

                            <li><Link to="/configuration" activeClassName="active">
                                {t('configuration')}
                            </Link></li>
                        </ul>
                    </div>

                    <div className="top-bar-right">
                        <ul className="dropdown menu" data-dropdown-menu>
                            <li>
                                <a>{t('about')}</a>

                                <ul className="menu vertical">
                                    <li><Link to="/about">
                                        {t('neon-extension/common:title')}
                                    </Link></li>

                                    <li><Link to="/about/credits">
                                        {t('credits')}
                                    </Link></li>

                                    <li><Link to="/about/libraries">
                                        {t('libraries')}
                                    </Link></li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>

                {this.props.children}
            </app>
        );
    }
}

export default translate([
    'neon-extension/navigation',
    'neon-extension/common'
], { wait: true })(App);
