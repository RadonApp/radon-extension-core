import Database from './base';


const Indexes = {
    'client': {
        fields: ['clientId']
    },
    'state': {
        fields: ['state']
    }
};

export class Sessions extends Database {
    constructor(name, options) {
        super(name || 'sessions', {
            indexes: Indexes
        }, options);
    }
}

export default new Sessions();
