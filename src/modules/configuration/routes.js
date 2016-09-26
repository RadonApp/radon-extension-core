import App from './views/app';
import List from './views/list';
import Settings from './views/settings';

import React from 'react'
import {Route, IndexRedirect} from 'react-router'


export const routes = (
    <Route path="/" component={App}>
        <IndexRedirect to="/general"/>

        <Route path="general" component={Settings}/>

        <Route path="destinations" component={List}/>
        <Route path="destinations/:pluginId" component={Settings}/>

        <Route path="sources" component={List}/>
        <Route path="sources/:pluginId" component={Settings}/>
    </Route>
);
