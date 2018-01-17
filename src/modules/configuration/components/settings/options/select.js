import IsNil from 'lodash-es/isNil';
import React from 'react';

import {OptionComponent} from 'neon-extension-framework/services/configuration/components';


export default class SelectComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
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
        // Retrieve option state
        props.item.preferences.getString(props.item.name).then((current) => {
            this.setState({
                id: props.item.id,

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

    render() {
        return (
            <div data-component="neon-extension-core:settings.options.select" className="option option-select">
                <label htmlFor={this.id} style={{fontSize: 14}}>{this.props.item.label}</label>

                <select id={this.id} onChange={this.onChanged.bind(this)} value={this.state.current || ''}>
                    {this.props.item.options.choices.map((choice) => {
                        return <option key={choice.key} value={choice.key}>{choice.label}</option>;
                    })}
                </select>

                {this.props.item && this.props.item.options.summary &&
                    <div className="summary" style={{color: '#999', fontSize: 14}}>
                        {this.props.item.options.summary}
                    </div>
                }
            </div>
        );
    }
}
