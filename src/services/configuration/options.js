import {
    Group,
    Page,
    SelectOption
} from 'eon.extension.framework/services/configuration/models';

import Plugin from '../../core/plugin';


export default [
    new Page(Plugin, 'general', 'General', [
        new Group(Plugin, 'general.developer', 'Developer', [
            new SelectOption(Plugin, 'general.developer.log_level', 'Log Level', [
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
    ])
];
