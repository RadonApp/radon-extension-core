import IsNil from 'lodash-es/isNil';
import React from 'react';

import {OptionComponent} from 'neon-extension-framework/services/configuration/components';

import I18n from '../../I18n';


export default class SelectComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            namespaces: [],

            current: null
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
        props.item.preferences.getString(props.item.name).then((current) => {
            this.setState({
                current
            });
        });
    }

    onChanged(event) {
        let current = event.target.value;

        // Update option state
        this.preferences.putString(this.props.item.name, current).then(() => {
            this.setState({ current });
        });
    }

    // TODO Use choice labels from translation namespace
    render() {
        return (
            <I18n ns={this.state.namespaces}>
                {(t, {i18n}) => (
                    <div data-component="neon-extension-core:settings.options.select" className="option option-select">
                        <label htmlFor={this.id} style={{fontSize: 14}}>{t(`${this.props.item.key}.label`)}</label>

                        <select id={this.id} onChange={this.onChanged.bind(this)} value={this.state.current || ''}>
                            {this.props.item.options.choices.map((choice) => {
                                return <option key={choice.key} value={choice.key}>{choice.label}</option>;
                            })}
                        </select>

                        {this.props.item && i18n.exists(this.props.item.key + '.summary') &&
                            <div className="summary" style={{color: '#999', fontSize: 14}}>
                                {t(this.props.item.key + '.summary')}
                            </div>
                        }
                    </div>
                )}
            </I18n>
        );
    }
}
