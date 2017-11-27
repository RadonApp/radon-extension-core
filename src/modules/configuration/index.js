import $ from 'jquery';
import IsNil from 'lodash-es/isNil';
import React from 'react';
import ReactDOM from 'react-dom';
import {Foundation} from 'foundation-sites/js/foundation.core';
import {Router, hashHistory} from 'react-router';
import 'foundation-sites/js/foundation.util.mediaQuery';

import {routes} from './routes';

// Application Styles
import './app.scss';
import './app.chrome.scss';
import './app.firefox.scss';

// Attach Foundation to jQuery Object
Foundation.addToJquery($);

// Initialize React
let $app = document.getElementById('app');

if(!IsNil($app)) {
    ReactDOM.render(<Router history={hashHistory}>{routes}</Router>, $app);
}
