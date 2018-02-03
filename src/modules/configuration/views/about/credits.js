import ClassNames from 'classnames';
import IsNil from 'lodash-es/isNil';
import MD5 from 'crypto-js/md5';
import React from 'react';

import './credits.scss';


export default class Credits extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            credits: []
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
        if(type === 'lead') {
            return 'Project Lead';
        }

        if(type === 'contributor') {
            return 'Contributor';
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
        return (
            <div data-view="neon-extension-core:credits">
                <h4>Credits</h4>

                <div className="credits">
                    {this.state.credits.map((credit) =>
                        <div className="credit card">
                            {credit.email && <img
                                src={'https://www.gravatar.com/avatar/' + MD5(credit.email.trim()) + '?s=512'}
                            />}

                            <div className="credit-section">
                                <div className="credit-header">
                                    <div className="credit-badges">
                                        {this.renderTypeBadge(credit.type)}
                                    </div>

                                    <h5 title={credit.name}>
                                        {credit.name}
                                    </h5>
                                </div>

                                <div className="credit-body"/>

                                <div className="credit-footer">
                                    <div className="credit-labels">
                                        {this.renderLabel('package', credit.packages && credit.packages.length)}
                                        {this.renderLabel('module', credit.modules && credit.modules.length)}
                                        {this.renderLabel('commit', credit.commits)}
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
        if(IsNil(name)) {
            return null;
        }

        if(IsNil(count) || count < 1) {
            return null;
        }

        // Pick label style
        let style = name === 'commit' ? 'primary' : 'secondary';

        // Build tooltip
        let tooltip = count + ' ' + name;

        if(count !== 1) {
            tooltip += 's';
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
            <span className={ClassNames('badge', 'badge-' + type)}
                  title={this.getTypeBadgeTitle(type)}>
                <i className={this.getTypeBadgeIcon(type)}/>
            </span>
        );
    }
}
