import IsNil from 'lodash-es/isNil';
import React from 'react';
import {translate} from 'react-i18next';

import './libraries.scss';


class Libraries extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            credits: {
                libraries: []
            }
        };
    }

    componentDidMount() {
        // Fetch libraries
        fetch('/credits.json')
            .then((response) => response.json())
            .then((credits) => this.setState({ credits }));
    }

    getLabelIcon(name) {
        if(name === 'credit') {
            return 'fi-torso';
        }

        throw new Error('Unknown label: ' + name);
    }

    render() {
        const { t } = this.props;

        return (
            <div data-view="neon-extension-core:libraries">
                <h4>{t('title')}</h4>

                <div className="libraries">
                    {this.state.credits.libraries.map((library) =>
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
        const { t } = this.props;

        if(IsNil(name)) {
            return null;
        }

        if(IsNil(count) || count < 1) {
            return null;
        }

        // Build tooltip
        let tooltip;

        if(name === 'credit') {
            tooltip = t('creditLabelTooltip', { count });
        }

        return (
            <span className="label secondary" title={tooltip}>
                <i className={this.getLabelIcon(name)}/>{count}
            </span>
        );
    }
}

export default translate([
    'neon-extension/libraries',
    'neon-extension/common'
], { wait: true })(Libraries);
