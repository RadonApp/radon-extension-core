import Callbacks from 'eon.extension.framework/core/callbacks';
import Registry from 'eon.extension.framework/core/registry';

import groupBy from 'lodash-es/groupBy';
import sortBy from 'lodash-es/sortBy';
import React from 'react';
import {Link} from 'react-router';


export default class App extends React.Component {
    constructor() {
        super();

        this.state = {
            destinations: [],
            sources: []
        };
    }

    componentWillMount() {
        console.timeStamp('App.componentWillMount()');

        // Update state
        this.setState({
            // Map destinations
            destinations: this.listPlugins('destination').map(function(plugin) {
                return (
                    <li key={plugin.id} className={plugin.enabled ? '' : 'disabled'}>
                        <Link to={'/destinations/' + plugin.id}>{plugin.title}</Link>
                    </li>
                );
            }),

            // Map sources
            sources: this.listPlugins('source').map(function(plugin) {
                return (
                    <li key={plugin.id} className={plugin.enabled ? '' : 'disabled'}>
                        <Link to={'/sources/' + plugin.id}>{plugin.title}</Link>
                    </li>
                );
            })
        });

        // Retrieve callback details
        Callbacks.get().then((callback) => {
            if(callback === null) {
                console.debug('No callback has been set');
                return;
            }

            // Navigate to callback plugin
            window.location.hash = callback.hash;
        }, (e) => {
            console.debug('Error processing callback: %O', e);
        });
    }

    render() {
        console.timeStamp('App.render()');

        return (
            <app data-view="eon.extension.core:app">
                <div className="top-bar">
                    <div className="top-bar-left">
                        <ul className="menu">
                            <li className="menu-text">Eon</li>
                        </ul>
                    </div>
                </div>

                <div className="expanded row">
                    <div id="app"
                         className="small-11 medium-9 large-10 small-push-1 medium-push-3 large-push-2 columns">
                        {this.props.children}
                    </div>

                    <div id="navigation"
                         className="small-1 medium-3 large-2 small-pull-11 medium-pull-9 large-pull-10 columns">
                        <ul className="vertical menu">
                            <li><Link to="/general">General</Link></li>

                            <li className="title-link"><Link to="/destinations">Destinations</Link></li>
                            {this.state.destinations}

                            <li className="title-link"><Link to="/sources">Sources</Link></li>
                            {this.state.sources}
                        </ul>
                    </div>
                </div>
            </app>
        );
    }

    //
    // Helpers
    //

    listPlugins(type) {
        let plugins = Registry.listPlugins(type, {
            disabled: true
        });

        // Group by plugin enabled/disabled state
        let groups = groupBy(plugins, (plugin) => {
            return plugin.enabled;
        });

        // Sort groups
        Object.keys(groups).forEach((key) => {
            groups[key] = sortBy(groups[key], ['title']);
        });

        // Merge groups, display enabled plugins first
        return (groups[true] || []).concat(groups[false] || []);
    }
}
