import Model from 'eon.extension.framework/services/configuration/models/base';

import {Options} from './options';

import React from 'react';

import './group.scss';


export default class Group extends React.Component {
    render() {
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
                <div className="group group-flat row">
                    <div className="header columns">
                        <div className="header-inner large-8 row">
                            <div className="header-title large-6 columns">
                                <h3>{this.props.title || 'Unknown Title'}</h3>
                            </div>
                            {enable && <div className="header-option large-6 columns" style={{textAlign: 'right'}}>
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
            <div className="group group-box row">
                <div className="header columns">
                    <div className="header-inner row">
                        <div className="header-title large-6 columns">
                            <h3>{this.props.title || 'Unknown Title'}</h3>
                        </div>
                        {enable && <div className="header-option large-6 columns" style={{textAlign: 'right'}}>
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

        console.debug('Rendering item: %O', item);

        if(item.type === 'group') {
            return <Group
                key={item.key}
                title={item.title}
                children={item.children}
            />;
        }

        // Find matching option component
        var Option = Options[item.type];

        if(typeof Option === 'undefined') {
            console.warn('Unknown option type: %o', item.type);
            return null;
        }

        return <Option
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
