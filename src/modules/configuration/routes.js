import App from './views/app';
import List from './views/list';
import Settings from './views/settings';

import React from 'react';
import {Route, IndexRedirect} from 'react-router';


export const routes = (
    <Route path="/" component={App}>
        <IndexRedirect to="/general"/>

        <Route path="destinations" component={List}/>
        <Route path="sources" component={List}/>

        <Route path=":type/:pluginId/:key" component={Settings}/>
        <Route path=":type/:pluginId" component={Settings}/>
        <Route path=":key" component={Settings}/>
    </Route>
);
