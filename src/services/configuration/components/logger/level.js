import CloneDeep from 'lodash-es/cloneDeep';
import IsNil from 'lodash-es/isNil';
import Map from 'lodash-es/map';
import React from 'react';
import Reduce from 'lodash-es/reduce';

import Registry from 'neon-extension-framework/core/registry';
import {OptionComponent} from 'neon-extension-framework/services/configuration/components';

import Plugin from '../../../../core/plugin';
import './level.scss';


export const Levels = [
    {key: 'error', label: 'Error'},
    {key: 'warning', label: 'Warning'},
    {key: 'notice', label: 'Notice'},
    {key: 'info', label: 'Info'},
    {key: 'debug', label: 'Debug'},
    {key: 'trace', label: 'Trace'}
];

export const DefaultState = {
    levels: {
        [null]: 'warning'
    },
    mode: 'basic'
};

export default class LoggerLevelComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            type: null,

            current: CloneDeep(DefaultState),
            valid: true,

            plugins: []
        };
    }

    componentWillMount() {
        this.refresh(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.refresh(nextProps);
    }

    getModeTooltip() {
        return `Switch to ${this.state.current.mode === 'basic' ? 'advanced' : 'basic'} mode`;
    }

    onChanged(plugin, event) {
        let current = event.target.value;

        // Update level
        this.setLevel(plugin, current);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(!IsNil(nextProps.item) && nextProps.item.id !== this.state.id) {
            return true;
        }

        if(nextState.current !== this.state.current) {
            return true;
        }

        if(nextState.plugins.length !== this.state.plugins.length) {
            return true;
        }

        return false;
    }

    refresh(props) {
        // Retrieve plugins
        Registry.listPlugins({ disabled: true }).then((plugins) => {
            this.setState({ plugins });
        });

        // Retrieve current value
        props.item.get().then((current) => {
            // Reset current value if it's invalid
            if(!this.props.item.isValid(current)) {
                current = CloneDeep(DefaultState);
            }

            // Update state
            this.setState({
                id: props.item.id,

                valid: true,
                current
            });
        });
    }

    setLevel(plugin, level) {
        let current = {
            ...this.state.current,

            levels: {
                ...this.state.current.levels,

                // Update level for `plugin`
                [plugin && plugin.id]: level
            }
        };

        // Update state
        this.preferences.putObject(this.props.item.name, current).then(() => {
            this.setState({ current });
        });
    }

    setMode(mode = null) {
        if(IsNil(mode)) {
            mode = this.state.current.mode === 'advanced' ? 'basic' : 'advanced';
        }

        // Build new state
        let current;

        if(mode === 'advanced') {
            current = {
                levels: Reduce(this.state.plugins, (levels, plugin) => {
                    levels[plugin.id] = this.state.current.levels[null] || 'warning';
                    return levels;
                }, {}),

                mode
            };
        } else {
            current = {
                levels: {
                    [null]: this.state.current.levels['neon-extension'] || 'warning'
                },

                mode
            };
        }

        // Update state
        this.preferences.putObject(this.props.item.name, current).then(() => {
            this.setState({ current });
        });
    }

    renderDropdown(plugin = null) {
        return (
            <select value={this.state.current.levels[plugin && plugin.id] || ''}
                onChange={this.onChanged.bind(this, plugin)}>
                {Levels.map((choice) => {
                    return <option key={choice.key} value={choice.key}>{choice.label}</option>;
                })}
            </select>
        );
    }

    render() {
        return (
            <div data-component={Plugin.id + ':logger.level'} className="option option-input">
                <label htmlFor={this.id} style={{fontSize: 14}}>
                    <span>Log Level</span>

                    <a className="mode" title={this.getModeTooltip()} onClick={this.setMode.bind(this, null)}>
                        {this.state.current.mode === 'basic' && <span>Basic</span>}
                        {this.state.current.mode === 'advanced' && <span>Advanced</span>}
                    </a>
                </label>

                {this.state.current.mode === 'basic' && this.renderDropdown()}

                {this.state.current.mode === 'advanced' && <table className="loggers">
                    <tbody>
                        {Map(this.state.plugins, (plugin) => {
                            return (
                                <tr>
                                    <td>{plugin.title}</td>
                                    <td>{this.renderDropdown(plugin)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>}
            </div>
        );
    }
}

LoggerLevelComponent.componentId = Plugin.id + ':services.configuration:logger.level';

// Register option component
Registry.registerComponent(LoggerLevelComponent);
