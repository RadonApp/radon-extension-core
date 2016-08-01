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
                            <li><Link to="/destinations/last-fm">Last.fm</Link></li>
                            <li className="disabled"><Link to="/destinations/google-drive">Google Drive</Link></li>
                            <li className="disabled"><Link to="/destinations/trakt-tv">Trakt.tv</Link></li>

                            <li className="title-link"><Link to="/sources">Sources</Link></li>
                            <li><Link to="/sources/google-music">Google Music</Link></li>
                            <li className="disabled"><Link to="/sources/netflix">Netflix</Link></li>
                        </ul>
                    </div>
                </div>
            </app>
        );
    }
}
