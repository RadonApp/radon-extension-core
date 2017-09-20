import React from 'react';

import Preferences from 'eon.extension.framework/preferences';
import {OptionComponent} from 'eon.extension.framework/services/configuration/components';


export default class SelectComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            current: null
        };
    }

    componentWillMount() {
        this.refresh(this.props.id);
    }

    componentWillReceiveProps(nextProps) {
        this.refresh(nextProps.id);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextProps.id !== this.state.id) {
            return true;
        }

        if(nextState.current !== this.state.current) {
            return true;
        }

        return false;
    }

    refresh(id) {
        // Retrieve option state
        Preferences.getString(id).then((current) => {
            this.setState({
                id: id,
                current: current
            });
        });
    }

    onChanged(event) {
        let current = event.target.value;

        // Update option state
        Preferences.putString(this.props.id, current).then(() => {
            this.setState({
                current: current
            });
        });
    }

    render() {
        return (
            <div data-component="eon.extension.core:settings.options.select" className="option option-select">
                <label htmlFor={this.props.id} style={{fontSize: 14}}>{this.props.label}</label>

                <select id={this.props.id} onChange={this.onChanged.bind(this)} value={this.state.current || ''}>
                    {this.props.options.choices.map((choice) => {
                        return <option key={choice.key} value={choice.key}>{choice.label}</option>;
                    })}
                </select>

                {this.props.options.summary && <div className="summary" style={{color: '#999', fontSize: 14}}>
                    {this.props.options.summary}
                </div>}
            </div>
        );
    }
}

SelectComponent.defaultProps = {
    id: null,
    label: null,

    options: {
        choices: [],
        summary: null
    }
};
