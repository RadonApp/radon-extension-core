import $ from 'jquery';
import IsNil from 'lodash-es/isNil';
import React from 'react';
import ReactDOM from 'react-dom';
import {Foundation} from 'foundation-sites/js/foundation.core';
import {I18nextProvider} from 'react-i18next';
import {Router, hashHistory} from 'react-router';
import 'foundation-sites/js/foundation.util.mediaQuery';

import I18n from './I18n';
import Routes from './Routes';

// Stylesheets
import './App.scss';
import './App.Chrome.scss';
import './App.Firefox.scss';

// Initialize Foundation
Foundation.addToJquery($);

// Initialize React
let $app = document.getElementById('app');

if(!IsNil($app)) {
    ReactDOM.render(
        <I18nextProvider i18n={I18n}>
            <Router history={hashHistory}>
                {Routes}
            </Router>
        </I18nextProvider>,
        $app
    );
} else {
    console.error('No "#app" element found');
}
