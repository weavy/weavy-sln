(function ($) {
    var PLUGIN_NAME = "dock";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * The main dock containing bubble buttons and panel managment.
     * 
     * @mixin dock
     * @returns {Weavy.plugins.dock}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [Weavy]{@link Weavy#nodes}
         * @instance
         * @member nodes
         * @memberof dock
         * @extends Weavy#nodes
         * @typicalname weavy.nodes
         */

        /**
         *  Reference to this instance
         *  @lends dock#
         */
        var weavy = this;

        var _addButtons = [];

        /**
         * Main element containing the {@link dock#nodes#dock}
         * 
         * @alias dock#nodes#dockContainer
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.dockContainer = null;

        /**
         * The main dock element. This is where buttons etc are added. 
         * It's a good idea to check if the dock is created before you add buttons or do other modifications.
         * 
         * @example
         * weavy.on("after:build", function() {
         *     if (weavy.nodes.dock) {
         *         weavy.nodes.dock.classList.add("myclass");
         *     }
         * })
         * 
         * @alias dock#nodes#dock
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.dock = null;

        /**
         * Subcontainer for global bubbles
         * 
         * @alias dock#nodes#bubblesGlobal
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         * @see {@link bubbles}
         */
        weavy.nodes.bubblesGlobal = null;

        /**
         * Subcontainer for personal bubbles
         * 
         * @alias dock#nodes#bubblesPersonal
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         * @see {@link bubbles}
         */
        weavy.nodes.bubblesPersonal = null;

        /**
         * Container for the weavy general button. 
         * This button is used for opening the authentication panel och as a simple placeholder when no other buttons have been added 
         * 
         * @alias dock#nodes#weavyButtonContainer
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         * @see {@link authentication}
         */
        weavy.nodes.weavyButtonContainer = null;

        /**
         * The actual button element inside the {@link dock#nodes#weavyButtonContainer} 
         * 
         * @alias dock#nodes#weavyButton
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.weavyButton = null;

        function trimUrl(url) {
            return url.replace(/\/$/, "");
        }

        function addAndRemoveBubbleItems() {
            [].forEach.call(weavy.bubbles, function (bubble) {

                var panel = $(weavy.getId("#weavy-panel-bubble-" + bubble.spaceId), weavy.nodes.panels)[0];
                var buttonContainer = $(weavy.getId("#weavy-button-container-bubble-" + bubble.spaceId), weavy.nodes.dock)[0];

                var isAdded = false;

                // add new bubble if not already added
                if (!panel) {
                    isAdded = true;

                    panel = weavy.addPanel("bubble-" + bubble.spaceId, bubble.url, { type: "bubble"});
                    buttonContainer = weavy.addButton("bubble-" + bubble.spaceId, { title: bubble.name, iconUrl: trimUrl(weavy.options.url) + bubble.icon, type: "bubble" });

                    // button container
                    buttonContainer.setAttribute('data-bubble-id', bubble.bubbleId);
                    buttonContainer.setAttribute('data-space-id', bubble.spaceId);

                    var removeButton = document.createElement("a");
                    removeButton.className = "weavy-bubble-action weavy-bubble-close";
                    removeButton.title = "Remove";
                    removeButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" /></svg>';

                    weavy.on(removeButton, "click", function (e) {
                        var thisBubble = weavy.getBubble(bubble);
                        if (weavy.getBubble(weavy.currentBubble) === thisBubble) {
                            weavy.currentBubble = null;
                        }
                        if (thisBubble.type === "detached") {
                            removeBubbleItems.call(weavy, bubble.spaceId);
                        } else {
                            weavy.removeBubble.call(weavy, buttonContainer.dataset["bubbleId"], e);
                        }
                    });

                    buttonContainer.appendChild(removeButton);
                }

                if (parseInt(buttonContainer.getAttribute("data-bubble-id")) !== bubble.bubbleId) {
                    buttonContainer.setAttribute("data-bubble-id", bubble.bubbleId);
                }

                /**
                 * Triggered when a bubble button is added to the dock. It can be used for adding additional functionality to bubble buttons.
                 * 
                 * @event dock#bubble-init
                 * @category events
                 * @returns {Object}
                 * @property {boolean} isAdded - True if the bubble was created, false if it already existed
                 * @property {bubbles~Bubble} bubble - Bubble data
                 * @property {Element} container - The outer button container.
                 * @property {Element} panel - The panel for the bubble
                 */
                weavy.triggerEvent("bubble-init", { isAdded: isAdded, bubble: bubble, container: buttonContainer, panel: panel });

                try {
                    if (bubble.type === "personal") {
                        if (buttonContainer.parentNode === weavy.nodes.bubblesGlobal) {
                            // Bubble is moved from global to personal
                            removedButtonClone(buttonContainer);
                            hideButton(buttonContainer);
                            weavy.nodes.bubblesPersonal.appendChild(buttonContainer);
                            showButton(buttonContainer, 201);
                        } else if (buttonContainer.parentNode !== weavy.nodes.bubblesPersonal) {
                            weavy.nodes.bubblesPersonal.appendChild(buttonContainer);
                        }
                    } else {
                        if (buttonContainer.parentNode === weavy.nodes.bubblesPersonal) {
                            // Bubble is moved from personal to global
                            removedButtonClone(buttonContainer);
                            hideButton(buttonContainer);
                            weavy.nodes.bubblesGlobal.appendChild(buttonContainer);
                            showButton(buttonContainer, 201);
                        } else if (buttonContainer.parentNode !== weavy.nodes.bubblesGlobal) {
                            weavy.nodes.bubblesGlobal.appendChild(buttonContainer);
                        }
                    }
                } catch (e) { weavy.warn("Could not attach bubble", bubble.spaceId, e); }

            });

            // Close remaining spaces
            removeRemovedBubbles(weavy.bubbles);
        }

        function removeRemovedBubbles(bubbles, removeOpened) {
            $(".weavy-bubbles", weavy.nodes.dock).children('[data-type="bubble"]').each(function (index, bubbleButtonContainer) {
                var bubbleButton = bubbleButtonContainer.querySelector(".weavy-button");
                if (bubbles.filter(function (bubble) {
                    return parseInt(bubbleButtonContainer.dataset.spaceId) === parseInt(bubble.spaceId);
                }).length === 0) {
                    if (removeOpened || !bubbleButton.classList.contains("weavy-open")) {
                        weavy.debug("removing dock bubble items", bubbleButtonContainer.dataset.spaceId);
                        removeBubbleItems(bubbleButtonContainer.dataset.spaceId);
                    }
                }
            });
        }

        function removeBubbleItems(spaceId) {
            weavy.removeButton("bubble-" + spaceId);

            if (weavy.nodes.panels) {
                var panel = weavy.nodes.panels.querySelector(weavy.getId("#weavy-panel-bubble-" + spaceId));
                if (panel) {
                    weavy.removePanel("bubble-" + spaceId);
                }
            }
        }

        function removedButtonClone(buttonContainer) {
            var isOpen = buttonContainer.querySelector(".weavy-button").classList.contains("weavy-open");

            var buttonContainerCopy = buttonContainer.cloneNode(true);
            buttonContainerCopy.id = buttonContainer.id + "duplicate";

            var buttonCopy = buttonContainerCopy.querySelector(".weavy-button");
            buttonCopy.id = "";
            buttonContainerCopy.classList.add("weavy-button-container-duplicate", "weavy-disabled");

            buttonContainer.parentNode.insertBefore(buttonContainerCopy, buttonContainer);

            weavy.timeout(isOpen ? 201 : 0).then(function () {
                requestAnimationFrame(function () {
                    buttonContainerCopy.classList.add("weavy-removed");
                    weavy.timeout(201).then(function () { $(buttonContainerCopy).remove() });
                });
            });

            return buttonContainerCopy;
        }

        /**
         * Creates a button and adds it to the dock. Sort the buttons right after all buttons are created using the `before:build` event.
         * 
         * @example
         * weavy.on("build", function() {
         *     if (weavy.isAuthenticated()) {
         *         weavy.myButton = weavy.addButton("mybutton", { 
         *             title: "My Button", 
         *             icon: "<svg>...</svg>", 
         *             iconTransparent: true,
         *             click: false
         *         });
         *     }
         * })
         * 
         * weavy.on("after:build", function (e) {
         *     if (weavy.isAuthenticated()) {
         *         if (weavy.nodes.dock) {
         *             // Place the button before the global bubbles
         *             weavy.nodes.dock.insertBefore(weavy.myButton, weavy.nodes.bubblesGlobal);
         *         }
         *     }
         * });
         * 
         * @param {string} panelId - The id of the button. Should normally match the panel it represents.
         * @param {} attributes
         * @param {string} attributes.type - Optional type that will be added as data-type attribute on the button container
         * @param {string} attributes.title - Title for the button
         * @param {url} attributes.iconUrl - Url to the avatar that fills up the button
         * @param {html} attributes.icon - Custom icon such as an svg. Represented as a HTML string.
         * @param {boolean} attributes.iconTransparent - Makes the button have a transparent background suitable for icons
         * @param {Function} attributes.click - Custom click function. Replaces the default panel toggle. `false` disables clicks.
         * @returns {Element}
         */
        weavy.addButton = function (panelId, attributes) {
            if (!panelId) {
                weavy.error("dock.addButton() is missing panelId");
                return;
            }

            var buttonElementId = weavy.getId("weavy-button-container-" + panelId);
            var domButton = weavy.nodes.dock && weavy.nodes.dock.querySelector("#" + buttonElementId);
            var pendingButton = _addButtons.filter(function (button) { return button.id === buttonElementId; }).pop();

            if (domButton || pendingButton) {
                weavy.warn("Weavy dock.addButton(" + panelId + ") is already created");
                return domButton || pendingButton;
            }

            if (!$.isPlainObject(attributes)) {
                attributes = {};
            }

            // button container
            var buttonContainer = document.createElement("div");
            buttonContainer.className = "weavy-button-container weavy-removed weavy-button-container-" + panelId;
            buttonContainer.id = buttonElementId;

            if (attributes.type) {
                buttonContainer.setAttribute('data-type', attributes.type);
            }

            // button
            var button = document.createElement("div");
            button.className = "weavy-button weavy-button-" + panelId;

            if (attributes.title) {
                button.setAttribute('data-name', attributes.title);
            }

            if (attributes.iconUrl) {
                button.style.backgroundImage = "url(" + weavy.httpsUrl(attributes.iconUrl, weavy.options.url) + ")";
            } else if (attributes.hasOwnProperty("icon")) {
                button.insertAdjacentHTML("beforeend", attributes.icon);
            } else {
                button.insertAdjacentHTML("beforeend", '<img draggable="false" class="weavy-avatar" src="' + weavy.options.plugins.theme.logo + '" />');
            }

            if (attributes.iconTransparent) {
                button.classList.add("weavy-button-transparent");
            }

            buttonContainer.appendChild(button);

            // tooltip
            var tooltip = document.createElement("div");
            tooltip.className = "weavy-button-tooltip";

            var text = document.createElement("span");
            text.className = "weavy-button-tooltip-text";
            text.innerHTML = attributes.title || panelId;

            tooltip.appendChild(text);

            buttonContainer.appendChild(tooltip);

            if (typeof attributes.click === "function") {
                weavy.on(button, "click", attributes.click);
            } else if (attributes.click !== false) {
                weavy.on(button, "click", weavy.toggle.bind(weavy, panelId));
            } else {
                buttonContainer.classList.add("weavy-disabled");
            }

            if (weavy.nodes.dock) {
                weavy.nodes.dock.appendChild(buttonContainer);
            } else {
                _addButtons.push(buttonContainer);
            }

            showButton(buttonContainer);

            return buttonContainer;
        };

        function showButton(buttonContainer, timeout) {
            timeout = timeout || 0;
            weavy.timeout(timeout).then(function () {
                requestAnimationFrame(function () {
                    buttonContainer.classList.remove("weavy-disable-transition", "weavy-removed", "weavy-disabled");
                });
            });
        }

        function hideButton(buttonContainer) {
            buttonContainer.classList.add("weavy-disable-transition", "weavy-removed", "weavy-disabled");
        }

        /**
         * Removes a button from the dock instantly. Also creates a duplicate of the button that is removed after transitions has finished.
         * 
         * @param {string} panelId - The id of the button to remove
         */
        weavy.removeButton = function (panelId) {
            // TODO: remove from _addButtons as well
            var $buttonContainer = $(weavy.nodes.dock).find(weavy.getId("#weavy-button-container-" + panelId));
            if ($buttonContainer.length) {
                $buttonContainer.addClass("weavy-disabled");

                if ($buttonContainer.find(".weavy-button").hasClass("weavy-open")) {
                    weavy.timeout(0).then(function () {
                        weavy.close();
                    });
                }
                removedButtonClone($buttonContainer[0]);
                $buttonContainer.remove();
            }
        };

        // close all bubbles
        weavy.on("close", function (e) {
            $(".weavy-button", weavy.nodes.dockContainer).removeClass("weavy-open");
        });

        // open specified bubble (personal, messenger or bubble)
        weavy.on("open", function (e, open) {
            $.when(weavy.whenBlockChecked, weavy.whenLoaded).then(function () {
                var $buttonContainer = $(weavy.getId("#weavy-button-container-" + open.panelId), weavy.nodes.dockContainer);
                var $button = $(".weavy-button", $buttonContainer);
                if ($buttonContainer.length) {
                    if ($buttonContainer.hasClass("weavy-removed")) {
                        // if the bubble should be delayed because of add transition
                        requestAnimationFrame(function () {
                            weavy.timeout(100).then(function () {
                                $(".weavy-button", weavy.nodes.dock).removeClass("weavy-open");
                                $button.addClass("weavy-open");
                            });
                        });

                    } else {
                        $(".weavy-button", weavy.nodes.dock).removeClass("weavy-open");
                        $button.addClass("weavy-open");
                    }
                } else {
                    $(".weavy-button", weavy.nodes.dock).removeClass("weavy-open");
                }
            });
        });

        weavy.on("panel-loading", function (e, panelLoading) {
            var $button = $(weavy.getId("#weavy-button-container-" + panelLoading.panelId) + " .weavy-button", weavy.nodes.dock);

            if (panelLoading.isLoading) {
                $button.addClass(panelLoading.fillBackground ? "weavy-loading weavy-loading-fill" : "weavy-loading");
            } else {
                $button.removeClass("weavy-loading weavy-loading-fill");
            }
        });

        weavy.on("build", function () {
            var options = weavy.options.plugins[PLUGIN_NAME];

            if (!weavy.nodes.dockContainer) {
                weavy.nodes.dockContainer = document.createElement("div");
                weavy.nodes.dock = document.createElement("div");

                weavy.nodes.scrollBlocker = document.createElement("div");
                weavy.nodes.scrollBlocker.classList.add("weavy-scroll-blocker");

                var weavyButtonName = weavy.plugins.authentication ? weavy.options.plugins.authentication.frameName : "weavy";
                weavy.nodes.weavyButtonContainer = weavy.addButton(weavyButtonName, { title: weavy.options.installationName, iconTransparent: true, click: false });
                weavy.nodes.weavyButtonContainer.classList.add("weavy-button-container-weavy", "weavy-show");
                weavy.nodes.weavyButton = weavy.nodes.weavyButtonContainer.querySelector(".weavy-button");
                weavy.nodes.weavyButton.classList.add("weavy-button-weavy");

                weavy.nodes.dockContainer.appendChild(weavy.nodes.dock);

                // dock
                weavy.nodes.dockContainer.className = "weavy-dock-container " + options.className;
                weavy.nodes.dock.className = "weavy-dock";

                weavy.nodes.container.classList.add(options.themeClassName, options.positionClassName);

                weavy.nodes.bubblesGlobal = document.createElement("div");
                weavy.nodes.bubblesPersonal = document.createElement("div");

                weavy.nodes.dock.appendChild(weavy.nodes.bubblesGlobal);
                weavy.nodes.dock.appendChild(weavy.nodes.bubblesPersonal);

                // global bubbles container
                weavy.nodes.bubblesGlobal.id = weavy.getId("weavy-bubbles-global");
                weavy.nodes.bubblesGlobal.className = "weavy-bubbles-global weavy-bubbles";

                // personal bubbles container
                weavy.nodes.bubblesPersonal.id = weavy.getId("weavy-bubbles-personal");
                weavy.nodes.bubblesPersonal.className = "weavy-bubbles-personal weavy-bubbles";

                if (weavy.plugins.authentication) {
                    $(weavy.nodes.weavyButton).on("click", weavy.toggle.bind(weavy, weavy.options.plugins.authentication.frameName, weavy.signInUrl));
                    weavy.nodes.weavyButton.classList.remove("weavy-disabled");
                }

                weavy.one("after:build", function () {
                    var options = weavy.options.plugins[PLUGIN_NAME];
                    weavy.nodes.container.appendChild(weavy.nodes.dockContainer);
                    weavy.nodes.panels.classList.add(options.panelsClassName);
                    weavy.nodes.panels.appendChild(weavy.nodes.scrollBlocker);
                    weavy.nodes.dockContainer.appendChild(weavy.nodes.panels);
                });
            }

            // Add requested buttons
            for (var button in _addButtons) {
                weavy.nodes.dock.appendChild(_addButtons[button]);
            }
            _addButtons = [];
        });

        weavy.on("load", function () {
            if (weavy.isAuthenticated()) {
                weavy.nodes.weavyButtonContainer.classList.remove("weavy-show");
            } else {
                weavy.nodes.weavyButtonContainer.classList.add("weavy-show");
            }

            addAndRemoveBubbleItems();
        });

        weavy.on("bubble-removed", function (e, data) {
            removeBubbleItems(data.spaceId);
        });

        weavy.on("bubble-added", function (e, data) {
            addAndRemoveBubbleItems();
        });

        weavy.on("after:options", function (e, data) {
            if (weavy.nodes.dock) {
                addAndRemoveBubbleItems();
            }
        });

        weavy.on("space-trashed", function (e, data) {
            removeBubbleItems(data.id, true);
        });

        weavy.on("signing-out", function () {
            weavy.nodes.weavyButtonContainer.classList.add("weavy-show");
        });

        weavy.on("signing-in signing-out", function () {
            if (weavy.nodes.weavyButton) {
                weavy.nodes.weavyButton.classList.add("weavy-loading");

                var onMessage = function(e) {
                    e = e.originalEvent || e;

                    switch (e.data.name) {
                        case "signed-in":
                        case "signed-out":
                        case "authentication-error":
                            weavy.nodes.weavyButton.classList.remove("weavy-loading");
                            weavy.off(window, "message", onMessage);
                            break;
                    }
                }

                // listen to signed-out message
                weavy.on(window, "message", onMessage);
            }
        });


        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.dock.defaults = {
     *     className: "",
     *     positionClassName: "weavy-middle",
     *     panelsClassName: "weavy-dock-panels",
     *     themeClassName: "weavy-extended"
     * };
     * 
     * @name defaults
     * @memberof dock
     * @type {Object}
     * @property {string} className - Classes added to the {@link dock#nodes#dockContainer}
     * @property {string} positionClassName=weavy-middle - Classes added to `weavy.nodes.container` to set the default position of the dock. <br> • **weavy-left**<br> • **weavy-right**<br> • **weavy-top**<br> • **weavy-middle**<br> • **weavy-bottom**
     * @property {string} panelsClassName=weavy-dock-panels - Classes added to the {@link panels} container.
     * @property {string} themeClassName=weavy-extended - Default theme class used by the dock. <br> • **weavy-default** - only basic styles<br> • **weavy-extended** - all styles for the dock<br> • **weavy-custom** - only core styles
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        className: "",
        positionClassName: "weavy-middle",
        panelsClassName: "weavy-dock-panels",
        themeClassName: "weavy-extended"
    };

    /**
     * Non-optional dependencies.
     * - {@link bubbles}
     * - {@link panels}
     * - {@link theme}
     * 
     * @name dependencies
     * @memberof dock
     * @type {string[]}
     */
    Weavy.plugins[PLUGIN_NAME].dependencies = [
        "bubbles",
        "panels",
        "theme"
    ];

    /**
     * Preset for loading the dock with all needed plugins and styles.
     * 
     * @alias "presets.dock"
     * @memberof dock
     * @extends Weavy.presets
     * @returns {Weavy.presets.dock}
     * @example
     * var dock = new Weavy(Weavy.presets.dock);
     */
    Weavy.presets[PLUGIN_NAME] = {
        className: "weavy-extended",
        includePlugins: true
    }
})(jQuery);
