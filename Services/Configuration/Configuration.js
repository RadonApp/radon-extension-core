import ConfigurationService from '@radon-extension/framework/Services/Configuration';
import Registry from '@radon-extension/framework/Core/Registry';

import Plugin from '../../Core/Plugin';
import Options from './options';


export class RadonConfigurationService extends ConfigurationService {
    constructor() {
        super(Plugin, Options);
    }
}

// Register service
Registry.registerService(new RadonConfigurationService());
