import React from 'react';
import {Route, IndexRedirect} from 'react-router';

import App from './views/app';
import {About, Credits, Libraries} from './views/about';
import List from './views/list';
import Settings from './views/settings';


export const routes = (
    <Route path="/" component={App}>
        <IndexRedirect to="/general"/>

        <Route path="about" component={About}/>
        <Route path="about/credits" component={Credits}/>
        <Route path="about/libraries" component={Libraries}/>

        <Route path="destinations" component={List}/>
        <Route path="sources" component={List}/>

        <Route path=":type/:pluginId/:key" component={Settings}/>
        <Route path=":type/:pluginId" component={Settings}/>
        <Route path=":key" component={Settings}/>
    </Route>
);
