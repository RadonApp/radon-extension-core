import i18n from 'i18next';
import XHR from 'i18next-xhr-backend';
import {reactI18nextModule} from 'react-i18next';


i18n.use(XHR).use(reactI18nextModule).init({
    allowMultiLoading: false,
    loadPath: '/Locales/{{lng}}/{{ns}}.json',

    debug: true,
    fallbackLng: 'en',

    ns: 'neon-extension/common',
    defaultNS: 'neon-extension/common',

    interpolation: {
        escapeValue: false
    },

    react: {
        defaultTransParent: 'div',

        wait: true,
        bindI18n: 'languageChanged loaded',
        bindStore: 'added removed',
        nsMode: 'default'
    }
});

export default i18n;
