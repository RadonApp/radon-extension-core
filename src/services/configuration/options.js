import {
    Group,
    Page,
    SelectOption
} from 'neon-extension-framework/services/configuration/models';

import LoggerLevelOption from './models/logger/level';
import Plugin from '../../core/plugin';


export default [
    new Page(Plugin, 'general', 'General', [
        new Group(Plugin, 'debugging', 'Debugging', [
            new SelectOption(Plugin, 'log_level', 'Log Level', [
                {key: 'error', label: 'Error'},
                {key: 'warning', label: 'Warning'},
                {key: 'notice', label: 'Notice'},
                {key: 'info', label: 'Info'},
                {key: 'debug', label: 'Debug'},
                {key: 'trace', label: 'Trace'}
            ], {
                default: 'warning'
            })
        ])
    ]),
    new Page(Plugin, 'debugging', 'Debugging', [
        new Group(Plugin, 'logging', 'Logging', [
            new LoggerLevelOption(Plugin, 'log_level', 'Log Level')
        ])
    ])
];
