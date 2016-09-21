import Registry from 'eon.extension.framework/core/registry';

import React from 'react';
import {Link} from 'react-router';


export default class App extends React.Component {
    render() {
        return (
            <app>
                <div className="top-bar">
                    <div className="top-bar-left">
                        <ul className="menu">
                            <li className="menu-text">Eon</li>
                        </ul>
                    </div>
                </div>

                <div className="expanded row">
                    <div id="app" className="medium-9 large-10 medium-push-3 large-push-2 columns">
                        {this.props.children}
                    </div>

                    <div id="navigation" className="medium-3 large-2 medium-pull-9 large-pull-10 columns">
                        <ul className="vertical menu">
                            <li><Link to="/general">General</Link></li>

                            <li className="title-link"><Link to="/destinations">Destinations</Link></li>
                            {this.listPlugins('destination').map(function(plugin) {
                                return (
                                    <li key={plugin.id} className={plugin.enabled ? '' : 'disabled'}>
                                        <Link to={'/destinations/' + plugin.id}>{plugin.title}</Link>
                                    </li>
                                );
                            })}

                            <li className="title-link"><Link to="/sources">Sources</Link></li>
                            {this.listPlugins('source').map(function(plugin) {
                                return (
                                    <li key={plugin.id} className={plugin.enabled ? '' : 'disabled'}>
                                        <Link to={'/sources/' + plugin.id}>{plugin.title}</Link>
                                    </li>
                                );
                            })}
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
        var plugins = Registry.listPlugins(type, {
            disabled: true
        });

        // Group by plugin enabled/disabled state
        var groups = _.groupBy(plugins, function(plugin) { return plugin.enabled; });

        // Sort groups
        for(var key in groups) {
            if(!groups.hasOwnProperty(key)) {
                continue;
            }

            groups[key] = _.sortBy(groups[key], 'title');
        }

        // Merge groups, display enabled plugins first
        return (groups[true] || []).concat(groups[false] || []);
    }
}
