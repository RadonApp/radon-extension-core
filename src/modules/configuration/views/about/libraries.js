import IsNil from 'lodash-es/isNil';
import React from 'react';

import './libraries.scss';


export default class Libraries extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            libraries: []
        };
    }

    componentDidMount() {
        // Fetch libraries
        fetch('/libraries.json')
            .then((response) => response.json())
            .then((libraries) => this.setState({ libraries }));
    }

    getLabelIcon(name) {
        if(name === 'credit') {
            return 'fi-torso';
        }

        throw new Error('Unknown label: ' + name);
    }

    render() {
        return (
            <div data-view="neon-extension-core:libraries">
                <h4>Libraries</h4>

                <div className="libraries">
                    {this.state.libraries.map((library) =>
                        <div className="library card">
                            <h5 title={library.name}>{library.name}</h5>

                            <div className="library-labels">
                                {this.renderLabel('credit', library.credits && library.credits.length)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    renderLabel(name, count) {
        if(IsNil(name)) {
            return null;
        }

        if(IsNil(count) || count < 1) {
            return null;
        }

        // Build tooltip
        let tooltip = count + ' ' + name;

        if(count !== 1) {
            tooltip += 's';
        }

        return (
            <span className="label secondary" title={tooltip}>
                <i className={this.getLabelIcon(name)}/>{count}
            </span>
        );
    }
}
