import Database from './base';


const Indexes = {
    'client': {
        fields: ['clientId']
    },
    'state': {
        fields: ['state']
    }
};

export class SessionDatabase extends Database {
    constructor(name, options) {
        super(name || 'sessions', {
            indexes: Indexes
        }, options);
    }
}

export default process.env['TEST'] !== true && new SessionDatabase();
