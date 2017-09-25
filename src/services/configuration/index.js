import ConfigurationService from 'neon-extension-framework/services/configuration';
import Plugin from 'neon-extension-core/core/plugin';
import Registry from 'neon-extension-framework/core/registry';

import Options from './options';


export class NeonConfigurationService extends ConfigurationService {
    constructor() {
        super(Plugin, Options);
    }
}

// Register service
Registry.registerService(new NeonConfigurationService());
