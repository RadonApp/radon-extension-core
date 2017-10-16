/* eslint-disable no-multi-spaces, key-spacing */
import Log from 'neon-extension-core/core/logger';
import Plugin from 'neon-extension-core/core/plugin';
import {ItemParser} from 'neon-extension-framework/models/item';

import BaseService from '../core/base';
import LibraryTransaction from './transaction';


export class LibraryService extends BaseService {
    constructor() {
        super(Plugin, 'library');

        // Library Events
        this.on('library.update', this.onLibraryUpdate.bind(this));
    }

    onLibraryUpdate({source, items, ...options}) {
        Log.debug('Importing library from "%s" [%d item(s)]', source, items.length);

        let transaction = new LibraryTransaction([
            'music/artist',
            'music/album',
            'music/track'
        ], options);

        // Execute transaction
        return Promise.resolve()
            // Fetch items from database
            .then(() => transaction.fetch())

            // Add items to transaction in chunks
            .then(() => transaction.addMany(ItemParser.fromPlainObject, items))

            // Execute transaction
            .then(() => transaction.execute())

            // Complete
            .then(() => Log.debug('Library from "%s" has been imported [%d item(s)]', source, items.length));
    }
}

export default new LibraryService();
