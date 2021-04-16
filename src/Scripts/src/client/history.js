/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            '../promise',
            '../utils'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('../promise'),
            require('../utils')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyHistory = factory(root.WeavyPromise, root.WeavyUtils);
    }
}(typeof self !== 'undefined' ? self : this, function (WeavyPromise, utils) {
    console.debug("history.js");

    /**
     * @class WeavyHistory
     * @classdesc Class for handling history states
     */

    /**
     * Class for handling history states.
     * 
     * @constructor
     * @hideconstructor
     * @param {Weavy} weavy - Weavy instance
     */
    var WeavyHistory = function (weavy) {
        /**
         *  Reference to this instance
         *  @lends WeavyHistory#
         */
        var weavyHistory = this;


        /**
         * Try to open a weavy uri in the app where it belongs. 
         * 
         * @param {WeavyHistory~weavyUri} uri - String weavy Uri to open in a panel.
         * @returns {external:Promise}
         * @resolved When the uri successfully is opened
         * @rejected When the uri can't be opened
         */
        weavyHistory.openUri = function (uri) {
            var weavyUriState = weavyHistory.getStateFromUri(uri);

            if (weavyUriState && weavyUriState.panels.length) {
                return weavyHistory.openState(weavyUriState);
            }

            return WeavyPromise.reject();
        };

        /**
         * Get a weavy state from one or more {@link WeavyHistory~weavyUri} uris.
         * 
         * @example
         * var weavyState = weavy.history.getStateFromUri("wvy://app-123@wvy-id/e/apps/123");
         * 
         * @example
         * var weavyUris = [
         *   "wvy://app-123@wvy-id/e/apps/123",
         *   "wvy://app-456/e/apps/456"
         * ];
         * 
         * var weavyState = weavy.history.getStateFromUri(weavyUris);
         * 
         * @param {Array.<WeavyHistory~weavyUri>} weavyUris
         * @returns {WeavyHistory~weavyState}
         */
        weavyHistory.getStateFromUri = function(weavyUris) {
            weavyUris = utils.asArray(weavyUris);
            var panels = [];
            weavyUris.forEach(function (uri) {
                var isUrl = typeof uri === "string";
                if (isUrl && uri.indexOf("wvy://") === 0) {
                    var weavyUri = /^wvy:\/\/([^@/]*)@?([^/]*)(.*)$/.exec(uri);
                    if (weavyUri && weavyUri.length) {
                        var panelId = weavyUri[1];
                        var weavyId = weavyUri[2];
                        var id = "panel-" + panelId + "__" + (weavyId || weavy.getId());
                        var panelPath = weavyUri[3];
                        weavy.debug("history: parsed wvy url", weavyId, panelId);
                        panels.push({
                            id: id,
                            panelId: panelId,
                            isOpen: true,
                            location: panelPath,
                            weavyId: weavyId,
                            weavyUri: uri,
                            changedAt: Date.now()
                        });

                    }
                }
            });

            return { panels: panels };
        }

        /**
         * Gets the panel state from a specified panel. May also be accessed via {@WeavyPanels~panel#getState}
         * 
         * @param {string} panelId - The id of the panel
         * @returns {WeavyHistory~panelState}
         */
        weavyHistory.getStateFromPanel = function (panelId) {
            var panel = weavy.panels.getPanel(panelId);

            if (!panel) {
                weavy.warn("history: getStateFromPanel; Panel not found " + panelId);
                return;
            }

            var weavyId = weavy.options.id && weavy.getId();
            var weavyUriId = (weavy.options.id ? weavy.getId(panelId).replace("__", "@") : panelId);

            var relUrl = panel.location && utils.URL(weavy.httpsUrl(panel.location, weavy.options.url)).pathname;
            var weavyUri = "wvy://" + weavyUriId + (relUrl || "")

            return {
                id: panel.node.id,
                panelId: panelId,
                isOpen: panel.isOpen,
                location: panel.location,
                weavyId: weavyId,
                weavyUri: weavyUri,
                changedAt: panel.node.dataset.stateChangedAt
            };
        }


        /**
         * Gets the current state of the weavy instance, including all panel states.
         * 
         * @returns {WeavyHistory~weavyState}
         */
        weavyHistory.getCurrentState = function () {
            var panelStates = weavy.panels.getCurrentPanels().map(function (panel) {
                return panel.getState();
            }).sort(function (a, b) {
                var sortByOpen = a.isOpen - b.isOpen;
                var sortByTime = (a.changedAt || 0) - (b.changedAt || 0)
                return sortByOpen || sortByTime;
            });

            var state = {
                panels: panelStates,
            };

            return state;
        }

        function extendPanelStates(panels, additionalPanels) {
            if (additionalPanels) {
                additionalPanels.forEach(function (addPanelState) {
                    var found = false;
                    panels = panels.map(function (panelState) {
                        var weavyMatch = !panelState.weavyId && !addPanelState.weavyId || panelState.weavyId === addPanelState.weavyId;
                        var panelMatch = panelState.panelId === addPanelState.panelId;
                        if (weavyMatch && panelMatch) {
                            found = true;
                            return addPanelState;
                        } else {
                            return panelState;
                        }
                    })
                    if (!found) {
                        panels.push(addPanelState);
                    }
                })

                panels.sort(function (a, b) {
                    var sortByOpen = a.isOpen - b.isOpen;
                    var sortByTime = (a.changedAt || 0) - (b.changedAt || 0)
                    return sortByOpen || sortByTime;
                });
            }
            return panels;
        }

        /**
         * Gets the global state for all weavy instances combined, stored in the browser history state.
         * The state has the same structure as a single weavy instance state.
         * 
         * @returns {WeavyHistory~weavyState}
         */
        weavyHistory.getBrowserState = function () {
            return window.history.state && window.history.state.weavy;
        }


        /**
         * Saves a weavy state to the browser history by either push or replace. 
         * Any existing state will be preserved and existing states from other weavy instances will be merged.
         * 
         * @param {WeavyHistory~weavyState} state - The state to add to any existing state
         * @param {string} [action] - If set to "replace", the current history state will be updated.
         * @param {any} [url] - Any new url to use for the state. If omitted, the current location will be reused.
         */
        weavyHistory.setBrowserState = function(state, action, url) {
            if (state) {
                weavy.debug("history: " + (action || "setting") + " browser state");

                // Always modify any existing state
                var currentHistoryState = window.history.state || {};
                currentHistoryState.weavy = currentHistoryState.weavy || {};

                currentHistoryState.weavy.panels = extendPanelStates(currentHistoryState.weavy.panels || [], state.panels);

                url = url || window.location.href;

                try {
                    if (action === "replace") {
                        window.history.replaceState(currentHistoryState, null, url);
                    } else {
                        window.history.pushState(currentHistoryState, null, url);
                    }
                } catch (e) {
                    weavy.warn("history: Could not push history state.")
                }
            }
        }

        /**
         * Adds a state to the browser history, by either push or replace. 
         * This is usually used automatically by internal components.
         * 
         * @emits {WeavyHistory#history}
         * @param {string} [action] - "push" or "replace". Indicates if the state should generate a new history point or replace the existing.
         * @param {WeavyHistory~weavyState} [state] - The state to add. Defaults to the current state of the weavy instance.
         * @returns {WeavyHistory~weavyState}
         */
        weavyHistory.addState = function (action, state) {
            state = state || weavyHistory.getCurrentState()

            // Always modify any existing state
            var currentHistoryState = window.history.state || {};
            var globalState = currentHistoryState.weavy = currentHistoryState.weavy || {};

            var history = {
                state: state,
                action: action || "push", // push, replace
                url: window.location.href,
                globalState: globalState
            };

            /**
             * Triggered when a weavy state is added or updated. 
             * The global weavy state will be stored in `window.history.state.weavy` unless default is prevented.
             * 
             * This is where you can modify the url or the state just before it will be pushed or replaced.
             * If you call event.preventDefault() you need do save the state to the browser history by yourself.
             * 
             * @example
             * // Modify the history URL to include the last opened panel as a hash and return the data
             * weavy.on("history", function (e, history) {
             *     // Get only panels that has been interactively opened/closed (changedAt) and is currently open.
             *     var allOpenPanels = history.globalState.panels.filter(function (panelState) {
             *         return panelState.changedAt && panelState.isOpen;
             *     });
             *     var lastOpenPanel = allOpenPanels.pop();
             * 
             *     // Set the url
             *     if(lastOpenPanel) {
             *         // Set the hash to the last opened panel
             *         history.url = "#" + lastOpenPanel.weavyUri;
             *     } else {
             *         // Remove the hash if no changed panel is open
             *         history.url = history.url.split("#")[0];
             *     }
             * 
             *     // Return the modified data to apply it
             *     return history;
             * });
             * 
             * @category events
             * @event WeavyHistory#history
             * @returns {Object}
             * @property {WeavyHistory~weavyState} state - The state of the weavy instance
             * @property {string} action - Indicates what the intention of the history state is "push" or "replace" 
             * @property {string} url - The url to set in the browser history.
             * @property {WeavyHistory~weavyState} globalState - The current combined global state for all weavy instances.
             */

            history = weavy.triggerEvent("before:history", history);

            if (history !== false) {

                // Combine global panel list
                history.globalState.panels = extendPanelStates(history.globalState.panels || [], history.state.panels);

                history = weavy.triggerEvent("on:history", history);

                if (history !== false) {
                    weavy.debug("history: " + history.action + " history state");
                    weavyHistory.setBrowserState(history.state, history.action, history.url)
                    weavy.triggerEvent("after:history", history);
                }
            }

            return history.state;
        }

        /**
         * Restores all the matching panels in a weavy state. 
         * It will open or close the panels and restore their location.
         * It will not genrate any new history.
         * 
         * @param {WeavyHistory~weavyState} state - The state to restore
         * @returns {external:Promise}
         */
        weavyHistory.openState = function (state) {
            if (state) {
                if (state.panels) {
                    if (state.panels && Array.isArray(state.panels)) {
                        return weavy.whenLoaded().then(function () {
                            weavy.debug("history: opening state");
                            return Promise.all(state.panels.map(function (panelState) {
                                if (!panelState.weavyId && !weavy.options.id || panelState.weavyId === weavy.getId()) {
                                    var panel = weavy.panels.getPanel(panelState.panelId);
                                    if (panel) {
                                        weavy.debug("history: setting panel state", panelState.panelId)
                                        return panel.setState(panelState);
                                    }
                                    return WeavyPromise.resolve();
                                }
                            }));
                        })
                    }
                }
            }
            return WeavyPromise.reject("Error opening state");
        }

        function setCurrentHistoryState() {
            weavy.debug("history: set current state");
            var state = weavyHistory.getCurrentState();
            weavyHistory.setBrowserState(state, "replace");
        }

        weavy.on(window, "popstate", function (e) {
            var state = weavyHistory.getBrowserState();
            if (state) {
                weavy.debug("history: popstate");
                weavyHistory.openState(state);
            }
        });

        weavy.whenLoaded().then(function () {
            var state = weavyHistory.getBrowserState();
            if (state) {
                weavy.debug("history: load state");
                weavyHistory.openState(state)
            }

            weavy.whenReady().then(weavy.whenTimeout(1)).then(setCurrentHistoryState);

        });
    };

    return WeavyHistory;
}));

/**
 * The data for a panel state. Indicates which location the panel has and if it's open.
 * The `changedAt` property is not set at the initial state load, only when the state changes.
 * May be applied to a panel using {@link WeavyPanels~panel#setState}.
 * 
 * @example
 * var panelState = {
 *   id: "panel-app-123__wy-41d751e8",
 *   panelId: "app-123",
 *   isOpen: true,
 *   location: "/e/apps/123,
 *   weavyId: "wy-41d751e8",
 *   weavyUri: "wvy://app-123@wy-41d751e8/e/apps/123",
 *   changedAt: 1614596627434
 * }
 * 
 * @typedef WeavyHistory~panelState
 * @type Object
 * @property {string} id - The DOM id of the panel.
 * @property {string} panelId - The internal id of the panel.
 * @property {boolean} isOpen - Indicates whether the panel is open or not.
 * @property {string} location - The relative current location for the panel.
 * @property {string} weavyId - The explicitly set weavy id. Null if id is not set in options.
 * @property {WeavyHistory~weavyUri} - The Weavy Uri for the panel
 * @property {int} changedAt - Timestamp if the state of the panel was changed since weavy loaded.
 */

/**
 * An Uri for a location in a specific panel. May be opened using {@link WeavyHistory#openUri}.
 * 
 * @example
 * "wvy://app-123@wvy-id/e/apps/123"
 * 
 * @typedef WeavyHistory~weavyUri
 * @type String
 */

/**
 * The combined state of all panels in the weavy instance.
 * 
 * @example
 * var weavyState = {
 *   panels: [
 *      panel1State,
 *      panel2State,
 *      ...
 *   ]
 * }
 * 
 * @typedef WeavyHistory~weavyState
 * @type Object
 * @property {Array.<WeavyHistory~panelState>} panels
 */

/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */
