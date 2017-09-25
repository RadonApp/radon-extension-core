import React from 'react';

import Preferences from 'neon-extension-framework/preferences';
import {OptionComponent} from 'neon-extension-framework/services/configuration/components';


export default class CheckboxComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            checked: false
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

        if(nextState.checked !== this.state.checked) {
            return true;
        }

        return false;
    }

    refresh(id) {
        // Retrieve option state
        Preferences.getBoolean(id).then((checked) => {
            this.setState({
                id: id,
                checked: checked
            });
        });
    }

    onChanged(event) {
        var checked = event.target.checked;

        // Update option state
        Preferences.putBoolean(this.props.id, checked).then(() => {
            this.setState({
                checked: checked
            });
        });
    }

    render() {
        return (
            <div data-component="neon-extension-core:settings.options.checkbox" className="option option-checkbox">
                <input
                    id={this.props.id}
                    type="checkbox"
                    checked={this.state.checked}
                    onChange={this.onChanged.bind(this)}
                />

                <label htmlFor={this.props.id} style={{fontSize: 14}}>{this.props.label}</label>

                {this.props.options.summary && <div className="summary" style={{color: '#999', fontSize: 14}}>
                    {this.props.options.summary}
                </div>}
            </div>
        );
    }
}

CheckboxComponent.defaultProps = {
    id: null,
    label: null,

    options: {
        summary: null
    }
};
