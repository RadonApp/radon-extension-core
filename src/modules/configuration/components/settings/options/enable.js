import {Preferences} from 'eon.extension.browser';

import {OptionComponent} from 'eon.extension.framework/services/configuration/components';

import React from 'react';


export default class EnableComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            enabled: false
        };
    }

    componentWillMount() {
        console.timeStamp('EnableComponent.componentWillMount()');
        this.refresh(this.props.id);
    }

    componentWillReceiveProps(nextProps) {
        console.timeStamp('EnableComponent.componentWillReceiveProps()');
        this.refresh(nextProps.id);
    }

    shouldComponentUpdate(nextProps, nextState) {
        console.timeStamp('EnableComponent.shouldComponentUpdate()');

        if(nextProps.id !== this.state.id) {
            return true;
        }

        if(nextState.enabled !== this.state.enabled) {
            return true;
        }

        return false;
    }

    refresh(id) {
        // Retrieve option state
        Preferences.getBoolean(id).then((enabled) => {
            console.debug('[%s] enabled: %o', id, enabled);

            this.setState({
                id: id,
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
        console.timeStamp('EnableComponent.render()');

        return (
            <div data-component="eon.extension.core:settings.options.enable" className="switch tiny">
                <input
                    className="switch-input"
                    id={this.props.id}
                    type="checkbox"
                    checked={this.state.enabled}
                    onChange={this.onChanged.bind(this)}
                />

                <label className="switch-paddle" htmlFor={this.props.id}>
                    {this.props.options.summary && <span className="show-for-sr">
                        {this.props.options.summary}
                    </span>}
                </label>
            </div>
        );
    }
}

EnableComponent.defaultProps = {
    id: null,
    label: null,

    options: {
        summary: null,
    }
};
