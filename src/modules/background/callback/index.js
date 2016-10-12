import Extension from 'eon.extension.browser/extension';
import Tabs from 'eon.extension.browser/tabs';
import WebRequest from 'eon.extension.browser/web/request';

import merge from 'lodash-es/merge';
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

        if(parts.length < 3) {
            console.warn('Invalid callback url:', url);
            return;
        }

        // Retrieve parameters
        let extensionId = parts[0];
        let callbackId = parts[1];
        let path = parts.slice(2).join('/');

        // Verify extension id matches
        if(extensionId !== Extension.id) {
            console.warn('Callback doesn\'t match extension identifier');
            return;
        }

        // Build destination url
        let destinationUrl = new URI(Extension.getUrl(path))
            .search(merge(url.search(true), {
                id: callbackId
            }))
            .toString();

        // Navigate to callback page
        console.log('Navigating tab %s to "%s"', request.tabId, destinationUrl);

        Tabs.update(request.tabId, {
            url: destinationUrl
        });
    }
}

export default new Callback();
