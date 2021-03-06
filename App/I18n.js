import {reactI18nextModule} from 'react-i18next';

import I18nManager from '@radon-extension/framework/Core/I18n';


export default I18nManager.createInstance({
    plugins: [reactI18nextModule],

    ns: 'core/common',

    react: {
        defaultTransParent: 'div',

        wait: true,
        bindI18n: 'languageChanged loaded',
        bindStore: 'added removed',
        nsMode: 'default'
    }
});
