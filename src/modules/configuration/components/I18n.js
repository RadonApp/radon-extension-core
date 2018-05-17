import IsEqual from 'lodash-es/isEqual';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getDefaults, getI18n } from 'react-i18next';


let removedIsInitialSSR = false;

export default class I18n extends Component {
    constructor(props, context) {
        super(props, context);

        this.i18n = props.i18n || context.i18n || getI18n();

        // Retrieve namespaces
        let namespaces = props.ns || (this.i18n.options && this.i18n.options.defaultNS);

        if(typeof namespaces === 'string') {
            namespaces = [namespaces];
        }

        // Build options
        this.options = {
            ...getDefaults(),

            ...((this.i18n && this.i18n.options && this.i18n.options.react) || {}),
            ...props
        };

        // nextjs SSR: getting data from next.js or other ssr stack
        if(props.initialI18nStore) {
            this.i18n.services.resourceStore.data = props.initialI18nStore;
            this.options.wait = false; // we got all passed down already
        }

        if(props.initialLanguage) {
            this.i18n.changeLanguage(props.initialLanguage);
        }

        // provider SSR: data was set in provider and ssr flag was set
        if(this.i18n.options && this.i18n.options.isInitialSSR) {
            this.options.wait = false;
        }

        // Create state
        const language = this.i18n.languages && this.i18n.languages[0];

        const ready = !!language && namespaces.every(ns =>
            this.i18n.hasResourceBundle(language, ns)
        );

        this.state = {
            i18nLoadedAt: null,

            namespaces,
            ready
        };

        // Create initial translate function
        this.t = this.getI18nTranslate();

        this.onI18nChanged = this.onI18nChanged.bind(this);
        this.getI18nTranslate = this.getI18nTranslate.bind(this);
    }

    getChildContext() {
        return {
            t: this.t,
            i18n: this.i18n
        };
    }

    componentDidMount() {
        const bind = () => {
            if(this.options.bindI18n && this.i18n) {
                this.i18n.on(this.options.bindI18n, this.onI18nChanged);
            }

            if(this.options.bindStore && this.i18n.store) {
                this.i18n.store.on(this.options.bindStore, this.onI18nChanged);
            }
        };

        this.mounted = true;

        // Load namespaces
        this.loadNamespaces(this.state.namespaces, () => {
            if(this.mounted && !this.state.ready) {
                this.setState({ ready: true });
            }

            if(this.options.wait && this.mounted) {
                bind();
            }
        });

        if(!this.options.wait) {
            bind();
        }
    }

    componentWillReceiveProps(nextProps) {
        let namespaces = nextProps.ns || (this.i18n.options && this.i18n.options.defaultNS);

        if(typeof namespaces === 'string') {
            namespaces = [namespaces];
        }

        if(IsEqual(namespaces, this.state.namespaces)) {
            return;
        }

        // Determine if the namespaces have already been loaded
        const language = this.i18n.languages && this.i18n.languages[0];

        const ready = !!language && namespaces.every(ns =>
            this.i18n.hasResourceBundle(language, ns)
        );

        if(ready) {
            // Update translate function
            this.t = this.getI18nTranslate(namespaces);

            // Update state
            this.setState({ namespaces });
            return;
        }

        // Update state
        this.setState({
            namespaces,
            ready
        });

        // Load namespaces
        this.loadNamespaces(namespaces, () => {
            // Update translate function
            this.t = this.getI18nTranslate(namespaces);

            // Update state
            this.setState({
                ready: true
            });
        });
    }

    componentWillUnmount() {
        this.mounted = false;

        if(this.onI18nChanged) {
            if(this.options.bindI18n) {
                const p = this.options.bindI18n.split(' ');

                p.forEach(f => this.i18n.off(f, this.onI18nChanged));
            }

            if(this.options.bindStore) {
                const p = this.options.bindStore.split(' ');

                p.forEach(f => this.i18n.store && this.i18n.store.off(f, this.onI18nChanged));
            }
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            // Properties
            !IsEqual(this.props.ns, nextProps.ns) ||

            // State
            !IsEqual(this.state.namespaces, nextState.namespaces) ||
            this.state.i18nLoadedAt !== nextState.i18nLoadedAt ||
            this.state.ready !== nextState.ready
        );
    }

    loadNamespaces(namespaces, done = null) {
        // Load namespaces with i18n
        this.i18n.loadNamespaces(namespaces, () => {
            const ready = () => {
                if(done) done();
            };

            if(this.i18n.isInitialized) {
                ready();
            } else {
                const initialized = () => {
                    // due to emitter removing issue in i18next we need to delay remove
                    setTimeout(() => {
                        this.i18n.off('initialized', initialized);
                    }, 1000);
                    ready();
                };

                this.i18n.on('initialized', initialized);
            }
        });
    }

    onI18nChanged() {
        if(!this.mounted) {
            return;
        }

        let namespaces = this.options.nsMode === 'fallback' ?
            this.state.namespaces :
            this.state.namespaces[0];

        if(IsEqual(namespaces, this.t.ns)) {
            return;
        }

        // Update translate function
        this.t = this.i18n.getFixedT(null, namespaces);

        // Update state (trigger re-render)
        this.setState({ i18nLoadedAt: new Date() });
    }

    getI18nTranslate(namespaces = null) {
        namespaces = namespaces || this.state.namespaces;

        // Retrieve translate function
        return this.i18n.getFixedT(
            null,

            // Namespaces
            this.options.nsMode === 'fallback' ?
                namespaces :
                namespaces[0]
        );
    }

    render() {
        const { children } = this.props;
        const { ready } = this.state;

        if(!ready && this.options.wait) {
            return null;
        }

        // remove ssr flag set by provider - first render was done from now on wait if set to wait
        if(this.i18n.options && this.i18n.options.isInitialSSR && !removedIsInitialSSR) {
            removedIsInitialSSR = true;

            setTimeout(() => {
                delete this.i18n.options.isInitialSSR;
            }, 100);
        }

        return children(this.t, {
            i18n: this.i18n,
            t: this.t,
            ready
        });
    }
}

I18n.contextTypes = {
    i18n: PropTypes.object
};

I18n.childContextTypes = {
    t: PropTypes.func.isRequired,
    i18n: PropTypes.object
};
