(function ($) {
    var PLUGIN_NAME = "dock";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * The main dock containing bubble buttons and panel managment.
     * 
     * @mixin dock
     * @returns {WeavyWidget.plugins.dock}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [WeavyWidget]{@link WeavyWidget#nodes}
         * @instance
         * @member nodes
         * @memberof dock
         * @extends WeavyWidget#nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends dock#
         */
        var widget = this;

        var _addButtons = [];

        /**
         * Main element containing the {@link dock#nodes#dock}
         * 
         * @alias dock#nodes#dockContainer
         * @type {?Element}
         * @created Widget event: {@link WeavyWidget#event:build}
         */
        widget.nodes.dockContainer = null;

        /**
         * The main dock element. This is where buttons etc are added. 
         * It's a good idea to check if the dock is created before you add buttons or do other modifications.
         * 
         * @example
         * widget.on("after:build", function() {
         *     if (widget.nodes.dock) {
         *         widget.nodes.dock.classList.add("myclass");
         *     }
         * })
         * 
         * @alias dock#nodes#dock
         * @type {?Element}
         * @created Widget event: {@link WeavyWidget#event:build}
         */
        widget.nodes.dock = null;

        /**
         * Subcontainer for global bubbles
         * 
         * @alias dock#nodes#bubblesGlobal
         * @type {?Element}
         * @created Widget event: {@link WeavyWidget#event:build}
         * @see {@link bubbles}
         */
        widget.nodes.bubblesGlobal = null;

        /**
         * Subcontainer for personal bubbles
         * 
         * @alias dock#nodes#bubblesPersonal
         * @type {?Element}
         * @created Widget event: {@link WeavyWidget#event:build}
         * @see {@link bubbles}
         */
        widget.nodes.bubblesPersonal = null;

        /**
         * Container for the weavy general button. 
         * This button is used for opening the authentication panel och as a simple placeholder when no other buttons have been added 
         * 
         * @alias dock#nodes#weavyButtonContainer
         * @type {?Element}
         * @created Widget event: {@link WeavyWidget#event:build}
         * @see {@link authentication}
         */
        widget.nodes.weavyButtonContainer = null;

        /**
         * The actual button element inside the {@link dock#nodes#weavyButtonContainer} 
         * 
         * @alias dock#nodes#weavyButton
         * @type {?Element}
         * @created Widget event: {@link WeavyWidget#event:build}
         */
        widget.nodes.weavyButton = null;

        function trimUrl(url) {
            return url.replace(/\/$/, "");
        }

        function addAndRemoveBubbleItems() {
            [].forEach.call(widget.bubbles, function (bubble) {

                var panel = $(widget.getId("#weavy-panel-bubble-" + bubble.spaceId), widget.nodes.panels)[0];
                var buttonContainer = $(widget.getId("#weavy-button-container-bubble-" + bubble.spaceId), widget.nodes.dock)[0];

                var isAdded = false;

                // add new bubble if not already added
                if (!panel) {
                    isAdded = true;

                    panel = widget.addPanel("bubble-" + bubble.spaceId, { url: bubble.url, type: "bubble"});
                    buttonContainer = widget.addButton("bubble-" + bubble.spaceId, { title: bubble.name, iconUrl: trimUrl(widget.options.url) + bubble.icon, type: "bubble" });

                    // button container
                    buttonContainer.setAttribute('data-bubble-id', bubble.bubbleId);
                    buttonContainer.setAttribute('data-space-id', bubble.spaceId);

                    var removeButton = document.createElement("a");
                    removeButton.className = "weavy-bubble-action weavy-bubble-close";
                    removeButton.title = "Remove";
                    removeButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" /></svg>';

                    widget.on(removeButton, "click", function (e) {
                        var thisBubble = widget.getBubble(bubble);
                        if (widget.getBubble(widget.currentBubble) === thisBubble) {
                            widget.currentBubble = null;
                        }
                        if (thisBubble.type === "detached") {
                            removeBubbleItems.call(widget, bubble.spaceId);
                        } else {
                            widget.removeBubble.call(widget, buttonContainer.dataset["bubbleId"], e);
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
                widget.triggerEvent("bubble-init", { isAdded: isAdded, bubble: bubble, container: buttonContainer, panel: panel });

                try {
                    if (bubble.type === "personal") {
                        if (buttonContainer.parentNode === widget.nodes.bubblesGlobal) {
                            // Bubble is moved from global to personal
                            removedButtonClone(buttonContainer);
                            hideButton(buttonContainer);
                            widget.nodes.bubblesPersonal.appendChild(buttonContainer);
                            showButton(buttonContainer, 201);
                        } else if (buttonContainer.parentNode !== widget.nodes.bubblesPersonal) {
                            widget.nodes.bubblesPersonal.appendChild(buttonContainer);
                        }
                    } else {
                        if (buttonContainer.parentNode === widget.nodes.bubblesPersonal) {
                            // Bubble is moved from personal to global
                            removedButtonClone(buttonContainer);
                            hideButton(buttonContainer);
                            widget.nodes.bubblesGlobal.appendChild(buttonContainer);
                            showButton(buttonContainer, 201);
                        } else if (buttonContainer.parentNode !== widget.nodes.bubblesGlobal) {
                            widget.nodes.bubblesGlobal.appendChild(buttonContainer);
                        }
                    }
                } catch (e) { widget.warn("Could not attach bubble", bubble.spaceId, e); }

            });

            // Close remaining spaces
            removeRemovedBubbles(widget.bubbles);
        }

        function removeRemovedBubbles(bubbles, removeOpened) {
            $(".weavy-bubbles", widget.nodes.dock).children('[data-type="bubble"]').each(function (index, bubbleButtonContainer) {
                var bubbleButton = bubbleButtonContainer.querySelector(".weavy-button");
                if (bubbles.filter(function (bubble) {
                    return parseInt(bubbleButtonContainer.dataset.spaceId) === parseInt(bubble.spaceId);
                }).length === 0) {
                    if (removeOpened || !bubbleButton.classList.contains("weavy-open")) {
                        widget.debug("removing dock bubble items", bubbleButtonContainer.dataset.spaceId);
                        removeBubbleItems(bubbleButtonContainer.dataset.spaceId);
                    }
                }
            });
        }

        function removeBubbleItems(spaceId) {
            if (widget.nodes.panels) {
                var panel = widget.nodes.panels.querySelector(widget.getId("#weavy-panel-bubble-" + spaceId));
                if (panel) {
                    widget.removeButton("bubble-" + spaceId);
                    widget.removePanel("bubble-" + spaceId);
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

            widget.timeout(isOpen ? 201 : 0).then(function () {
                requestAnimationFrame(function () {
                    buttonContainerCopy.classList.add("weavy-removed");
                    widget.timeout(201).then(function () { $(buttonContainerCopy).remove() });
                });
            });

            return buttonContainerCopy;
        }

        /**
         * Creates a button and adds it to the dock. Sort the buttons right after all buttons are created using the `before:build` event.
         * 
         * @example
         * widget.on("build", function() {
         *     if (widget.isAuthenticated()) {
         *         widget.myButton = widget.addButton("mybutton", { 
         *             title: "My Button", 
         *             icon: "<svg>...</svg>", 
         *             iconTransparent: true,
         *             click: false
         *         });
         *     }
         * })
         * 
         * widget.on("after:build", function (e) {
         *     if (widget.isAuthenticated()) {
         *         if (widget.nodes.dock) {
         *             // Place the button before the global bubbles
         *             widget.nodes.dock.insertBefore(widget.myButton, widget.nodes.bubblesGlobal);
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
        widget.addButton = function (panelId, attributes) {
            if (!panelId) {
                widget.error("dock.addButton() is missing panelId");
                return;
            }

            var buttonElementId = widget.getId("weavy-button-container-" + panelId);
            var domButton = widget.nodes.dock && widget.nodes.dock.querySelector("#" + buttonElementId);
            var pendingButton = _addButtons.filter(function (button) { return button.id === buttonElementId; }).pop();

            if (domButton || pendingButton) {
                widget.warn("WeavyWidget dock.addButton(" + panelId + ") is already created");
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
                button.style.backgroundImage = "url(" + widget.httpsUrl(attributes.iconUrl) + ")";
            } else if (attributes.hasOwnProperty("icon")) {
                button.insertAdjacentHTML("beforeend", attributes.icon);
            } else {
                button.insertAdjacentHTML("beforeend", '<img draggable="false" class="weavy-avatar" src="' + widget.options.plugins.theme.logo + '" />');
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
                widget.on(button, "click", attributes.click);
            } else if (attributes.click !== false) {
                widget.on(button, "click", widget.toggle.bind(widget, panelId));
            } else {
                buttonContainer.classList.add("weavy-disabled");
            }

            if (widget.nodes.dock) {
                widget.nodes.dock.appendChild(buttonContainer);
            } else {
                _addButtons.push(buttonContainer);
            }

            showButton(buttonContainer);

            return buttonContainer;
        };

        function showButton(buttonContainer, timeout) {
            timeout = timeout || 0;
            widget.timeout(timeout).then(function () {
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
        widget.removeButton = function (panelId) {
            // TODO: remove from _addButtons as well
            var $buttonContainer = $(widget.nodes.dock).find(widget.getId("#weavy-button-container-" + panelId));
            if ($buttonContainer.length) {
                $buttonContainer.addClass("weavy-disabled");

                if ($buttonContainer.find(".weavy-button").hasClass("weavy-open")) {
                    widget.timeout(0).then(function () {
                        widget.close();
                    });
                }
                removedButtonClone($buttonContainer[0]);
                $buttonContainer.remove();
            }
        };

        // close all bubbles
        widget.on("close", function (e) {
            $(".weavy-button", widget.nodes.dockContainer).removeClass("weavy-open");
        });

        // open specified bubble (personal, messenger or bubble)
        widget.on("open", function (e, open) {
            $.when(widget.awaitBlocked, widget.awaitLoaded).then(function () {
                var $buttonContainer = $(widget.getId("#weavy-button-container-" + open.panelId), widget.nodes.dockContainer);
                var $button = $(".weavy-button", $buttonContainer);
                if ($buttonContainer.length) {
                    if ($buttonContainer.hasClass("weavy-removed")) {
                        // if the bubble should be delayed because of add transition
                        requestAnimationFrame(function () {
                            widget.timeout(100).then(function () {
                                $(".weavy-button", widget.nodes.dock).removeClass("weavy-open");
                                $button.addClass("weavy-open");
                            });
                        });

                    } else {
                        $(".weavy-button", widget.nodes.dock).removeClass("weavy-open");
                        $button.addClass("weavy-open");
                    }
                } else {
                    $(".weavy-button", widget.nodes.dock).removeClass("weavy-open");
                }
            });
        });

        widget.on("panel-loading", function (e, panelLoading) {
            var $button = $(widget.getId("#weavy-button-container-" + panelLoading.panelId) + " .weavy-button", widget.nodes.dock);

            if (panelLoading.isLoading) {
                $button.addClass(panelLoading.fill ? "weavy-loading weavy-loading-fill" : "weavy-loading");
            } else {
                $button.removeClass("weavy-loading weavy-loading-fill");
            }
        });

        widget.on("build", function () {
            var options = widget.options.plugins[PLUGIN_NAME];

            if (!widget.nodes.dockContainer) {
                widget.nodes.dockContainer = document.createElement("div");
                widget.nodes.dock = document.createElement("div");

                widget.nodes.scrollBlocker = document.createElement("div");
                widget.nodes.scrollBlocker.classList.add("weavy-scroll-blocker");

                var weavyButtonName = widget.plugins.authentication ? widget.options.plugins.authentication.frameName : "weavy";
                widget.nodes.weavyButtonContainer = widget.addButton(weavyButtonName, { title: widget.options.installationName, iconTransparent: true, click: false });
                widget.nodes.weavyButtonContainer.classList.add("weavy-button-container-weavy", "weavy-show");
                widget.nodes.weavyButton = widget.nodes.weavyButtonContainer.querySelector(".weavy-button");
                widget.nodes.weavyButton.classList.add("weavy-button-weavy");

                widget.nodes.dockContainer.appendChild(widget.nodes.dock);

                // dock
                widget.nodes.dockContainer.className = "weavy-dock-container " + options.className;
                widget.nodes.dock.className = "weavy-dock";

                widget.nodes.container.classList.add(options.themeClassName, options.positionClassName);

                widget.nodes.bubblesGlobal = document.createElement("div");
                widget.nodes.bubblesPersonal = document.createElement("div");

                widget.nodes.dock.appendChild(widget.nodes.bubblesGlobal);
                widget.nodes.dock.appendChild(widget.nodes.bubblesPersonal);

                // global bubbles container
                widget.nodes.bubblesGlobal.id = widget.getId("weavy-bubbles-global");
                widget.nodes.bubblesGlobal.className = "weavy-bubbles-global weavy-bubbles";

                // personal bubbles container
                widget.nodes.bubblesPersonal.id = widget.getId("weavy-bubbles-personal");
                widget.nodes.bubblesPersonal.className = "weavy-bubbles-personal weavy-bubbles";

                if (widget.plugins.authentication) {
                    $(widget.nodes.weavyButton).on("click", widget.toggle.bind(widget, widget.options.plugins.authentication.frameName, widget.signInUrl));
                    widget.nodes.weavyButton.classList.remove("weavy-disabled");
                }

                widget.one("after:build", function () {
                    var options = widget.options.plugins[PLUGIN_NAME];
                    widget.nodes.container.appendChild(widget.nodes.dockContainer);
                    widget.nodes.panels.classList.add(options.panelsClassName);
                    widget.nodes.panels.appendChild(widget.nodes.scrollBlocker);
                    widget.nodes.dockContainer.appendChild(widget.nodes.panels);
                });
            }

            // Add requested buttons
            for (var button in _addButtons) {
                widget.nodes.dock.appendChild(_addButtons[button]);
            }
            _addButtons = [];
        });

        widget.on("load", function () {
            if (widget.isAuthenticated()) {
                widget.nodes.weavyButtonContainer.classList.remove("weavy-show");
            } else {
                widget.nodes.weavyButtonContainer.classList.add("weavy-show");
            }

            addAndRemoveBubbleItems();
        });

        widget.on("bubble-removed", function (e, data) {
            removeBubbleItems(data.spaceId);
        });

        widget.on("bubble-added", function (e, data) {
            addAndRemoveBubbleItems();
        });

        widget.on("after:options", function (e, data) {
            if (widget.nodes.dock) {
                addAndRemoveBubbleItems();
            }
        });

        widget.on("space-trashed", function (e, data) {
            removeBubbleItems(data.id, true);
        });

        widget.on("signing-out", function () {
            widget.nodes.weavyButtonContainer.classList.add("weavy-show");
        });

        widget.on("signing-in signing-out", function () {
            if (widget.nodes.weavyButton) {
                widget.nodes.weavyButton.classList.add("weavy-loading");

                var onMessage = function(e) {
                    e = e.originalEvent || e;

                    switch (e.data.name) {
                        case "signed-in":
                        case "signed-out":
                        case "authentication-error":
                            widget.nodes.weavyButton.classList.remove("weavy-loading");
                            widget.off(window, "message", onMessage);
                            break;
                    }
                }

                // listen to signed-out message
                widget.on(window, "message", onMessage);
            }
        });


        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.dock.defaults = {
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
     * @property {string} positionClassName=weavy-middle - Classes added to `widget.nodes.container` to set the default position of the dock. <br> • **weavy-left**<br> • **weavy-right**<br> • **weavy-top**<br> • **weavy-middle**<br> • **weavy-bottom**
     * @property {string} panelsClassName=weavy-dock-panels - Classes added to the {@link panels} container.
     * @property {string} themeClassName=weavy-extended - Default theme class used by the dock. <br> • **weavy-default** - only basic styles<br> • **weavy-extended** - all styles for the dock<br> • **weavy-custom** - only core styles
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
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
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = [
        "bubbles",
        "panels",
        "theme"
    ];

})(jQuery);
