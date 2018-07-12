import IsNil from 'lodash-es/isNil';
import React from 'react';

import TranslationNamespace from '@radon-extension/framework/Components/Translation/Namespace';
import {OptionComponent} from '@radon-extension/framework/Components/Configuration';


export default class CheckboxOptionComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            namespaces: [],

            checked: false
        };
    }

    componentWillMount() {
        this.refresh(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.refresh(nextProps);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(!IsNil(nextProps.item) && nextProps.item.id !== this.state.id) {
            return true;
        }

        if(nextState.checked !== this.state.checked) {
            return true;
        }

        return false;
    }

    refresh(props) {
        this.setState({
            id: props.item.id,

            namespaces: [
                this.props.item.namespace,
                this.props.item.plugin.namespace
            ]
        });

        // Retrieve option state
        props.item.preferences.getBoolean(props.item.name).then((checked) => {
            this.setState({
                checked
            });
        });
    }

    onChanged(event) {
        let checked = event.target.checked;

        // Update option state
        this.preferences.putBoolean(this.props.item.name, checked).then(() => {
            this.setState({ checked });
        });
    }

    render() {
        return (
            <TranslationNamespace ns={this.state.namespaces}>
                {(t, {i18n}) => (
                    <div data-component="neon-extension-core:settings.options.checkbox"
                        className="option option-checkbox">
                        <input
                            id={this.id}
                            type="checkbox"
                            checked={this.state.checked}
                            onChange={this.onChanged.bind(this)}
                        />

                        <label htmlFor={this.id} style={{fontSize: 14}}>{t(`${this.props.item.key}.label`)}</label>

                        {this.props.item && i18n.exists(this.props.item.key + '.summary') &&
                            <div className="summary" style={{color: '#999', fontSize: 14}}>
                                {t(this.props.item.key + '.summary')}
                            </div>
                        }
                    </div>
                )}
            </TranslationNamespace>
        );
    }
}
