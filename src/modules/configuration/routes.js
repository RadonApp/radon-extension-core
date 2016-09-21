import App from './views/App';
import List from './views/List';
import Options from './views/Options';

import React from 'react'
import {Route, IndexRedirect} from 'react-router'


export const routes = (
    <Route path="/" component={App}>
        <IndexRedirect to="/general"/>

        <Route path="general" component={Options}/>

        <Route path="destinations" component={List}/>
        <Route path="destinations/:pluginId" component={Options}/>

        <Route path="sources" component={List}/>
        <Route path="sources/:pluginId" component={Options}/>
    </Route>
);
