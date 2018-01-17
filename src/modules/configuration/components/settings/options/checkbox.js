import IsNil from 'lodash-es/isNil';
import React from 'react';

import {OptionComponent} from 'neon-extension-framework/services/configuration/components';


export default class CheckboxComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            checked: false
        };
    }

    get id() {
        if(IsNil(this.props.item)) {
            return null;
        }

        return this.props.item.id;
    }

    get preferences() {
        if(IsNil(this.props.item)) {
            return null;
        }

        return this.props.item.preferences;
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
        // Retrieve option state
        props.item.preferences.getBoolean(props.item.name).then((checked) => {
            this.setState({
                id: props.item.id,

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
            <div data-component="neon-extension-core:settings.options.checkbox" className="option option-checkbox">
                <input
                    id={this.id}
                    type="checkbox"
                    checked={this.state.checked}
                    onChange={this.onChanged.bind(this)}
                />

                <label htmlFor={this.id} style={{fontSize: 14}}>{this.props.item && this.props.item.label}</label>

                {this.props.item && this.props.item.options.summary &&
                    <div className="summary" style={{color: '#999', fontSize: 14}}>
                        {this.props.item.options.summary}
                    </div>
                }
            </div>
        );
    }
}

CheckboxComponent.defaultProps = {
    item: null
};
