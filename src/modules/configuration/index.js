import $ from 'jquery';
import IsNil from 'lodash-es/isNil';
import React from 'react';
import ReactDOM from 'react-dom';
import {Foundation} from 'foundation-sites/js/foundation.core';
import {I18nextProvider} from 'react-i18next';
import {Router, hashHistory} from 'react-router';
import 'foundation-sites/js/foundation.util.mediaQuery';

import i18n from './i18n';
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
    ReactDOM.render(
        <I18nextProvider i18n={i18n}>
            <Router history={hashHistory}>
                {routes}
            </Router>
        </I18nextProvider>,
        $app
    );
}
