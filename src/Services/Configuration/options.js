import Plugin from 'neon-extension-framework/Core/Plugin';
import {Group, Page} from 'neon-extension-framework/Models/Configuration';
import {LoggerLevelOption} from 'neon-extension-core/Models/Configuration';


export default [
    new Page(Plugin, 'debugging', [
        new Group(Plugin, 'logging', [
            new LoggerLevelOption(Plugin, 'log_level')
        ])
    ])
];
