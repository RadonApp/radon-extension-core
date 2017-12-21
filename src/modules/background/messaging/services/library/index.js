/* eslint-disable no-multi-spaces, key-spacing */
import Map from 'lodash-es/map';

import ItemDatabase from 'neon-extension-core/database/item';
import ItemDecoder from 'neon-extension-framework/models/item/core/decoder';
import Log from 'neon-extension-core/core/logger';
import Plugin from 'neon-extension-core/core/plugin';

import BaseService from '../core/base';
import LibraryTransaction from './transaction';


export class LibraryService extends BaseService {
    constructor() {
        super(Plugin, 'library');

        // Library Events
        this.on('library.update', this.onLibraryUpdate.bind(this));
    }

    onLibraryUpdate({source, items, ...options}, sender) {
        Log.debug('Importing library from "%s" [%d item(s)]', source, items.length, sender);

        // Emit events
        this.emit('library.update.started', { clientId: sender.id, source });

        // Update database with provided `items`
        return Promise.resolve(this._update(source, items, [
            'music/artist',
            'music/album',
            'music/track'
        ])).then(() => {
            Log.debug('Library from "%s" has been imported [%d item(s)]', source, items.length);

            // Emit events
            this.emit('library.update.finished', { clientId: sender.id, source });
        }, (err) => {
            Log.error('Library from "%s" couldn\'t be imported: %s', source, err && err.message, err);

            // Emit events
            this.emit('library.update.finished', { clientId: sender.id, source });
        });
    }

    _update(source, items, types) {
        let transaction = new LibraryTransaction(types, { source });

        // Execute transaction
        return Promise.resolve()
            // Fetch items from database
            .then(() => transaction.fetch())

            // Add items to transaction in chunks
            .then(() => transaction.addMany(Map(items, (item) =>
                ItemDecoder.fromPlainObject(item)
            )))

            // Execute transaction
            .then(() => transaction.execute())

            // Reindex database
            .then(() => ItemDatabase.reindex());
    }
}

export default new LibraryService();
