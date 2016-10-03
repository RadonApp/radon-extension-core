import React from 'react';
import ReactPerf from 'react-addons-perf';
import ReactDOM from 'react-dom';
import {Router, hashHistory} from 'react-router';

import {routes} from './routes';
import './index.scss';


window.ReactPerf = ReactPerf;

// Initialize React
ReactDOM.render(
    <Router history={hashHistory}>{routes}</Router>,
    document.getElementById('app')
);
