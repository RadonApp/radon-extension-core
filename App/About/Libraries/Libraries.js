import IsNil from 'lodash-es/isNil';
import React from 'react';
import {translate} from 'react-i18next';

import PageHeader from '@radon-extension/framework/Components/Page/Header';

import './Libraries.scss';


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
        fetch('/Resources/credits.json')
            .then((response) => response.json())
            .then((credits) => this.setState({ credits }));
    }

    getLabelIcon(name) {
        if(name === 'credit') {
            return 'fi-torso';
        }

        throw new Error('Unknown label: ' + name);
    }

    getLabelTooltip(name, count) {
        return this.props.t(`label.${name}.tooltip`, { count });
    }

    render() {
        const { t } = this.props;

        // Update page title
        document.title = `${t('title')} - ${t('neon-extension/common:title')}`;

        // Render libraries page
        return (
            <div id="container" className="expanded row">
                <PageHeader title={t('title')}/>

                <div data-view="neon-extension-core:libraries" className="row">
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

        // Render label
        return (
            <span className="label secondary" title={this.getLabelTooltip(name, count)}>
                <i className={this.getLabelIcon(name)}/>{this.props.t(`label.${name}.body`, { count })}
            </span>
        );
    }
}

export default translate([
    'neon-extension/libraries',
    'neon-extension/common'
], { wait: true })(Libraries);
