import URI from 'urijs';

import Extension from 'neon-extension-browser/extension';
import Log from 'neon-extension-framework/core/logger';
import Tabs from 'neon-extension-browser/tabs';
import WebRequest from 'neon-extension-browser/web/request';


/*
 * Due to a bug with "web_accessible_resources" on firefox, we need to catch
 * callback requests and redirect the tab to the correct page.
 */
export class Callback {
    constructor() {
        if(!WebRequest.supported) {
            return;
        }

        let callbackPattern = Extension.getCallbackPattern();

        // Bind to callback requests
        WebRequest.onBeforeRequest.addListener(
            this.onBeforeRequest.bind(this),
            {urls: [callbackPattern]}
        );

        Log.debug('Listening for callback requests matching "%s"...', callbackPattern);
    }

    onBeforeRequest(request) {
        let url = new URI(request.url);

        // Build destination url
        let destinationUrl = new URI(Extension.getUrl(url.path()))
            .search(url.search(true))
            .toString();

        // Navigate to callback page
        Log.debug('Redirecting tab (id: %s) to extension callback', request.tabId);

        Tabs.update(request.tabId, {
            url: destinationUrl
        });
    }
}

export default new Callback();
