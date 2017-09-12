import Platform, {Platforms} from 'eon.extension.browser/platform';

import classNames from 'classnames';
import merge from 'lodash-es/merge';
import querystring from 'querystring';
import React from 'react';
import {Link} from 'react-router';

import Preferences from 'eon.extension.framework/preferences';
import {isDefined} from 'eon.extension.framework/core/helpers';


export default class App extends React.Component {
    constructor() {
        super();

        this.state = {
            embedded: false,

            pages: {
                core: [],
                destinations: [],
                sources: []
            }
        };
    }

    componentWillMount() {
        // Parse query parameters
        let query = {};

        if(window.location.search.length > 1) {
            query = querystring.decode(window.location.search.substring(1));
        }

        // Detect embedded configuration frame
        let embedded = isDefined(query.embedded);

        if(Platform.name === Platforms.Chrome) {
            if(window.innerHeight > 550) {
                embedded = false;
            }
        } else if(Platform.name === Platforms.Firefox) {
            if(window.innerHeight > 500) {
                embedded = false;
            }
        }

        // Update state
        this.setState({
            embedded: embedded,

            pages: merge({
                core: [],
                destination: [],
                source: []
            }, Preferences.pages)
        });
    }

    render() {
        return (
            <app data-view="eon.extension.core:app" data-platform={Platform.name} className={classNames({
                'embedded': this.state.embedded
            })}>
                <div id="header" className="top-bar">
                    <div className="top-bar-left">
                        <ul className="menu">
                            <li className="menu-text">Eon</li>
                        </ul>
                    </div>
                </div>

                <div id="container" className="expanded row">
                    <div id="navigation"
                         className="small-1 medium-3 large-2 small-pull-11 medium-pull-9 large-pull-10 columns">
                        <ul className="vertical menu">
                            {Object.keys(this.state.pages['eon']).map((id) => {
                                let page = this.state.pages['eon'][id];

                                return (
                                    <li key={page.id}><Link to={'/' + page.key}>
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

                    <div id="content"
                         className="small-11 medium-9 large-10 small-push-1 medium-push-3 large-push-2 columns">
                        {this.props.children}
                    </div>
                </div>
            </app>
        );
    }
}
