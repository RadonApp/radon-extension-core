import Runtime from 'wes/runtime';
import Tabs from 'wes/tabs';
import URI from 'urijs';
import WebRequest from 'wes/webRequest';

import Log from '../Core/Logger';
import Plugin from '../Core/Plugin';
import Service from '../Messaging/Core/Service';


const CallbackPattern = '*://radon.browser.local/*';

class CallbackService extends Service {
    constructor() {
        super(Plugin, 'callback');

        this._listening = false;

        // Bind to events
        this.requests.on('listen', this.listen.bind(this));
    }

    listen(payload, resolve, reject) {
        if(this._listening) {
            resolve();
            return;
        }

        // Start listening for callback requests
        Promise.resolve().then(() => {
            // Ensure the WebRequest API is supported
            if(!WebRequest.supported) {
                reject(new Error('WebRequest is not supported'));
                return;
            }

            Log.debug('Listening for "%s" requests', CallbackPattern);

            // Update state
            this._listening = true;

            // Listen for "onBeforeRequest" events
            WebRequest.onBeforeRequest.addListener(this.onBeforeRequest.bind(this), {
                urls: [ CallbackPattern ]
            });
        }).then(
            resolve,
            reject
        );
    }

    onBeforeRequest(request) {
        let requestUrl = new URI(request.url);

        // Build extension url
        let url = new URI(Runtime.getURL(requestUrl.path()))
            .search(requestUrl.search(true))
            .toString();

        Log.debug('Redirecting tab (id: %s) to extension', request.tabId);

        // Navigate to extension url
        Tabs.update(request.tabId, { url });
    }
}

export default new CallbackService();
