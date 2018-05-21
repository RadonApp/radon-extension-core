import React from 'react';
import {IndexRedirect, IndexRoute, Route} from 'react-router';

import About, {Credits, Libraries} from './About';
import App from './App';
import Configuration, {ConfigurationList, ConfigurationPage} from './Configuration';


export default (
    <Route path="/" component={App}>
        <IndexRedirect to="/configuration"/>

        <Route path="about">
            <IndexRoute component={About}/>

            <Route path="credits" component={Credits}/>
            <Route path="libraries" component={Libraries}/>
        </Route>

        <Route path="configuration" component={Configuration}>
            <IndexRedirect to="/configuration/destination/neon-extension-destination-lastfm"/>

            <Route path="destinations" component={ConfigurationList}/>
            <Route path="sources" component={ConfigurationList}/>

            <Route path=":type/:pluginId/:key" component={ConfigurationPage}/>
            <Route path=":type/:pluginId" component={ConfigurationPage}/>
            <Route path=":key" component={ConfigurationPage}/>
        </Route>
    </Route>
);
