(function ($) {
    var PLUGIN_NAME = "position";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        var widget = this;
        var minimizeTimer;

        // dom elements
        widget.dragData = null;

        // set collapsed widget
        WeavyWidget.prototype.collapse = function () {
            if (!$(widget.container).is(".weavy-no-collapse, .weavy-open, .weavy-before-drag, .weavy-drag, .weavy-snap")) {
                $(widget.container).addClass("weavy-collapsed");
                minimizeTimeout.apply(widget);
                widget.triggerEvent("collapse", null);
            }
        };

        // set minimized widget
        WeavyWidget.prototype.minimize = function () {
            if (!$(widget.container).is(".weavy-no-collapse, .weavy-open, .weavy-before-drag, .weavy-drag, .weavy-snap")) {
                var isCollapsed = $(widget.container).hasClass("weavy-collapsed");
                $(widget.container).addClass("weavy-collapsed weavy-minimized");
                if (!isCollapsed) {
                    widget.triggerEvent("collapse", null);
                }
                widget.triggerEvent("minimize", null);
            }
            clearMinimizeTimeout.apply(widget);

            if (typeof widget.preloadFrames === "function") {
                setTimeout(widget.preloadFrames, 200);
            }
        };

        // unset collapsed/minimized widget  
        WeavyWidget.prototype.restore = function () {
            var $container = $(widget.container);
            if ($container.hasClass('weavy-collapsed') || $container.hasClass('weavy-minimized')) {
                $container.removeClass("weavy-collapsed weavy-minimized");
                widget.triggerEvent("restore", null);
            }
            clearMinimizeTimeout.apply(widget);
        };

        function clearMinimizeTimeout() {
            if (minimizeTimer) {
                try {
                    clearTimeout(minimizeTimer);
                    minimizeTimer = null;
                } catch (e) { }
            }
        }

        function minimizeTimeout() {
            clearMinimizeTimeout();
            if ($(widget.container).hasClass("weavy-collapsed")) {
                minimizeTimer = setTimeout(widget.minimize.bind(widget), options.minimize_delay || 30000);
            }
        }

        function setPositionClasses() {

            if (!widget.dragImage) {
                widget.dragImage = document.createElement("div");
                widget.container.appendChild(widget.dragImage);
            }

            //Set Classes
            widget.container.className += " " + options.position_class_name

            // draggable
            widget.draggable.setAttribute("draggable", "true");

            // draggable transparent image
            widget.dragImage.className = "weavy-dragimage";

            // set draggable position
            var position = widget.retrieveItem("position", true);
            if (position) {
                setPosition(position);
            }

            widget.container.classList.remove("weavy-before-drag");

            if (!widget.options.user_id) {
                widget.container.classList.remove("weavy-collapsed", "weavy-minimized");
                widget.container.classList.add("weavy-no-collapse");
            }

            minimizeTimeout.apply(widget);
        }

        function clearEvents() {
            widget.container.removeEventListener("drop", drop, false);
            widget.container.removeEventListener("dragover", dragOver, false);

            widget.draggable.removeEventListener("mousedown", dragBeforeStart, true);
            widget.draggable.removeEventListener("mouseup", dragBeforeStartEnd, false);
            widget.draggable.removeEventListener("dragstart", dragStart, false);
            widget.draggable.removeEventListener("dragend", drop, false);
            widget.draggable.removeEventListener("click", widget.restore.bind(widget));
            widget.draggable.removeEventListener("mouseover", minimizeTimeout.bind(widget), { passive: true });

            document.documentElement.removeEventListener("mousedown", widget.collapse.bind(widget), false);
        }

        function initializeEvents() {
            widget.container.addEventListener("drop", drop, false);
            widget.container.addEventListener("dragover", dragOver, false);

            widget.draggable.addEventListener("mousedown", dragBeforeStart, true);
            widget.draggable.addEventListener("mouseup", dragBeforeStartEnd, false);
            widget.draggable.addEventListener("dragstart", dragStart, false);
            widget.draggable.addEventListener("dragend", drop, false);
            widget.draggable.addEventListener("click", widget.restore.bind(widget));
            widget.draggable.addEventListener("mouseover", minimizeTimeout.bind(widget), { passive: true });

            document.documentElement.addEventListener("mousedown", widget.collapse.bind(widget), false);
        }

        // drag and drop methods
        function setPosition(position) {
            if (position.q === 1 || position.q === 2) {
                $(widget.container).removeClass("weavy-bottom");
                $(widget.draggable).css("top", position.o + "px").css("bottom", "");
            } else {
                $(widget.container).addClass("weavy-bottom");
                $(widget.draggable).css("top", "").css("bottom", position.o + "px");
            }
            if (position.q === 1 || position.q === 3) {
                $(widget.container).addClass("weavy-left");
            } else {
                $(widget.container).removeClass("weavy-left");
            }
            if (position.m) {
                $(widget.container).addClass("weavy-middle");
            } else {
                $(widget.container).removeClass("weavy-middle");
            }
        }

        function setDragPosition(x, y, forceEdge) {
            // set snapping with options.snapping_x or CSS --weavy-snapping-x
            var draggableStyles = getComputedStyle(widget.draggable);
            var weavyRem = parseFloat(draggableStyles.getPropertyValue("--weavy-rem")) || 16;
            var snappingX = weavyRem * (parseFloat(draggableStyles.getPropertyValue("--weavy-snapping-x")) || options.snapping_x);
            var snappingY = weavyRem * (parseFloat(draggableStyles.getPropertyValue("--weavy-snapping-y")) || options.snapping_y);

            var isLeft = $(widget.container).hasClass("weavy-left");
            var isCollapsed = $(widget.container).hasClass("weavy-collapsed") && !$(widget.container).hasClass("weavy-open");
            var scale = isCollapsed ? 0.8 : 1.0;

            var $win = $(window);
            var w = $win.width();
            var h = $(widget.buttons).outerHeight();
            var dt = widget.draggable.offsetTop;
            var dh = $(widget.draggable).outerHeight();
            var dw = $(widget.draggable).outerWidth()
            var mt = parseInt($(widget.draggable).css("margin-top")) || 0;
            var mb = parseInt($(widget.draggable).css("margin-bottom")) || 0;
            var ml = parseInt($(widget.draggable).css("margin-left")) || 0;
            var mr = parseInt($(widget.draggable).css("margin-right")) || 0;

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
                $(widget.draggable).addClass("weavy-snap");
            } else {
                if (!widget.clearDragSnap && $(widget.draggable).hasClass("weavy-snap")) {
                    widget.clearDragSnap = setTimeout(function () { $(widget.draggable).removeClass("weavy-snap"); widget.clearDragSnap = null; }, 150);
                }
            }

            $(widget.draggable).css("transform", "translate(" + adjustedX + "px, " + adjustedY + "px)" + ($(widget.container).hasClass("weavy-collapsed") ? " scale(.8)" : ""));
        }

        function getDragPos(ev) {
            // set snapping with options.snappingY or CSS --weavy-snapping-y
            var $draggable = $(widget.draggable);
            var weavyRem = parseInt($draggable.css("--weavy-rem")) || 16;
            var snappingY = weavyRem * (parseFloat($draggable.css("--weavy-snapping-y")) || options.snapping_y);

            var isCollapsed = $(widget.container).hasClass("weavy-collapsed") && !$(widget.container).hasClass("weavy-open");
            var scale = isCollapsed ? 0.8 : 1.0;

            var $win = $(window);
            var w = $win.width();
            var h = $win.height()
            var top = ev.clientY - widget.dragData.cy < (h / 2);
            var left = ev.clientX - widget.dragData.cx < (w / 2);
            var middle = ev.clientY - widget.dragData.cy < (h / 2 + snappingY) && ev.clientY - widget.dragData.cy > (h / 2 - snappingY);

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
                offsetY = ev.clientY - widget.dragData.cy - widget.dragData.h / scale / 2 - parseInt($draggable.css("margin-top"));
            } else {
                offsetY = h - (ev.clientY - widget.dragData.cy + widget.dragData.h / scale / 2 + parseInt($draggable.css("margin-bottom")));
            }
            offsetY = Math.max(0, offsetY);

            // set new position
            var pos = { q: q, o: offsetY, m: middle };

            return pos;
        }

        function dragBeforeStart(ev) {
            // add class inidicating that we are about to maybe drag
            $(widget.container).addClass("weavy-before-drag");
        }

        function dragBeforeStartEnd(ev) {
            // remove class inidicating that we are about to maybe drag
            $(widget.container).removeClass("weavy-before-drag");
        }

        function dragStart(ev) {
            ev.stopPropagation();
            ev.dataTransfer.effectAllowed = "move";
            ev.dataTransfer.setData("text/plain", ""); // needed to initiate drag
            ev.dataTransfer.dropEffect = "move";

            // store drag offset (where in the draggable did we click) and height of draggable
            var rect = widget.draggable.getBoundingClientRect();
            widget.dragData = {
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
            $(widget.container).addClass("weavy-drag");

            // Chrome/Mac needs a reasonably big drag-image to not set an extra dragging icon
            // We set it to the widget.dragImage which has opacity 0
            if (ev.dataTransfer.setDragImage) {
                ev.dataTransfer.setDragImage(widget.dragImage, 0, 0);
            } else {
                // IE/Edge
                $(widget.draggable).css("opacity", 0).css("transition", "none");
            }

            var pos = getDragPos(ev);
            setPosition(pos);
        }

        function dragOver(ev) {
            if (widget.dragData) {
                // we need to cancel the event here for the drop event to fire
                ev.preventDefault();

                // IE/Edge
                $(widget.draggable).css("opacity", "");

                ev.dataTransfer.dropEffect = "move";
                setDragPosition(ev.clientX - widget.dragData.startX, ev.clientY - widget.dragData.startY);
            }
        }

        function drop(ev) {
            ev.preventDefault();

            if (widget.dragData) {
                var pos = getDragPos(ev);

                setDragPosition(ev.clientX - widget.dragData.startX, ev.clientY - widget.dragData.startY, true);

                var finishDrag = function () {
                    setPosition(pos);
                    // remove class indicating that we are dragging the buttons
                    $(widget.container).removeClass("weavy-drag");
                    $(widget.draggable).removeClass("weavy-snap").css("transform", "").css("transition", "");
                    setTimeout(dragBeforeStartEnd, 50);
                };

                if ($(widget.draggable).hasClass("weavy-snap")) {
                    // Wait for transition
                    setTimeout(finishDrag, 150);
                } else {
                    finishDrag();

                }

                // save position in local storage
                widget.storeItem("position", pos, true);
            }

            widget.dragData = null;
        }

        widget.on("open", function () {
            if (!widget.isBlocked) {
                widget.restore();
            }
        });

        widget.on("load", function (e) {
            console.debug("WeavyWidget plugin onload:", PLUGIN_NAME);
            setPositionClasses.call(widget);
            clearEvents.call(widget);
            initializeEvents.call(widget);
        })
    }

    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        position_class_name: 'weavy-collapsed',
        snapping_x: 4,
        snapping_y: 4,
        minimize_delay: 15000
    }

})(jQuery);
