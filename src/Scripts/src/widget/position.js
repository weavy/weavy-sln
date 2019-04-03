(function ($) {
    var PLUGIN_NAME = "position";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Collapsing {@link ./dock|dock} and drag'n'drop positioning
     * 
     * @module position
     * @returns {WeavyWidget.plugins.position}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in {@link external:widget.nodes|WeavyWidget}
         * @instance
         * @member nodes
         * @extends external:widget.nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends module:position#
         */
        var widget = this;

        var minimizeTimer;
        var dragData = null;

        /**
         * The element used for hiding default visual representation when dragging.
         * 
         * @alias module:position#nodes#hiddenDragImage
         * @type {?Element}
         * @created Widget event: {@link ./widget#WeavyWidget+event_load|load}
         */
        widget.nodes.hiddenDragImage = null

        /**
         * Set collapsed widget, which is a compact visual representation of the full {@link ./dock|dock}.
         * 
         * @emits module:position#collapse
         */
        widget.collapse = function () {
            if (!$(widget.nodes.container).is(".weavy-no-collapse, .weavy-open, .weavy-before-drag, .weavy-drag, .weavy-snap")) {
                $(widget.nodes.container).addClass("weavy-collapsed");
                minimizeTimeout.apply(widget);

                /**
                 * Triggered when the {@link ./dock|dock} is collapsed.
                 * 
                 * @event module:position#collapse
                 * @category events
                 */
                widget.triggerEvent("collapse", null);
            }
        };

        /**
         * Set minimized widget, which is a mimial visual representation of the {@link ./dock|dock} only containing a small floating button.
         * If the dock is in normal state it will also trigger {@link module:position#collapse}.
         * 
         * @emits module:position#collapse
         * @emits module:position#minimize
         */
        widget.minimize = function () {
            if (!$(widget.nodes.container).is(".weavy-no-collapse, .weavy-open, .weavy-before-drag, .weavy-drag, .weavy-snap")) {
                var isCollapsed = $(widget.nodes.container).hasClass("weavy-collapsed");
                $(widget.nodes.container).addClass("weavy-collapsed weavy-minimized");

                if (!isCollapsed) {
                    widget.triggerEvent("collapse", null);
                }

                /**
                 * Triggered when the {@link ./dock|dock} is minimized.
                 * 
                 * @event module:position#minimize
                 * @category events
                 */
                widget.triggerEvent("minimize", null);
            }
            clearMinimizeTimeout.apply(widget);

            if (typeof widget.preloadFrames === "function") {
                widget.timeout(200).then(widget.preloadFrames);
            }
        };

        /**
         * Unset {@link module:position#collapse}/{@link module:position#minimize} states and return to normal {@link ./dock|dock} mode.
         */
        widget.restore = function () {
            var $container = $(widget.nodes.container);
            if ($container.hasClass('weavy-collapsed') || $container.hasClass('weavy-minimized')) {
                $container.removeClass("weavy-collapsed weavy-minimized");

                /**
                 * Triggered when the {@link ./dock|dock} leaves {@link module:position#collapse}/{@link module:position#minimize} states and returns to normal state.
                 * 
                 * @event module:position#restore
                 * @category events
                 */
                widget.triggerEvent("restore", null);
            }
            clearMinimizeTimeout.apply(widget);
        };

        function clearMinimizeTimeout() {
            if (minimizeTimer) {
                try {
                    minimizeTimer.reject();
                    minimizeTimer = null;
                } catch (e) { }
            }
        }

        function minimizeTimeout() {
            var options = widget.options.plugins[PLUGIN_NAME];

            clearMinimizeTimeout();
            if ($(widget.nodes.container).hasClass("weavy-collapsed")) {
                minimizeTimer = widget.timeout(options.minimizeDelay || 30000).then(function () {
                    widget.minimize.apply(widget);
                });
            }
        }

        function setPositionClasses() {
            var options = widget.options.plugins[PLUGIN_NAME];

            if (!widget.nodes.hiddenDragImage) {
                widget.nodes.hiddenDragImage = document.createElement("div");
                widget.nodes.container.appendChild(widget.nodes.hiddenDragImage);
            }

            //Set Classes
            widget.nodes.container.className += " " + options.positionClassName

            // draggable
            widget.nodes.dock.classList.add("weavy-draggable");
            widget.nodes.dock.setAttribute("draggable", "true");

            // draggable transparent image
            widget.nodes.hiddenDragImage.className = "weavy-dragimage";

            // set draggable position
            var position = widget.retrieveItem("position", true);
            if (position) {
                setPosition(position);
            }

            widget.nodes.container.classList.remove("weavy-before-drag");

            if (!widget.isAuthenticated()) {
                widget.nodes.container.classList.remove("weavy-collapsed", "weavy-minimized");
                widget.nodes.container.classList.add("weavy-no-collapse");
            } else {
                widget.nodes.container.classList.remove("weavy-no-collapse");
            }

            minimizeTimeout();
        }

        function clearEvents() {
            widget.nodes.container.removeEventListener("drop", drop, false);
            widget.nodes.container.removeEventListener("dragover", dragOver, false);

            widget.nodes.dock.removeEventListener("mousedown", dragBeforeStart, true);
            widget.nodes.dock.removeEventListener("mouseup", dragBeforeStartEnd, false);
            widget.nodes.dock.removeEventListener("dragstart", dragStart, false);
            widget.nodes.dock.removeEventListener("dragend", drop, false);
            widget.nodes.dock.removeEventListener("click", widget.restore, false);
            widget.nodes.dock.removeEventListener("mouseover", minimizeTimeout, { passive: true });

            document.documentElement.removeEventListener("mousedown", widget.collapse, false);
        }

        function initializeEvents() {
            widget.nodes.container.addEventListener("drop", drop, false);
            widget.nodes.container.addEventListener("dragover", dragOver, false);

            widget.nodes.dock.addEventListener("mousedown", dragBeforeStart, true);
            widget.nodes.dock.addEventListener("mouseup", dragBeforeStartEnd, false);
            widget.nodes.dock.addEventListener("dragstart", dragStart, false);
            widget.nodes.dock.addEventListener("dragend", drop, false);
            widget.nodes.dock.addEventListener("click", widget.restore, false);
            widget.nodes.dock.addEventListener("mouseover", minimizeTimeout, { passive: true });

            document.documentElement.addEventListener("mousedown", widget.collapse, false);
        }

        // drag and drop methods
        function setPosition(position) {
            if (position.q === 1 || position.q === 2) {
                $(widget.nodes.container).removeClass("weavy-bottom");
                $(widget.nodes.dock).css("top", position.o + "px").css("bottom", "");
            } else {
                $(widget.nodes.container).addClass("weavy-bottom");
                $(widget.nodes.dock).css("top", "").css("bottom", position.o + "px");
            }
            if (position.q === 1 || position.q === 3) {
                $(widget.nodes.container).addClass("weavy-left");
            } else {
                $(widget.nodes.container).removeClass("weavy-left");
            }
            if (position.m) {
                $(widget.nodes.container).addClass("weavy-middle");
            } else {
                $(widget.nodes.container).removeClass("weavy-middle");
            }
        }

        function setDragPosition(x, y, forceEdge) {
            var options = widget.options.plugins[PLUGIN_NAME];

            // set snapping with options.snappingX or CSS --weavy-snapping-x
            var draggableStyles = getComputedStyle(widget.nodes.dock);
            var weavyRem = parseFloat(draggableStyles.getPropertyValue("--weavy-rem")) || 16;
            var snappingX = weavyRem * (parseFloat(draggableStyles.getPropertyValue("--weavy-snapping-x")) || options.snappingX);
            var snappingY = weavyRem * (parseFloat(draggableStyles.getPropertyValue("--weavy-snapping-y")) || options.snappingY);

            var isLeft = $(widget.nodes.container).hasClass("weavy-left");
            var isCollapsed = $(widget.nodes.container).hasClass("weavy-collapsed") && !$(widget.nodes.container).hasClass("weavy-open");
            var scale = isCollapsed ? 0.8 : 1.0;

            var $win = $(window);
            var w = $win.width();
            var h = $(widget.nodes.dockContainer).outerHeight();
            var dt = widget.nodes.dock.offsetTop;
            var dh = $(widget.nodes.dock).outerHeight();
            var dw = $(widget.nodes.dock).outerWidth()
            var mt = parseInt($(widget.nodes.dock).css("margin-top")) || 0;
            var mb = parseInt($(widget.nodes.dock).css("margin-bottom")) || 0;
            var ml = parseInt($(widget.nodes.dock).css("margin-left")) || 0;
            var mr = parseInt($(widget.nodes.dock).css("margin-right")) || 0;

            var adjustedX = x;
            var adjustedY = y;

            var left = isLeft ? 0 : -w + dw * scale + mr + ml;
            var right = isLeft ? w - dw * scale - mr - ml : 0;
            var middle = h / 2 - dt - dh / 2;

            if (forceEdge) {
                snappingX = w / 2;
            }

            adjustedX = adjustedX < left + snappingX - dw / scale / 2 ? left : adjustedX; // Snap to left
            adjustedX = adjustedX >= right - snappingX + dw / scale / 2 ? right : adjustedX; // Snap to right

            adjustedY = Math.max(-1 * dt + mt, Math.min(h - dt - dh - mb, adjustedY)); // Screen restricted
            adjustedY = adjustedY > middle - snappingY && adjustedY < middle + snappingY ? middle : adjustedY; // Snap to middle

            if (adjustedX !== x || adjustedY !== y) {
                $(widget.nodes.dock).addClass("weavy-snap");
            } else {
                if (!widget.clearDragSnap && $(widget.nodes.dock).hasClass("weavy-snap")) {
                    widget.clearDragSnap = widget.timeout(150).then(function () { $(widget.nodes.dock).removeClass("weavy-snap"); widget.clearDragSnap = null; });
                }
            }

            $(widget.nodes.dock).css("transform", "translate(" + adjustedX + "px, " + adjustedY + "px)" + ($(widget.nodes.container).hasClass("weavy-collapsed") ? " scale(.8)" : ""));
        }

        function getDragPos(ev) {
            var options = widget.options.plugins[PLUGIN_NAME];

            // set snapping with options.snappingY or CSS --weavy-snapping-y
            var $dock = $(widget.nodes.dock);
            var weavyRem = parseInt($dock.css("--weavy-rem")) || 16;
            var snappingY = weavyRem * (parseFloat($dock.css("--weavy-snapping-y")) || options.snappingY);

            var isCollapsed = $(widget.nodes.container).hasClass("weavy-collapsed") && !$(widget.nodes.container).hasClass("weavy-open");
            var scale = isCollapsed ? 0.8 : 1.0;

            var $win = $(window);
            var w = $win.width();
            var h = $win.height()
            var top = ev.clientY - dragData.cy < (h / 2);
            var left = ev.clientX - dragData.cx < (w / 2);
            var middle = ev.clientY - dragData.cy < (h / 2 + snappingY) && ev.clientY - dragData.cy > (h / 2 - snappingY);

            // in which quadrant did the drop occur
            // 1 | 2
            // —————
            // 3 | 4
            var q = 2;
            if (top) {
                q = left ? 1 : 2;
            } else {
                q = left ? 3 : 4;
            }

            // calculate offset from top/bottom
            var offsetY = 0;
            if (q === 1 || q === 2) {
                offsetY = ev.clientY - dragData.cy - dragData.h / scale / 2 - parseInt($dock.css("margin-top"));
            } else {
                offsetY = h - (ev.clientY - dragData.cy + dragData.h / scale / 2 + parseInt($dock.css("margin-bottom")));
            }
            offsetY = Math.max(0, offsetY);

            // set new position
            var pos = { q: q, o: offsetY, m: middle };

            return pos;
        }

        function dragBeforeStart(ev) {
            // add class inidicating that we are about to maybe drag
            $(widget.nodes.container).addClass("weavy-before-drag");
        }

        function dragBeforeStartEnd(ev) {
            // remove class inidicating that we are about to maybe drag
            $(widget.nodes.container).removeClass("weavy-before-drag");
        }

        function dragStart(ev) {
            ev.stopPropagation();
            ev.dataTransfer.effectAllowed = "move";
            try {
                ev.dataTransfer.setData("text/plain", ""); // needed to initiate drag
            } catch (e) {
                ev.dataTransfer.setData("text", ""); // workaround for IE
            }
            ev.dataTransfer.dropEffect = "move";

            // store drag offset (where in the draggable did we click) and height of draggable
            var rect = widget.nodes.dock.getBoundingClientRect();
            dragData = {
                x: ev.clientX - rect.left,
                cx: ev.clientX - rect.left - rect.width / 2,
                y: ev.clientY - rect.top,
                cy: ev.clientY - rect.top - rect.height / 2,
                h: rect.height,
                w: rect.width,
                startX: ev.clientX,
                startY: ev.clientY
            };

            // add class inidicating that we are dragging the buttons
            $(widget.nodes.container).addClass("weavy-drag");

            // Chrome/Mac needs a reasonably big drag-image to not set an extra dragging icon
            // We set it to the widget.nodes.hiddenDragImage which has opacity 0
            if (ev.dataTransfer.setDragImage) {
                ev.dataTransfer.setDragImage(widget.nodes.hiddenDragImage, 0, 0);
            } else {
                // IE/Edge
                $(widget.nodes.dock).css("opacity", 0).css("transition", "none");
            }

            var pos = getDragPos(ev);
            setPosition(pos);
        }

        function dragOver(ev) {
            if (dragData) {
                // we need to cancel the event here for the drop event to fire
                ev.preventDefault();

                // IE/Edge
                $(widget.nodes.dock).css("opacity", "");

                ev.dataTransfer.dropEffect = "move";
                setDragPosition(ev.clientX - dragData.startX, ev.clientY - dragData.startY);
            }
        }

        function drop(ev) {
            ev.preventDefault();

            if (dragData) {
                var pos = getDragPos(ev);

                setDragPosition(ev.clientX - dragData.startX, ev.clientY - dragData.startY, true);

                var finishDrag = function () {
                    setPosition(pos);
                    // remove class indicating that we are dragging the buttons
                    $(widget.nodes.container).removeClass("weavy-drag");
                    $(widget.nodes.dock).removeClass("weavy-snap").css("transform", "").css("transition", "");
                    widget.timeout(50).then(dragBeforeStartEnd);
                };

                if ($(widget.nodes.dock).hasClass("weavy-snap")) {
                    // Wait for transition
                    widget.timeout(150).then(finishDrag);
                } else {
                    finishDrag();

                }

                // save position in local storage
                widget.storeItem("position", pos, true);
            }

            dragData = null;
        }

        widget.on("open", function () {
            if (!widget.isBlocked) {
                widget.restore();
            }
        });

        widget.one("load", function (e) {
            setPositionClasses.call(widget);
            //clearEvents.call(widget);
            initializeEvents.call(widget);
        });

        widget.on("signing-out", function () {
            widget.nodes.container.classList.add("weavy-no-collapse");
        });

        widget.on("destroy", function () {
            clearEvents();
        });
    }

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.position.defaults = {
     *     positionClassName: 'weavy-collapsed',
     *     snappingX: 4,
     *     snappingY: 4,
     *     minimizeDelay: 15000
     * };
     * 
     * @name defaults
     * @memberof module:position
     * @type {Object}
     * @property {string} positionClassName=weavy-collapsed - Classname added to {@link ./widget#WeavyWidget+nodes+container|widget.nodes.container} at load.
     * @property {int} snappingX=4 - Horizontal snapping in {@link external:rem} when dragging
     * @property {int} snappingY=4 - Vertical snapping in {@link external:rem} when dragging
     * @property {int} minimizeDelay=15000 - Time before the widget is automatically minimized
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        positionClassName: 'weavy-collapsed',
        snappingX: 4,
        snappingY: 4,
        minimizeDelay: 15000
    }

    /**
     * Non-optional dependencies.
     * - {@link ./dock|dock}
     * 
     * @name dependencies
     * @memberof module:position
     * @type {string[]}
     */
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = ["dock"];

})(jQuery);

/**
 * @external "widget.nodes"
 * @see {@link ./widget#WeavyWidget+nodes|WeavyWidget.nodes}
 */

/**
 * @external rem
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/length
 */
