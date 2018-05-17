import ClassNames from 'classnames';
import IsNil from 'lodash-es/isNil';
import React from 'react';

import Log from 'neon-extension-core/core/logger';
import Registry from 'neon-extension-framework/core/registry';
import {Model, EnableOption, PluginOption} from 'neon-extension-framework/services/configuration/models';
import {OptionComponent} from 'neon-extension-framework/services/configuration/components';

import I18n from '../I18n';
import Options from './options';
import './group.scss';


export default class Group extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            enabled: true,

            headerOption: null,

            namespaces: []
        };
    }

    componentWillMount() {
        this.refresh(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.refresh(nextProps);
    }

    onEnableChanged(enabled) {
        this.setState({
            enabled: enabled
        });
    }

    refresh(props) {
        // Update state
        this.setState({
            enabled: true,

            headerOption: this._getHeaderOption(props.item.children),

            namespaces: [
                props.item.namespace,
                props.item.plugin.namespace
            ]
        });

        // Refresh enable option
        this.refreshEnableOption();
    }

    refreshEnableOption() {
        if(IsNil(this.state.headerOption)) {
            return;
        }

        if(!(this.state.headerOption instanceof EnableOption)) {
            return;
        }

        // Fetch current state
        this.state.headerOption.isEnabled().then((enabled) => {
            // Update state
            this.setState({
                enabled
            });
        });
    }

    render() {
        return (
            <I18n ns={this.state.namespaces}>
                {(t) => (
                    <div data-component="neon-extension-core:settings.group"
                        className={ClassNames('group group-box box row', {'enabled': this.state.enabled})}>
                        <div className="header columns">
                            <div className={ClassNames('header-inner', 'row')}>
                                <div className="header-title small-10 columns">
                                    <h3>{t(`${this.props.item.key}.title`)}</h3>
                                </div>

                                {this.state.headerOption &&
                                    <div className="header-option small-2 columns" style={{ textAlign: 'right' }}>
                                        {this.state.headerOption.type === 'enable' &&
                                            Group.renderItem(this.state.headerOption, this.onEnableChanged.bind(this))
                                        }
                                    </div>
                                }
                            </div>
                        </div>

                        {this.props.item.children.length > 0 && <div className="content columns">
                            <div className={ClassNames('children', 'row')}>
                                {this.props.item.children.map((item) => {
                                    if(item.type === 'enable') {
                                        return null;
                                    }

                                    return Group.renderItem(item);
                                })}
                            </div>

                            <div className="overlay"/>
                        </div>}
                    </div>
                )}
            </I18n>
        );
    }

    static renderItem(item, onChanged) {
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
                item={item}
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
            key={item.id}
            item={item}

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
    item: {}
};
