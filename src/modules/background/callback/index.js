import Extension from 'eon.extension.browser/extension';
import Tabs from 'eon.extension.browser/tabs';
import WebRequest from 'eon.extension.browser/web/request';

import URI from 'urijs';


/*
 * Due to a bug with "web_accessible_resources" on firefox, we need to catch
 * callback requests and redirect the tab to the correct page.
 */
export class Callback {
    constructor() {
        let callbackPattern = Extension.getCallbackPattern();

        // Bind to callback requests
        WebRequest.onBeforeRequest.addListener(
            this.onBeforeRequest.bind(this),
            {urls: [callbackPattern]}
        );

        console.debug('Listening for callback requests matching "%s"...', callbackPattern);
    }

    onBeforeRequest(request) {
        let url = new URI(request.url);

        // Retrieve url segments
        let parts = url.segmentCoded();

        if(parts.length < 2) {
            console.warn('Invalid callback url:', url);
            return;
        }

        // Retrieve parameters
        let extensionKey = parts[0];
        let path = parts.slice(1).join('/');

        // Verify extension id matches
        if(extensionKey !== Extension.key) {
            console.warn('Callback doesn\'t match extension key');
            return;
        }

        // Build destination url
        let destinationUrl = new URI(Extension.getUrl(path))
            .search(url.search(true))
            .toString();

        // Navigate to callback page
        console.log('Navigating tab %s to "%s"', request.tabId, destinationUrl);

        Tabs.update(request.tabId, {
            url: destinationUrl
        });
    }
}

export default new Callback();
