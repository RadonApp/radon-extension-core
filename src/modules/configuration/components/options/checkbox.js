import {Preferences} from 'eon.extension.browser';

import {OptionComponent} from 'eon.extension.framework/services/configuration/components';

import React from 'react';


export default class CheckboxComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            checked: false
        };
    }

    componentWillMount() {
        // Retrieve option state
        Preferences.getBoolean(this.props.id).then((checked) => {
            console.debug('[%s] checked: %o', this.props.id, checked);

            this.setState({
                checked: checked
            });
        });
    }

    onChanged(event) {
        var checked = event.target.checked;

        // Update option state
        Preferences.putBoolean(this.props.id, checked).then(() => {
            console.debug('[%s] checked: %o', this.props.id, checked);

            this.setState({
                checked: checked
            });
        });
    }

    render() {
        return (
            <div className="option option-checkbox large-8">
                <input
                    id={this.props.id}
                    type="checkbox"
                    checked={this.state.checked}
                    onChange={this.onChanged.bind(this)}
                />

                <label htmlFor={this.props.id} style={{fontSize: 14}}>{this.props.label}</label>

                {this.props.summary && <div className="summary" style={{color: '#999', fontSize: 14}}>
                    {this.props.summary}
                </div>}
            </div>
        );
    }
}
