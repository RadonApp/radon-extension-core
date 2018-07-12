import Plugin from '@radon-extension/framework/Core/Plugin';
import {Group, Page} from '@radon-extension/framework/Models/Configuration';

import {LoggerLevelOption} from '../../Models/Configuration';


export default [
    new Page(Plugin, 'debugging', [
        new Group(Plugin, 'logging', [
            new LoggerLevelOption(Plugin, 'log_level')
        ])
    ])
];
