import {OptionComponent} from 'eon.extension.framework/services/configuration/components';
import {Model, PluginOption} from 'eon.extension.framework/services/configuration/models';

import React from 'react';

import {Options} from './options';
import './group.scss';


export default class Group extends React.Component {
    shouldComponentUpdate(nextProps) {
        console.timeStamp('Group.shouldComponentUpdate()');

        if(nextProps.children.length !== this.props.children.length) {
            return true;
        }

        for(var i = 0; i < nextProps.children.length; ++i) {
            if(nextProps.children[i].id !== this.props.children[i].id) {
                return true;
            }
        }

        return false;}

    render() {
        console.timeStamp('Group.render()');

        if(this.props.children && !(this.props.children instanceof Array)) {
            console.warn('Invalid options definition: %O', this.props.children);
            return (
                <div>Invalid plugin options definition</div>
            );
        }

        // Try retrieve `EnableOption` from children
        var enable = this._findEnableOption(this.props.children);

        // Render flat group (if no title has been defined)
        if(this.props.type === 'flat') {
            return (
                <div data-component="eon.extension.core:group" className="group group-flat row">
                    <div className="header columns">
                        <div className="header-inner large-8 row">
                            <div className="header-title small-10 columns">
                                <h3>{this.props.title || 'Unknown Title'}</h3>
                            </div>
                            {enable && <div className="header-option small-2 columns" style={{textAlign: 'right'}}>
                                {this.renderItem(enable)}
                            </div>}
                        </div>
                    </div>
                    <div className="content columns">
                        <div className="children large-8 row">
                            {this.props.children.map((item) => {
                                if(item.type === 'enable') {
                                    return null;
                                }

                                return this.renderItem(item);
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        // Render boxed group
        return (
            <div data-component="eon.extension.core:settings.group" className="box group group-box row">
                <div className="header columns">
                    <div className="header-inner row">
                        <div className="header-title small-10 columns">
                            <h3>{this.props.title || 'Unknown Title'}</h3>
                        </div>
                        {enable && <div className="header-option small-2 columns" style={{textAlign: 'right'}}>
                            {this.renderItem(enable)}
                        </div>}
                    </div>
                </div>
                <div className="content columns">
                    <div className="children row">
                        {this.props.children.map((item) => {
                            if(item.type === 'enable') {
                                return null;
                            }

                            return this.renderItem(item);
                        })}
                    </div>
                </div>
            </div>
        );
    }

    renderItem(item) {
        if(!(item instanceof Model)) {
            console.warn('Ignoring invalid option: %O', item);
            return null;
        }

        if(item.type === 'group') {
            return <Group
                key={item.key}
                title={item.title}
                children={item.children}
            />;
        }

        // Try retrieve option component
        var Component;

        if(item instanceof PluginOption) {
            Component = item.options.component;
        } else {
            Component = Options[item.type];
        }

        // Verify component has been found
        if(typeof Component === 'undefined' || Component === null) {
            console.warn('Unable to find option component for: %o', item.type);
            return null;
        }

        if(!(Component.prototype instanceof OptionComponent)) {
            console.warn('Unsupported option component: %O', Component);
            return null;
        }

        // Render option component
        return <Component
            key={item.key}
            id={item.id}
            label={item.label}
            summary={item.options.summary}
        />;
    }

    _findEnableOption(children) {
        for(var i = 0; i < children.length; ++i) {
            var item = children[i];

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
