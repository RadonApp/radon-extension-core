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

import Log from 'neon-extension-core/core/logger';
import Platform, {Platforms} from 'neon-extension-browser/platform';
import Plugin from 'neon-extension-core/core/plugin';
import Preferences from 'neon-extension-framework/preferences';


export default class App extends React.Component {
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

        if(Platform.name === Platforms.Chrome) {
            if(window.innerHeight > 550) {
                embedded = false;
            }
        } else if(Platform.name === Platforms.Firefox) {
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
        return (
            <app data-view="neon-extension-core:app" data-platform={Platform.name} className={ClassNames({
                'embedded': this.state.embedded
            })}>
                <div id="header" className="top-bar">
                    <div className="top-bar-left">
                        <button className="menu-toggle hide-for-large" data-toggle="navigation">
                            <i className="menu-icon"/>
                        </button>
                        <ul className="menu">
                            <li className="menu-text">{Plugin.title}</li>
                        </ul>
                    </div>

                    <div className="top-bar-right">
                        <ul className="dropdown menu" data-dropdown-menu>
                            <li>
                                <a>About</a>

                                <ul className="menu vertical">
                                    <li><Link to="/about">Neon</Link></li>
                                    <li><Link to="/about/credits">Credits</Link></li>
                                    <li><Link to="/about/libraries">Libraries</Link></li>
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
                                    <li key={page.id}><Link to={'/' + page.name}>
                                        {page.title}
                                    </Link></li>
                                );
                            })}

                            <li className="title-link"><Link to="/destinations">Destinations</Link></li>
                            {Object.keys(this.state.pages['destination']).map((id) => {
                                let page = this.state.pages['destination'][id];

                                return (
                                    <li key={page.id}><Link to={'/destination/' + page.plugin.id}>
                                        {page.title}
                                    </Link></li>
                                );
                            })}

                            <li className="title-link"><Link to="/sources">Sources</Link></li>
                            {Object.keys(this.state.pages['source']).map((id) => {
                                let page = this.state.pages['source'][id];

                                return (
                                    <li key={page.id}><Link to={'/source/' + page.plugin.id}>
                                        {page.title}
                                    </Link></li>
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
