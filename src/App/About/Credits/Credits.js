import ClassNames from 'classnames';
import IsNil from 'lodash-es/isNil';
import MD5 from 'crypto-js/md5';
import React from 'react';
import {translate} from 'react-i18next';

import PageHeader from 'neon-extension-framework/Components/Page/Header';

import './Credits.scss';


class Credits extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            credits: {
                people: []
            }
        };
    }

    componentDidMount() {
        // Fetch credits
        fetch('/Resources/credits.json')
            .then((response) => response.json())
            .then((credits) => this.setState({ credits }));
    }

    getBadgeIcon(type) {
        if(type === 'lead') {
            return 'fi-sheriff-badge';
        }

        if(type === 'contributor') {
            return 'fi-torso';
        }

        throw new Error('Unknown type badge: ' + type);
    }

    getBadgeTooltip(type) {
        return this.props.t(`badge.${type}.tooltip`);
    }

    getLabelIcon(name) {
        if(name === 'package') {
            return 'fi-folder';
        }

        if(name === 'module') {
            return 'fi-puzzle';
        }

        if(name === 'commit') {
            return 'fi-pencil';
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

        // Render credits page
        return (
            <div id="container" className="expanded row">
                <PageHeader title={t('title')}/>

                <div data-view="neon-extension-core:credits">
                    <div className="credits">
                        {this.state.credits.people.map((person) =>
                            <div className="credit card">
                                {person.email && <img
                                    src={'https://www.gravatar.com/avatar/' + MD5(person.email.trim()) + '?s=512'}
                                />}

                                <div className="credit-section">
                                    <div className="credit-header">
                                        <div className="credit-badges">
                                            {this.renderBadge(person.type)}
                                        </div>

                                        <h5 title={person.name}>
                                            {person.name}
                                        </h5>
                                    </div>

                                    <div className="credit-body"/>

                                    <div className="credit-footer">
                                        <div className="credit-labels">
                                            {this.renderLabel('package', person.packages && person.packages.length)}
                                            {this.renderLabel('module', person.modules && person.modules.length)}
                                            {this.renderLabel('commit', person.commits)}
                                        </div>
                                    </div>
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

        // Pick label style
        let style = name === 'commit' ? 'primary' : 'secondary';

        // Render label
        return (
            <span className={ClassNames('label', style)} title={this.getLabelTooltip(name, count)}>
                <i className={this.getLabelIcon(name)}/>{count}
            </span>
        );
    }

    renderBadge(type) {
        if(IsNil(type)) {
            return null;
        }

        // Render badge
        return (
            <span className={ClassNames('badge', 'badge-' + type)} title={this.getBadgeTooltip(type)}>
                <i className={this.getBadgeIcon(type)}/>
            </span>
        );
    }
}

export default translate([
    'neon-extension/credits',
    'neon-extension/common'
], { wait: true })(Credits);
