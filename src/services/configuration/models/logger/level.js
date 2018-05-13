import IsNil from 'lodash-es/isNil';
import Merge from 'lodash-es/merge';

import {PluginOption} from 'neon-extension-framework/services/configuration/models';


export default class LoggerLevelOption extends PluginOption {
    constructor(plugin, key, label, options) {
        super(plugin, 'logger.level', key, label, Merge({
            componentId: 'services.configuration:logger.level',

            default: {
                levels: {
                    [null]: 'warning'
                },
                mode: 'basic'
            }
        }, options));
    }

    get() {
        return this.preferences.getObject(this.name);
    }

    isValid(value) {
        if(IsNil(value)) {
            return true;
        }

        if(IsNil(value.mode) || ['basic', 'advanced'].indexOf(value.mode) < 0) {
            return false;
        }

        if(IsNil(value.levels) || Object.keys(value.levels) < 1) {
            return false;
        }

        return true;
    }
}
