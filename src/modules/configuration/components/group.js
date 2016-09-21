import Model from 'eon.extension.framework/services/configuration/models/base';

import {Options} from './options';

import React from 'react';


export default class Group extends React.Component {
    render() {
        if(this.props.children && !(this.props.children instanceof Array)) {
            console.warn('Invalid options definition: %O', this.props.children);
            return (
                <div>Invalid plugin options definition</div>
            );
        }

        if(!this.props.title) {
            return (
                <div className="group group-flat">
                    {this.props.children.map((item) => {
                        return this.renderItem(item);
                    })}
                </div>
            );
        }

        return (
            <div className="group">
                <h3>{this.props.title || 'Unknown Title'}</h3>
                <div className="inner">
                    {this.props.children.map((item) => {
                        return this.renderItem(item);
                    })}
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
            return <Group key={item.key} title={item.title} children={item.children}/>;
        }

        return (
            <div key={item.key}>
                {item.label}
            </div>
        );
    }
}

Group.defaultProps = {
    title: null,
    children: []
};

