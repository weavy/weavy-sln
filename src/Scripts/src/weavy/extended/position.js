(function ($) {
    var PLUGIN_NAME = "position";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Collapsing {@link dock} and drag'n'drop positioning
     * 
     * @mixin position
     * @returns {Weavy.plugins.position}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [Weavy]{@link Weavy#nodes}
         * @instance
         * @member nodes
         * @memberof position
         * @extends Weavy#nodes
         * @typicalname weavy.nodes
         */

        /**
         *  Reference to this instance
         *  @lends position#
         */
        var weavy = this;

        var minimizeTimer;
        var dragData = null;

        /**
         * The element used for hiding default visual representation when dragging.
         * 
         * @alias position#nodes#hiddenDragImage
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:load}
         */
        weavy.nodes.hiddenDragImage = null

        /**
         * Set collapsed weavy, which is a compact visual representation of the full {@link dock}.
         * 
         * @emits position#collapse
         */
        weavy.collapse = function () {
            if (!$(weavy.nodes.container).is(".weavy-no-collapse, .weavy-open, .weavy-before-drag, .weavy-drag, .weavy-snap")) {
                $(weavy.nodes.container).addClass("weavy-collapsed");
                minimizeTimeout.apply(weavy);

                /**
                 * Triggered when the {@link dock} is collapsed.
                 * 
                 * @event position#collapse
                 * @category events
                 */
                weavy.triggerEvent("collapse", null);
            }
        };

        /**
         * Set minimized weavy, which is a mimial visual representation of the {@link dock} only containing a small floating button.
         * If the dock is in normal state it will also trigger {@link position#collapse}.
         * 
         * @emits position#collapse
         * @emits position#minimize
         */
        weavy.minimize = function () {
            if (!$(weavy.nodes.container).is(".weavy-no-collapse, .weavy-open, .weavy-before-drag, .weavy-drag, .weavy-snap")) {
                var isCollapsed = $(weavy.nodes.container).hasClass("weavy-collapsed");
                $(weavy.nodes.container).addClass("weavy-collapsed weavy-minimized");

                if (!isCollapsed) {
                    weavy.triggerEvent("collapse", null);
                }

                /**
                 * Triggered when the {@link dock} is minimized.
                 * 
                 * @event position#minimize
                 * @category events
                 */
                weavy.triggerEvent("minimize", null);
            }
            clearMinimizeTimeout.apply(weavy);

            if (typeof weavy.preloadFrames === "function") {
                weavy.timeout(200).then(weavy.preloadFrames);
            }
        };

        /**
         * Unset {@link position#collapse}/{@link position#minimize} states and return to normal {@link dock} mode.
         */
        weavy.restore = function () {
            var $container = $(weavy.nodes.container);
            if ($container.hasClass('weavy-collapsed') || $container.hasClass('weavy-minimized')) {
                $container.removeClass("weavy-collapsed weavy-minimized");

                /**
                 * Triggered when the {@link moduel:dock} leaves {@link position#collapse}/{@link position#minimize} states and returns to normal state.
                 * 
                 * @event position#restore
                 * @category events
                 */
                weavy.triggerEvent("restore", null);
            }
            clearMinimizeTimeout.apply(weavy);
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
            var options = weavy.options.plugins[PLUGIN_NAME];

            clearMinimizeTimeout();
            if ($(weavy.nodes.container).hasClass("weavy-collapsed")) {
                minimizeTimer = weavy.timeout(options.minimizeDelay || 30000).then(function () {
                    weavy.minimize.apply(weavy);
                });
            }
        }

        function setPositionClasses() {
            var options = weavy.options.plugins[PLUGIN_NAME];

            if (!weavy.nodes.hiddenDragImage) {
                weavy.nodes.hiddenDragImage = document.createElement("div");
                weavy.nodes.container.appendChild(weavy.nodes.hiddenDragImage);
            }

            //Set Classes
            weavy.nodes.container.className += " " + options.positionClassName

            // draggable
            weavy.nodes.dock.classList.add("weavy-draggable");
            weavy.nodes.dock.setAttribute("draggable", "true");

            // draggable transparent image
            weavy.nodes.hiddenDragImage.className = "weavy-dragimage";

            // set draggable position
            var position = weavy.retrieveItem("position", true);
            if (position) {
                setPosition(position);
            }

            weavy.nodes.container.classList.remove("weavy-before-drag");

            if (!weavy.isAuthenticated()) {
                weavy.nodes.container.classList.remove("weavy-collapsed", "weavy-minimized");
                weavy.nodes.container.classList.add("weavy-no-collapse");
            } else {
                weavy.nodes.container.classList.remove("weavy-no-collapse");
            }

            minimizeTimeout();
        }

        function clearEvents() {
            weavy.nodes.container.removeEventListener("drop", drop, false);
            weavy.nodes.container.removeEventListener("dragover", dragOver, false);

            weavy.nodes.dock.removeEventListener("mousedown", dragBeforeStart, true);
            weavy.nodes.dock.removeEventListener("mouseup", dragBeforeStartEnd, false);
            weavy.nodes.dock.removeEventListener("dragstart", dragStart, false);
            weavy.nodes.dock.removeEventListener("dragend", drop, false);
            weavy.nodes.dock.removeEventListener("click", weavy.restore, false);
            weavy.nodes.dock.removeEventListener("mouseover", minimizeTimeout, { passive: true });

            document.documentElement.removeEventListener("mousedown", weavy.collapse, false);
        }

        function initializeEvents() {
            weavy.nodes.container.addEventListener("drop", drop, false);
            weavy.nodes.container.addEventListener("dragover", dragOver, false);

            weavy.nodes.dock.addEventListener("mousedown", dragBeforeStart, true);
            weavy.nodes.dock.addEventListener("mouseup", dragBeforeStartEnd, false);
            weavy.nodes.dock.addEventListener("dragstart", dragStart, false);
            weavy.nodes.dock.addEventListener("dragend", drop, false);
            weavy.nodes.dock.addEventListener("click", weavy.restore, false);
            weavy.nodes.dock.addEventListener("mouseover", minimizeTimeout, { passive: true });

            document.documentElement.addEventListener("mousedown", weavy.collapse, false);
        }

        // drag and drop methods
        function setPosition(position) {
            if (position.q === 1 || position.q === 2) {
                $(weavy.nodes.container).removeClass("weavy-bottom");
                $(weavy.nodes.dock).css("top", position.o + "px").css("bottom", "");
            } else {
                $(weavy.nodes.container).addClass("weavy-bottom");
                $(weavy.nodes.dock).css("top", "").css("bottom", position.o + "px");
            }
            if (position.q === 1 || position.q === 3) {
                $(weavy.nodes.container).addClass("weavy-left");
            } else {
                $(weavy.nodes.container).removeClass("weavy-left");
            }
            if (position.m) {
                $(weavy.nodes.container).addClass("weavy-middle");
            } else {
                $(weavy.nodes.container).removeClass("weavy-middle");
            }
        }

        function setDragPosition(x, y, forceEdge) {
            var options = weavy.options.plugins[PLUGIN_NAME];

            // set snapping with options.snappingX or CSS --weavy-snapping-x
            var draggableStyles = getComputedStyle(weavy.nodes.dock);
            var weavyRem = parseFloat(draggableStyles.getPropertyValue("--weavy-rem")) || 16;
            var snappingX = weavyRem * (parseFloat(draggableStyles.getPropertyValue("--weavy-snapping-x")) || options.snappingX);
            var snappingY = weavyRem * (parseFloat(draggableStyles.getPropertyValue("--weavy-snapping-y")) || options.snappingY);

            var isLeft = $(weavy.nodes.container).hasClass("weavy-left");
            var isCollapsed = $(weavy.nodes.container).hasClass("weavy-collapsed") && !$(weavy.nodes.container).hasClass("weavy-open");
            var scale = isCollapsed ? 0.8 : 1.0;

            var $win = $(window);
            var w = $win.width();
            var h = $(weavy.nodes.dockContainer).outerHeight();
            var dt = weavy.nodes.dock.offsetTop;
            var dh = $(weavy.nodes.dock).outerHeight();
            var dw = $(weavy.nodes.dock).outerWidth()
            var mt = parseInt($(weavy.nodes.dock).css("margin-top")) || 0;
            var mb = parseInt($(weavy.nodes.dock).css("margin-bottom")) || 0;
            var ml = parseInt($(weavy.nodes.dock).css("margin-left")) || 0;
            var mr = parseInt($(weavy.nodes.dock).css("margin-right")) || 0;

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
                $(weavy.nodes.dock).addClass("weavy-snap");
            } else {
                if (!weavy.clearDragSnap && $(weavy.nodes.dock).hasClass("weavy-snap")) {
                    weavy.clearDragSnap = weavy.timeout(150).then(function () { $(weavy.nodes.dock).removeClass("weavy-snap"); weavy.clearDragSnap = null; });
                }
            }

            $(weavy.nodes.dock).css("transform", "translate(" + adjustedX + "px, " + adjustedY + "px)" + ($(weavy.nodes.container).hasClass("weavy-collapsed") ? " scale(.8)" : ""));
        }

        function getDragPos(ev) {
            var options = weavy.options.plugins[PLUGIN_NAME];

            // set snapping with options.snappingY or CSS --weavy-snapping-y
            var $dock = $(weavy.nodes.dock);
            var weavyRem = parseInt($dock.css("--weavy-rem")) || 16;
            var snappingY = weavyRem * (parseFloat($dock.css("--weavy-snapping-y")) || options.snappingY);

            var isCollapsed = $(weavy.nodes.container).hasClass("weavy-collapsed") && !$(weavy.nodes.container).hasClass("weavy-open");
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
            $(weavy.nodes.container).addClass("weavy-before-drag");
        }

        function dragBeforeStartEnd(ev) {
            // remove class inidicating that we are about to maybe drag
            $(weavy.nodes.container).removeClass("weavy-before-drag");
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
            var rect = weavy.nodes.dock.getBoundingClientRect();
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
            $(weavy.nodes.container).addClass("weavy-drag");

            // Chrome/Mac needs a reasonably big drag-image to not set an extra dragging icon
            // We set it to the weavy.nodes.hiddenDragImage which has opacity 0
            if (ev.dataTransfer.setDragImage) {
                ev.dataTransfer.setDragImage(weavy.nodes.hiddenDragImage, 0, 0);
            } else {
                // IE/Edge
                $(weavy.nodes.dock).css("opacity", 0).css("transition", "none");
            }

            var pos = getDragPos(ev);
            setPosition(pos);
        }

        function dragOver(ev) {
            if (dragData) {
                // we need to cancel the event here for the drop event to fire
                ev.preventDefault();

                // IE/Edge
                $(weavy.nodes.dock).css("opacity", "");

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
                    $(weavy.nodes.container).removeClass("weavy-drag");
                    $(weavy.nodes.dock).removeClass("weavy-snap").css("transform", "").css("transition", "");
                    weavy.timeout(50).then(dragBeforeStartEnd);
                };

                if ($(weavy.nodes.dock).hasClass("weavy-snap")) {
                    // Wait for transition
                    weavy.timeout(150).then(finishDrag);
                } else {
                    finishDrag();

                }

                // save position in local storage
                weavy.storeItem("position", pos, true);
            }

            dragData = null;
        }

        weavy.on("open", function () {
            if (!weavy.isBlocked) {
                weavy.restore();
            }
        });

        weavy.one("load", function (e) {
            setPositionClasses.call(weavy);
            //clearEvents.call(weavy);
            initializeEvents.call(weavy);
        });

        weavy.on("signing-out", function () {
            weavy.nodes.container.classList.add("weavy-no-collapse");
        });

        weavy.on("destroy", function () {
            clearEvents();
        });
    }

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.position.defaults = {
     *     positionClassName: 'weavy-collapsed',
     *     snappingX: 4,
     *     snappingY: 4,
     *     minimizeDelay: 15000
     * };
     * 
     * @name defaults
     * @memberof position
     * @type {Object}
     * @property {string} positionClassName=weavy-collapsed - Classname added to [weavy.nodes.container]{@link Weavy#nodes#container} at load.
     * @property {int} snappingX=4 - Horizontal snapping in {@link external:rem} when dragging
     * @property {int} snappingY=4 - Vertical snapping in {@link external:rem} when dragging
     * @property {int} minimizeDelay=15000 - Time before the dock is automatically minimized
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        positionClassName: 'weavy-collapsed',
        snappingX: 4,
        snappingY: 4,
        minimizeDelay: 15000
    }

    /**
     * Non-optional dependencies.
     * - {@link dock}
     * 
     * @name dependencies
     * @memberof position
     * @type {string[]}
     */
    Weavy.plugins[PLUGIN_NAME].dependencies = ["dock"];

})(jQuery);

/**
 * @external rem
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/length
 */
