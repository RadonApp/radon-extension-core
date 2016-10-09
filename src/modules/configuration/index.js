import React from 'react';
import ReactDOM from 'react-dom';
import {Router, hashHistory} from 'react-router';

import {routes} from './routes';

// Import application stylesheet
import './app.scss';
import './app.chrome.scss';
import './app.firefox.scss';

// Initialize React
ReactDOM.render(
    <Router history={hashHistory}>{routes}</Router>,
    document.getElementById('app')
);
