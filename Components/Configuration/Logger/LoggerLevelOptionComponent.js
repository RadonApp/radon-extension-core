import CloneDeep from 'lodash-es/cloneDeep';
import IsNil from 'lodash-es/isNil';
import Map from 'lodash-es/map';
import React from 'react';
import Reduce from 'lodash-es/reduce';

import Plugin from '@radon-extension/framework/Core/Plugin';
import Registry from '@radon-extension/framework/Core/Registry';
import TranslationNamespace from '@radon-extension/framework/Components/Translation/Namespace';
import {OptionComponent} from '@radon-extension/framework/Components/Configuration';

import './LoggerLevelOptionComponent.scss';


export const Levels = [
    'error',
    'warning',
    'notice',
    'info',
    'debug',
    'trace'
];

export const DefaultState = {
    levels: {
        [null]: 'warning'
    },
    mode: 'basic'
};

export default class LoggerLevelOptionComponent extends OptionComponent {
    constructor() {
        super();

        this.state = {
            id: null,
            type: null,

            namespaces: [],

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

    getToggleMode() {
        return this.state.current.mode === 'basic' ? 'advanced' : 'basic';
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
        this.setState({
            id: props.item.id,

            namespaces: [
                this.props.item.namespace,
                this.props.item.plugin.namespace
            ]
        });

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

    renderDropdown(t, plugin = null) {
        let pluginId = plugin && plugin.id;

        return (
            <select value={this.state.current.levels[pluginId] || ''} onChange={this.onChanged.bind(this, plugin)}>
                {Levels.map((key) => {
                    return (
                        <option key={key} value={key}>
                            {t(`${this.props.item.key}.levels.${key}`)}
                        </option>
                    );
                })}
            </select>
        );
    }

    render() {
        return (
            <TranslationNamespace ns={this.state.namespaces}>
                {(t) => (
                    <div data-component={Plugin.id + ':logger.level'} className="option option-input">
                        <label htmlFor={this.id} style={{fontSize: 14}}>
                            <span>{t(`${this.props.item.key}.label`)}</span>

                            <a className="mode"
                                title={t(`${this.props.item.key}.mode.tooltip.${this.getToggleMode()}`)}
                                onClick={this.setMode.bind(this, null)}>

                                {this.state.current.mode === 'basic' && <span>
                                    {t(`${this.props.item.key}.mode.label.basic`)}
                                </span>}

                                {this.state.current.mode === 'advanced' && <span>
                                    {t(`${this.props.item.key}.mode.label.advanced`)}
                                </span>}

                            </a>
                        </label>

                        {this.state.current.mode === 'basic' && this.renderDropdown(t)}

                        {this.state.current.mode === 'advanced' && <table className="loggers">
                            <tbody>
                                {Map(this.state.plugins, (plugin) => {
                                    return (
                                        <tr>
                                            <td>
                                                <TranslationNamespace ns={plugin.namespace}>
                                                    {(t) => <span>{t('title')}</span>}
                                                </TranslationNamespace>
                                            </td>
                                            <td>{this.renderDropdown(t, plugin)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>}
                    </div>
                )}
            </TranslationNamespace>
        );
    }
}

LoggerLevelOptionComponent.componentId = Plugin.id + ':services.configuration:logger.level';

// Register option component
Registry.registerComponent(LoggerLevelOptionComponent);
