import {Preferences} from 'eon.extension.browser';

import {OptionComponent} from 'eon.extension.framework/services/configuration/components';

import React from 'react';


export default class EnableComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            enabled: false
        };
    }

    componentWillMount() {
        // Retrieve option state
        Preferences.getBoolean(this.props.id).then((enabled) => {
            console.debug('[%s] enabled: %o', this.props.id, enabled);

            this.setState({
                enabled: enabled
            });
        });
    }

    onChanged(event) {
        var enabled = event.target.checked;

        // Update option state
        Preferences.putBoolean(this.props.id, enabled).then(() => {
            console.debug('[%s] enabled: %o', this.props.id, enabled);

            this.setState({
                enabled: enabled
            });
        });
    }

    render() {
        return (
            <div className="switch tiny">
                <input
                    className="switch-input"
                    id={this.props.id}
                    type="checkbox"
                    checked={this.state.enabled}
                    onChange={this.onChanged.bind(this)}
                />

                <label className="switch-paddle" htmlFor={this.props.id}>
                    {this.props.summary && <span className="show-for-sr">
                        {this.props.summary}
                    </span>}
                </label>
            </div>
        );
    }
}
