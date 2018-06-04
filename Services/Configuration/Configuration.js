import ConfigurationService from 'neon-extension-framework/Services/Configuration';
import Registry from 'neon-extension-framework/Core/Registry';

import Plugin from '../../Core/Plugin';
import Options from './options';


export class NeonConfigurationService extends ConfigurationService {
    constructor() {
        super(Plugin, Options);
    }
}

// Register service
Registry.registerService(new NeonConfigurationService());
