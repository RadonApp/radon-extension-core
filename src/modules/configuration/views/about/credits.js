import ClassNames from 'classnames';
import IsNil from 'lodash-es/isNil';
import MD5 from 'crypto-js/md5';
import React from 'react';
import {translate} from 'react-i18next';

import './credits.scss';


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
        fetch('/credits.json')
            .then((response) => response.json())
            .then((credits) => this.setState({ credits }));
    }

    getTypeBadgeIcon(type) {
        if(type === 'lead') {
            return 'fi-sheriff-badge';
        }

        if(type === 'contributor') {
            return 'fi-torso';
        }

        throw new Error('Unknown type badge: ' + type);
    }

    getTypeBadgeTitle(type) {
        const { t } = this.props;

        if(type === 'lead') {
            return t('leadBadgeTooltip');
        }

        if(type === 'contributor') {
            return t('contributorBadgeTooltip');
        }

        throw new Error('Unknown type badge: ' + type);
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

    render() {
        const { t } = this.props;

        return (
            <div data-view="neon-extension-core:credits">
                <h4>{t('title')}</h4>

                <div className="credits">
                    {this.state.credits.people.map((person) =>
                        <div className="credit card">
                            {person.email && <img
                                src={'https://www.gravatar.com/avatar/' + MD5(person.email.trim()) + '?s=512'}
                            />}

                            <div className="credit-section">
                                <div className="credit-header">
                                    <div className="credit-badges">
                                        {this.renderTypeBadge(person.type)}
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

        // Pick label style
        let style = name === 'commit' ? 'primary' : 'secondary';

        // Build tooltip
        let tooltip;

        if(name === 'package') {
            tooltip = t('packageLabelTooltip', { count });
        } else if(name === 'module') {
            tooltip = t('moduleLabelTooltip', { count });
        } else if(name === 'commit') {
            tooltip = t('commitLabelTooltip', { count });
        }

        // Render label
        return (
            <span className={ClassNames('label', style)} title={tooltip}>
                <i className={this.getLabelIcon(name)}/>{count}
            </span>
        );
    }

    renderTypeBadge(type) {
        if(IsNil(type)) {
            return null;
        }

        return (
            <span className={ClassNames('badge', 'badge-' + type)} title={this.getTypeBadgeTitle(type)}>
                <i className={this.getTypeBadgeIcon(type)}/>
            </span>
        );
    }
}

export default translate([
    'neon-extension/credits',
    'neon-extension/common'
], { wait: true })(Credits);
