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
        Promise.resolve().then(() => {
            if(this._listening) {
                return true;
            }

            // Ensure the WebRequest API is supported
            if(!WebRequest.$exists()) {
                Log.info('Unable to listen for "%s" requests: WebRequest is not available', CallbackPattern);
                return false;
            }

            Log.debug('Listening for "%s" requests', CallbackPattern);

            // Update state
            this._listening = true;

            // Listen for "onBeforeRequest" events
            try {
                WebRequest.onBeforeRequest.addListener(this.onBeforeRequest.bind(this), {
                    urls: [CallbackPattern]
                });

                return true;
            } catch(e) {
                Log.warn('Unable to listen for "%s" requests:', CallbackPattern, e);
            }

            // Reset state
            this._listening = false;

            return false;
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
