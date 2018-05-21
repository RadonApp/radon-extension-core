import ClassNames from 'classnames';
import IsNil from 'lodash-es/isNil';
import React from 'react';

import TranslationNamespace from 'neon-extension-framework/Components/Translation/Namespace';
import {OptionComponent} from 'neon-extension-framework/services/configuration/components';


export default class InputOptionComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            type: null,

            namespaces: [],

            current: null,
            valid: true
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

        if(nextState.current !== this.state.current) {
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
        props.item.get().then((current) => {
            this.setState({
                valid: this.props.item.isValid(current),
                current
            });
        });
    }

    onBlur() {
        if(!this.state.valid) {
            return;
        }

        // Store value
        this.props.item.put(this.state.current);
    }

    onChange(ev) {
        let current = this.props.item.cleanValue(ev.target.value);

        // Update state
        this.setState({
            valid: this.props.item.isValid(current),
            current
        });
    }

    onPaste(ev) {
        ev.preventDefault();

        // Retrieve clipboard value
        let value = '';

        if(window.clipboardData && window.clipboardData.getData) {
            value = window.clipboardData.getData('Text');
        } else if(ev.clipboardData && ev.clipboardData.getData) {
            value = ev.clipboardData.getData('text/plain');
        }

        // Clean clipboard value
        let current = this.props.item.cleanValue(value);

        // Check if value is valid
        let valid = this.props.item.isValid(current);

        // Store value (if it's valid)
        if(valid) {
            this.props.item.put(current);
        }

        // Update state
        this.setState({
            valid,
            current
        });
    }

    render() {
        return (
            <TranslationNamespace ns={this.state.namespaces}>
                {(t, {i18n}) => (
                    <div data-component="neon-extension-core:settings.options.input" className="option option-input">
                        <label htmlFor={this.id} style={{fontSize: 14}}>{t(`${this.props.item.key}.label`)}</label>

                        <input
                            id={this.id}
                            className={ClassNames({'is-invalid-input': !this.state.valid})}

                            type={this.state.type || 'text'}
                            minLength={this.props.item.minLength}
                            maxLength={this.props.item.maxLength}
                            value={this.state.current || ''}

                            onBlur={this.onBlur.bind(this)}
                            onChange={this.onChange.bind(this)}
                            onPaste={this.onPaste.bind(this)}
                        />

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

export class PasswordOptionComponent extends InputOptionComponent {
    constructor() {
        super();

        // Update input type
        this.state.type = 'password';
    }
}

export class TextOptionComponent extends InputOptionComponent {
    constructor() {
        super();

        // Update input type
        this.state.type = 'text';
    }
}
