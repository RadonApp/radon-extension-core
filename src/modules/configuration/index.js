import {Permissions} from 'eon.extension.browser';

import React from 'react'
import ReactDOM from 'react-dom'
import {Router, hashHistory} from 'react-router'

import {routes} from './routes';
import './index.scss';


// Initialize React
ReactDOM.render(
    <Router history={hashHistory}>{routes}</Router>,
    document.getElementById('app')
);