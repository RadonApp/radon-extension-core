import {Group, Page} from 'neon-extension-framework/services/configuration/models';

import LoggerLevelOption from './models/logger/level';
import Plugin from '../../core/plugin';


export default [
    new Page(Plugin, 'debugging', 'Debugging', [
        new Group(Plugin, 'logging', 'Logging', [
            new LoggerLevelOption(Plugin, 'log_level', 'Log Level')
        ])
    ])
];
