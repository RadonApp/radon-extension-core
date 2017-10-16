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
    constructor() {
        super('sessions', Indexes);
    }
}

export default new Sessions();
