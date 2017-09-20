import ConfigurationService from 'eon.extension.framework/services/configuration';
import Plugin from 'eon.extension.core/core/plugin';
import Registry from 'eon.extension.framework/core/registry';

import Options from './options';


export class EonConfigurationService extends ConfigurationService {
    constructor() {
        super(Plugin, Options);
    }
}

// Register service
Registry.registerService(new EonConfigurationService());
