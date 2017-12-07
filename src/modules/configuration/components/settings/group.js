import ClassNames from 'classnames';
import IsNil from 'lodash-es/isNil';
import React from 'react';

import Log from 'neon-extension-core/core/logger';
import Registry from 'neon-extension-framework/core/registry';
import {Model, EnableOption, PluginOption} from 'neon-extension-framework/services/configuration/models';
import {OptionComponent} from 'neon-extension-framework/services/configuration/components';

import Options from './options';
import './group.scss';


export default class Group extends React.Component {
    constructor() {
        super();

        this.state = {
            enabled: true,
            options: [],

            header: {
                option: null
            }
        };

        this._currentRefreshId = 0;
    }

    componentWillMount() {
        this.refresh(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.refresh(nextProps);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextState.enabled !== this.state.enabled) {
            return true;
        }

        if(nextState.option !== this.state.header.option) {
            return true;
        }

        if(nextProps.children.length !== this.props.children.length) {
            return true;
        }

        for(let i = 0; i < nextProps.children.length; ++i) {
            if(nextProps.children[i].id !== this.props.children[i].id) {
                return true;
            }
        }

        return false;
    }

    refresh(props) {
        let id = ++this._currentRefreshId;

        // Update options
        this.setState({
            options: props.children.filter(
                (option) => option.type !== 'enable'
            )
        });

        // Refresh header option
        return this.refreshHeaderOption(id, props);
    }

    refreshHeaderOption(id, props) {
        let option = this._getHeaderOption(props.children);

        if(IsNil(option)) {
            this.setState({
                enabled: true,

                header: {
                    option: null
                }
            });

            return true;
        }

        // Process header enable/disable option
        if(option instanceof EnableOption) {
            return option.isEnabled().then((enabled) => {
                if(this._currentRefreshId !== id) {
                    return false;
                }

                this.setState({
                    enabled: enabled,

                    header: {
                        option: option
                    }
                });

                return true;
            });
        }

        // Update state
        this.setState({
            enabled: true,

            header: {
                option: null
            }
        });

        // Return promise rejection
        return Promise.reject(new Error(
            'Unknown header option: ' + option
        ));
    }

    onEnableChanged(enabled) {
        this.setState({
            enabled: enabled
        });
    }

    render() {
        let type = this.props.type;

        return (
            <div data-component="neon-extension-core:settings.group" className={ClassNames('group', {
                'row': type !== 'flat',
                'box': type !== 'flat',
                'group-box': type !== 'flat',
                'group-flat': type === 'flat',
                'enabled': this.state.enabled
            })}>
                <div className="header columns">
                    <div className={ClassNames('header-inner', 'row', {
                        'large-8': type === 'flat'
                    })}>
                        <div className="header-title small-10 columns">
                            <h3>{this.props.title || 'Unknown Title'}</h3>
                        </div>
                        {this.state.header.option && <div className="header-option small-2 columns" style={{
                            textAlign: 'right'
                        }}>
                            {this.renderItem(
                                this.state.header.option,

                                // Bind to change event
                                this.state.header.option instanceof EnableOption ?
                                    this.onEnableChanged.bind(this) :
                                    null
                            )}
                        </div>}
                    </div>
                </div>
                {this.state.options.length > 0 && <div className="content columns">
                    <div className={ClassNames('children', 'row', {
                        'large-8': type === 'flat'
                    })}>
                        {this.state.options.map((item) => {
                            if(item.type === 'enable') {
                                return null;
                            }

                            return this.renderItem(item);
                        })}
                    </div>

                    <div className="overlay"/>
                </div>}
            </div>
        );
    }

    renderItem(item, onChanged) {
        if(!(item instanceof Model)) {
            Log.warn('Ignoring invalid option: %O', item);
            return null;
        }

        if(typeof onChanged === 'undefined') {
            onChanged = null;
        }

        if(item.type === 'group') {
            return <Group
                key={item.key}
                title={item.title}
                children={item.children}
            />;
        }

        // Try retrieve option component
        let Component;

        if(item instanceof PluginOption && !IsNil(item.options.componentId)) {
            Component = Registry.components[item.options.componentId];
        } else {
            Component = Options[item.type];
        }

        // Verify component has been found
        if(typeof Component === 'undefined' || Component === null) {
            Log.warn('Unable to find option component for: %o', item.type);
            return null;
        }

        if(!(Component.prototype instanceof OptionComponent)) {
            Log.warn('Unsupported option component: %O', Component);
            return null;
        }

        // Render option component
        return <Component
            key={item.key}
            id={item.id}
            label={item.label}
            plugin={item.plugin}
            options={item.options}
            onChange={onChanged}
        />;
    }

    _getHeaderOption(children) {
        for(let i = 0; i < children.length; ++i) {
            let item = children[i];

            if(item.type === 'enable') {
                return item;
            }
        }

        return null;
    }
}

Group.defaultProps = {
    title: null,
    children: []
};
