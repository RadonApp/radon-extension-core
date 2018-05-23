import ClassNames from 'classnames';
import IsNil from 'lodash-es/isNil';
import React from 'react';

import Log from 'neon-extension-core/Core/Logger';
import PageHeader from 'neon-extension-framework/Components/Page/Header';
import Registry from 'neon-extension-framework/Core/Registry';
import TranslationNamespace from 'neon-extension-framework/Components/Translation/Namespace';
import {Model, Options} from 'neon-extension-framework/Models/Configuration';
import {OptionComponent} from 'neon-extension-framework/Components/Configuration';

import OptionComponents from './Options';
import './ConfigurationGroup.scss';


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

        if(!(this.state.headerOption instanceof Options.EnableOption)) {
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
            <TranslationNamespace ns={this.state.namespaces}>
                {(t) => (
                    <div data-component="neon-extension-core:settings.group"
                        className={ClassNames('group group-box box row', {'enabled': this.state.enabled})}>
                        <PageHeader title={t(`${this.props.item.key}.title`)}>
                            {this.state.headerOption &&
                                <div className="PageHeader-option small-2 columns" style={{ textAlign: 'right' }}>
                                    {this.state.headerOption.type === 'enable' &&
                                        Group.renderItem(this.state.headerOption, this.onEnableChanged.bind(this))
                                    }
                                </div>
                            }
                        </PageHeader>

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
            </TranslationNamespace>
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

        if(item instanceof Options.PluginOption && !IsNil(item.options.componentId)) {
            Component = Registry.components[item.options.componentId];
        } else {
            Component = OptionComponents[item.type];
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
