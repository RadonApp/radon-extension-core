import {Group, Page} from 'neon-extension-framework/services/configuration/models';

import LoggerLevelOption from './models/logger/level';
import Plugin from '../../core/plugin';


export default [
    new Page(Plugin, 'debugging', [
        new Group(Plugin, 'logging', [
            new LoggerLevelOption(Plugin, 'log_level')
        ])
    ])
];
