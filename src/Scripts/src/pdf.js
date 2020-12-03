/* Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file contains a highly modified version of https://github.com/mozilla/pdf.js/blob/master/web/viewer.js
 */

// Polyfill for Object.assign https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign (needed because of IE)
if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) { // .length of function is 2
            'use strict';
            if (target == null) { // TypeError if undefined or null
                throw new TypeError('Cannot convert undefined or null to object');
            }

            var to = Object(target);

            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];

                if (nextSource != null) { // Skip over if undefined or null
                    for (var nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

// Polyfill for closest https://developer.mozilla.org/en-US/docs/Web/API/Element/closest (needed because of IE)
if (!Element.prototype.matches)
    Element.prototype.matches = Element.prototype.msMatchesSelector ||
        Element.prototype.webkitMatchesSelector;

if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
        var el = this;
        if (!document.documentElement.contains(el)) return null;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}

var wvy = wvy || {};
wvy.pdf = { pdfjsWebPDFJS: window.pdfjsDistBuildPdf };
(function () {
    'use strict';

    (function (root, factory) {
        factory(root.pdfjsWebPDFRenderingQueue = {});
    }(this, function (exports) {
        var CLEANUP_TIMEOUT = 30000;
        var RenderingStates = {
            INITIAL: 0,
            RUNNING: 1,
            PAUSED: 2,
            FINISHED: 3
        };
        var PDFRenderingQueue = function PDFRenderingQueueClosure() {
            function PDFRenderingQueue() {
                this.pdfViewer = null;
                this.pdfThumbnailViewer = null;
                this.onIdle = null;
                this.highestPriorityPage = null;
                this.idleTimeout = null;
                this.isThumbnailViewEnabled = false;
            }
            PDFRenderingQueue.prototype = {
                setViewer: function PDFRenderingQueue_setViewer(pdfViewer) {
                    this.pdfViewer = pdfViewer;
                },
                setThumbnailViewer: function PDFRenderingQueue_setThumbnailViewer(pdfThumbnailViewer) {
                    this.pdfThumbnailViewer = pdfThumbnailViewer;
                },
                isHighestPriority: function PDFRenderingQueue_isHighestPriority(view) {
                    return this.highestPriorityPage === view.renderingId;
                },
                renderHighestPriority: function PDFRenderingQueue_renderHighestPriority(currentlyVisiblePages) {
                    if (this.idleTimeout) {
                        clearTimeout(this.idleTimeout);
                        this.idleTimeout = null;
                    }
                    if (this.pdfViewer.forceRendering(currentlyVisiblePages)) {
                        return;
                    }
                    if (this.pdfThumbnailViewer && this.isThumbnailViewEnabled) {
                        if (this.pdfThumbnailViewer.forceRendering()) {
                            return;
                        }
                    }
                    if (this.onIdle) {
                        this.idleTimeout = setTimeout(this.onIdle.bind(this), CLEANUP_TIMEOUT);
                    }
                },
                getHighestPriority: function PDFRenderingQueue_getHighestPriority(visible, views, scrolledDown) {
                    var visibleViews = visible.views;
                    var numVisible = visibleViews.length;
                    if (numVisible === 0) {
                        return false;
                    }
                    for (var i = 0; i < numVisible; ++i) {
                        var view = visibleViews[i].view;
                        if (!this.isViewFinished(view)) {
                            return view;
                        }
                    }
                    if (scrolledDown) {
                        var nextPageIndex = visible.last.id;
                        if (views[nextPageIndex] && !this.isViewFinished(views[nextPageIndex])) {
                            return views[nextPageIndex];
                        }
                    } else {
                        var previousPageIndex = visible.first.id - 2;
                        if (views[previousPageIndex] && !this.isViewFinished(views[previousPageIndex])) {
                            return views[previousPageIndex];
                        }
                    }
                    return null;
                },
                isViewFinished: function PDFRenderingQueue_isViewFinished(view) {
                    return view.renderingState === RenderingStates.FINISHED;
                },
                renderView: function PDFRenderingQueue_renderView(view) {
                    var state = view.renderingState;
                    switch (state) {
                        case RenderingStates.FINISHED:
                            return false;
                        case RenderingStates.PAUSED:
                            this.highestPriorityPage = view.renderingId;
                            view.resume();
                            break;
                        case RenderingStates.RUNNING:
                            this.highestPriorityPage = view.renderingId;
                            break;
                        case RenderingStates.INITIAL:
                            this.highestPriorityPage = view.renderingId;
                            var continueRendering = function () {
                                this.renderHighestPriority();
                            }.bind(this);
                            view.draw().then(continueRendering, continueRendering);
                            break;
                    }
                    return true;
                }
            };
            return PDFRenderingQueue;
        }();
        exports.RenderingStates = RenderingStates;
        exports.PDFRenderingQueue = PDFRenderingQueue;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebUIUtils = {}, root.pdfjsWebPDFJS);
    }(this, function (exports, pdfjsLib) {
        var CSS_UNITS = 96.0 / 72.0;
        var DEFAULT_SCALE_VALUE = 'auto';
        var DEFAULT_SCALE = 1.0;
        var MIN_SCALE = 0.5;
        var MAX_SCALE = 2.0;
        var UNKNOWN_SCALE = 0;
        var MAX_AUTO_SCALE = 1.0;
        var SCROLLBAR_PADDING = 16;
        var VERTICAL_PADDING = 5;
        var PDFJS = pdfjsLib.PDFJS;

        PDFJS.disableFullscreen = PDFJS.disableFullscreen === undefined ? true : PDFJS.disableFullscreen;
        PDFJS.useOnlyCssZoom = PDFJS.useOnlyCssZoom === undefined ? false : PDFJS.useOnlyCssZoom;
        PDFJS.maxCanvasPixels = PDFJS.maxCanvasPixels === undefined ? 16777216 : PDFJS.maxCanvasPixels;
        PDFJS.disableHistory = PDFJS.disableHistory === undefined ? false : PDFJS.disableHistory;
        PDFJS.disableTextLayer = PDFJS.disableTextLayer === undefined ? false : PDFJS.disableTextLayer;
        PDFJS.ignoreCurrentPositionOnZoom = PDFJS.ignoreCurrentPositionOnZoom === undefined ? false : PDFJS.ignoreCurrentPositionOnZoom;
        PDFJS.externalLinkTarget = PDFJS.externalLinkTarget === undefined ? PDFJS.LinkTarget.BLANK : PDFJS.externalLinkTarget;

        function getOutputScale(ctx) {
            var devicePixelRatio = window.devicePixelRatio || 1;
            var backingStoreRatio = ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio || ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1;
            var pixelRatio = devicePixelRatio / backingStoreRatio;
            return {
                sx: pixelRatio,
                sy: pixelRatio,
                scaled: pixelRatio !== 1
            };
        }
        function scrollIntoView(element, spot, container, scrollContainer, scrollContainerHorizontal) {
            var parent = container || element.offsetParent;
            var scrollParent = scrollContainer || parent;
            var scrollParentX = scrollContainerHorizontal || scrollParent;

            if (!parent) {
                console.warn('offsetParent is not set -- cannot scroll');
                return;
            }

            var offsetY = 0;
            var offsetX = 0;

            if (element !== parent.firstElementChild) {
                offsetY = element.offsetTop - (parseInt(window.getComputedStyle(element).marginTop) || 0); //+ element.clientTop;
                offsetX = element.offsetLeft - (parseInt(window.getComputedStyle(element).marginLeft) || 0); //+ element.clientLeft;
            }

            if (parent.dataset._scaleY) {
                offsetY /= parent.dataset._scaleY;
                offsetX /= parent.dataset._scaleX;
            }

            if (spot) {
                if (spot.top !== undefined) {
                    offsetY += spot.top;
                }
                if (spot.left !== undefined) {
                    offsetX += spot.left;

                    scrollParentX.savedScrollLeft = offsetX;

                    if (scrollParentX === document.body) {
                        if (window.scrollY !== undefined) {
                            window.scrollTo(offsetX, window.scrollY);
                        } else {
                            // Used by IE
                            window.scrollTo(offsetX, document.documentElement.scrollTop);
                        }
                    } else {
                        scrollParentX.scrollLeft = offsetX;
                    }
                }
            }

            // TODO: adjust offset according to #viewer
            // offsetY = offsetY - PDFViewerApplication.pdfViewer.viewer.offsetTop;

            scrollParent.savedScrollTop = offsetY;

            if (scrollParent === document.body) {
                if (window.scrollY !== undefined) {
                    window.scrollTo(window.scrollX, offsetY);
                } else {
                    // Used by IE
                    window.scrollTo(document.documentElement.scrollLeft, offsetY);
                }
            } else {
                scrollParent.scrollTop = offsetY;
            }
        }
        function watchScroll(viewAreaElement, callback) {
            var debounceScroll = function debounceScroll(evt) {
                if (rAF) {
                    return;
                }
                rAF = window.requestAnimationFrame(function viewAreaElementScrolled() {
                    rAF = null;
                    var currentY = viewAreaElement.scrollTop;
                    var lastY = state.lastY;
                    if (currentY !== lastY) {
                        state.down = currentY > lastY;
                    }
                    state.lastY = currentY;
                    callback(state);
                });
            };
            var state = {
                down: true,
                lastY: viewAreaElement.scrollTop,
                _eventHandler: debounceScroll
            };
            var rAF = null;
            (viewAreaElement === document.body ? window : viewAreaElement).addEventListener('scroll', debounceScroll, true);
            return state;
        }
        function binarySearchFirstItem(items, condition) {
            var minIndex = 0;
            var maxIndex = items.length - 1;
            if (items.length === 0 || !condition(items[maxIndex])) {
                return items.length;
            }
            if (condition(items[minIndex])) {
                return minIndex;
            }
            while (minIndex < maxIndex) {
                var currentIndex = minIndex + maxIndex >> 1;
                var currentItem = items[currentIndex];
                if (condition(currentItem)) {
                    maxIndex = currentIndex;
                } else {
                    minIndex = currentIndex + 1;
                }
            }
            return minIndex;
        }
        function approximateFraction(x) {
            if (Math.floor(x) === x) {
                return [
                    x,
                    1
                ];
            }
            var xinv = 1 / x;
            var limit = 8;
            if (xinv > limit) {
                return [
                    1,
                    limit
                ];
            } else if (Math.floor(xinv) === xinv) {
                return [
                    1,
                    xinv
                ];
            }
            var x_ = x > 1 ? xinv : x;
            var a = 0, b = 1, c = 1, d = 1;
            while (true) {
                var p = a + c, q = b + d;
                if (q > limit) {
                    break;
                }
                if (x_ <= p / q) {
                    c = p;
                    d = q;
                } else {
                    a = p;
                    b = q;
                }
            }
            if (x_ - a / b < c / d - x_) {
                return x_ === x ? [
                    a,
                    b
                ] : [
                        b,
                        a
                    ];
            } else {
                return x_ === x ? [
                    c,
                    d
                ] : [
                        d,
                        c
                    ];
            }
        }
        function roundToDivide(x, div) {
            var r = x % div;
            return r === 0 ? x : Math.round(x - r + div);
        }
        function getVisibleElements(scrollEl, views, sortByVisibility) {
            var top, bottom, left, right;

            if (scrollEl === document.body) {
                if (window.scrollY !== undefined) {
                    top = window.scrollY;
                    left = window.scrollX;
                } else {
                    // Used by IE
                    top = document.documentElement.scrollTop;
                    left = document.documentElement.scrollLeft;
                }
                bottom = top + window.innerHeight;
                right = left + window.innerWidth;
            } else {
                top = scrollEl.scrollTop;
                left = scrollEl.scrollLeft;
                bottom = top + scrollEl.clientHeight;
                right = left + scrollEl.clientWidth;
            }


            function isElementBottomBelowViewTop(view) {
                var element = view.div;
                var elementBottom = element.offsetTop + element.clientTop + element.clientHeight;
                return elementBottom > top;
            }
            var visible = [], view, element;
            var currentHeight, viewHeight, hiddenHeight, percentHeight;
            var currentWidth, viewWidth;
            var firstVisibleElementInd = views.length === 0 ? 0 : binarySearchFirstItem(views, isElementBottomBelowViewTop);
            for (var i = firstVisibleElementInd, ii = views.length; i < ii; i++) {
                view = views[i];
                element = view.div;
                currentHeight = element.offsetTop + element.clientTop;
                viewHeight = element.clientHeight;
                if (currentHeight > bottom) {
                    break;
                }
                currentWidth = element.offsetLeft + element.clientLeft;
                viewWidth = element.clientWidth;
                if (currentWidth + viewWidth < left || currentWidth > right) {
                    continue;
                }
                hiddenHeight = Math.max(0, top - currentHeight) + Math.max(0, currentHeight + viewHeight - bottom);
                percentHeight = (viewHeight - hiddenHeight) * 100 / viewHeight | 0;
                visible.push({
                    id: view.id,
                    x: currentWidth,
                    y: currentHeight,
                    view: view,
                    percent: percentHeight
                });
            }
            var first = visible[0];
            var last = visible[visible.length - 1];
            if (sortByVisibility) {
                visible.sort(function (a, b) {
                    var pc = a.percent - b.percent;
                    if (Math.abs(pc) > 0.001) {
                        return -pc;
                    }
                    return a.id - b.id;
                });
            }
            return {
                first: first,
                last: last,
                views: visible
            };
        }
        var EventBus = function EventBusClosure() {
            function EventBus() {
                this._listeners = Object.create(null);
            }
            EventBus.prototype = {
                on: function EventBus_on(eventName, listener) {
                    var eventListeners = this._listeners[eventName];
                    if (!eventListeners) {
                        eventListeners = [];
                        this._listeners[eventName] = eventListeners;
                    }
                    eventListeners.push(listener);
                },
                off: function EventBus_on(eventName, listener) {
                    var eventListeners = this._listeners[eventName];
                    var i;
                    if (!eventListeners || (i = eventListeners.indexOf(listener)) < 0) {
                        return;
                    }
                    eventListeners.splice(i, 1);
                },
                dispatch: function EventBus_dispath(eventName) {
                    var eventListeners = this._listeners[eventName];
                    if (!eventListeners || eventListeners.length === 0) {
                        return;
                    }
                    var args = Array.prototype.slice.call(arguments, 1);
                    eventListeners.slice(0).forEach(function (listener) {
                        listener.apply(null, args);
                    });
                }
            };
            return EventBus;
        }();

        exports.CSS_UNITS = CSS_UNITS;
        exports.DEFAULT_SCALE_VALUE = DEFAULT_SCALE_VALUE;
        exports.DEFAULT_SCALE = DEFAULT_SCALE;
        exports.MIN_SCALE = MIN_SCALE;
        exports.MAX_SCALE = MAX_SCALE;
        exports.UNKNOWN_SCALE = UNKNOWN_SCALE;
        exports.MAX_AUTO_SCALE = MAX_AUTO_SCALE;
        exports.SCROLLBAR_PADDING = SCROLLBAR_PADDING;
        exports.VERTICAL_PADDING = VERTICAL_PADDING;
        exports.EventBus = EventBus;
        exports.getVisibleElements = getVisibleElements;
        exports.roundToDivide = roundToDivide;
        exports.approximateFraction = approximateFraction;
        exports.getOutputScale = getOutputScale;
        exports.scrollIntoView = scrollIntoView;
        exports.watchScroll = watchScroll;
        exports.binarySearchFirstItem = binarySearchFirstItem;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebDOMEvents = {}, root.pdfjsWebUIUtils);
    }(this, function (exports, uiUtils) {
        var EventBus = uiUtils.EventBus;
        function attachDOMEventsToEventBus(eventBus) {
            eventBus.on('documentload', function () {
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent('documentload', true, true, {});
                window.dispatchEvent(event);
            });
            eventBus.on('pagerendered', function (e) {
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent('pagerendered', true, true, {
                    pageNumber: e.pageNumber,
                    cssTransform: e.cssTransform
                });
                e.source.div.dispatchEvent(event);
            });
            eventBus.on('textlayerrendered', function (e) {
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent('textlayerrendered', true, true, { pageNumber: e.pageNumber });
                e.source.textLayerDiv.dispatchEvent(event);
            });
            eventBus.on('pagechange', function (e) {
                var event = document.createEvent('UIEvents');
                event.initUIEvent('pagechange', true, true, window, 0);
                event.pageNumber = e.pageNumber;
                e.source.container.dispatchEvent(event);
            });
            eventBus.on('pagesinit', function (e) {
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent('pagesinit', true, true, null);
                e.source.container.dispatchEvent(event);
            });
            eventBus.on('pagesloaded', function (e) {
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent('pagesloaded', true, true, { pagesCount: e.pagesCount });
                e.source.container.dispatchEvent(event);
            });
            eventBus.on('scalechange', function (e) {
                var event = document.createEvent('UIEvents');
                event.initUIEvent('scalechange', true, true, window, 0);
                event.scale = e.scale;
                event.presetValue = e.presetValue;
                e.source.container.dispatchEvent(event);
            });
        }
        var globalEventBus = null;
        function getGlobalEventBus() {
            if (globalEventBus) {
                return globalEventBus;
            }
            globalEventBus = new EventBus();
            attachDOMEventsToEventBus(globalEventBus);
            return globalEventBus;
        }
        exports.attachDOMEventsToEventBus = attachDOMEventsToEventBus;
        exports.getGlobalEventBus = getGlobalEventBus;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebPDFThumbnailView = {}, root.pdfjsWebUIUtils, root.pdfjsWebPDFRenderingQueue);
    }(this, function (exports, uiUtils, pdfRenderingQueue) {
        var getOutputScale = uiUtils.getOutputScale;
        var RenderingStates = pdfRenderingQueue.RenderingStates;
        var THUMBNAIL_WIDTH = 128;
        var THUMBNAIL_CANVAS_BORDER_WIDTH = 1;
        var PDFThumbnailView = function PDFThumbnailViewClosure() {
            function getTempCanvas(width, height) {
                var tempCanvas = PDFThumbnailView.tempImageCache;
                if (!tempCanvas) {
                    tempCanvas = document.createElement('canvas');
                    PDFThumbnailView.tempImageCache = tempCanvas;
                }
                tempCanvas.width = width;
                tempCanvas.height = height;
                tempCanvas.mozOpaque = true;
                var ctx = tempCanvas.getContext('2d', { alpha: false });
                ctx.save();
                ctx.fillStyle = 'rgb(255, 255, 255)';
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
                return tempCanvas;
            }
            function PDFThumbnailView(options) {
                var app = options.app;
                var container = options.container;
                var id = options.id;
                var defaultViewport = options.defaultViewport;
                var renderingQueue = options.renderingQueue;
                var disableCanvasToImageConversion = options.disableCanvasToImageConversion || false;
                this.id = id;
                this.renderingId = 'thumbnail' + id;
                this.pdfPage = null;
                this.rotation = 0;
                this.viewport = defaultViewport;
                this.pdfPageRotate = defaultViewport.rotation;
                this.renderingQueue = renderingQueue;
                this.renderTask = null;
                this.renderingState = RenderingStates.INITIAL;
                this.resume = null;
                this.disableCanvasToImageConversion = disableCanvasToImageConversion;
                this.pageWidth = this.viewport.width;
                this.pageHeight = this.viewport.height;
                this.pageRatio = this.pageWidth / this.pageHeight;
                this.canvasWidth = THUMBNAIL_WIDTH;
                this.canvasHeight = this.canvasWidth / this.pageRatio | 0;
                this.scale = this.canvasWidth / this.pageWidth;
                var anchor = document.createElement('a');
                anchor.href = '#p' + id;
                anchor.title = 'Page ' + id;
                anchor.onclick = function stopNavigation() {
                    app.page = id;
                    return false;
                };
                this.anchor = anchor;
                var div = document.createElement('div');
                div.id = 'thumbnailContainer' + id;
                div.className = 'thumbnail';
                this.div = div;
                if (id === 1) {
                    div.classList.add('selected');
                }
                var ring = document.createElement('div');
                ring.className = 'thumbnailSelectionRing';
                var borderAdjustment = 2 * THUMBNAIL_CANVAS_BORDER_WIDTH;
                ring.style.width = this.canvasWidth + borderAdjustment + 'px';
                ring.style.height = this.canvasHeight + borderAdjustment + 'px';
                this.ring = ring;
                div.appendChild(ring);
                anchor.appendChild(div);
                container.appendChild(anchor);
            }
            PDFThumbnailView.prototype = {
                setPdfPage: function PDFThumbnailView_setPdfPage(pdfPage) {
                    this.pdfPage = pdfPage;
                    this.pdfPageRotate = pdfPage.rotate;
                    var totalRotation = (this.rotation + this.pdfPageRotate) % 360;
                    this.viewport = pdfPage.getViewport(1, totalRotation);
                    this.reset();
                },
                reset: function PDFThumbnailView_reset() {
                    this.cancelRendering();
                    this.pageWidth = this.viewport.width;
                    this.pageHeight = this.viewport.height;
                    this.pageRatio = this.pageWidth / this.pageHeight;
                    this.canvasHeight = this.canvasWidth / this.pageRatio | 0;
                    this.scale = this.canvasWidth / this.pageWidth;
                    this.div.removeAttribute('data-loaded');
                    var ring = this.ring;
                    var childNodes = ring.childNodes;
                    for (var i = childNodes.length - 1; i >= 0; i--) {
                        ring.removeChild(childNodes[i]);
                    }
                    var borderAdjustment = 2 * THUMBNAIL_CANVAS_BORDER_WIDTH;
                    ring.style.width = this.canvasWidth + borderAdjustment + 'px';
                    ring.style.height = this.canvasHeight + borderAdjustment + 'px';
                    if (this.canvas) {
                        this.canvas.width = 0;
                        this.canvas.height = 0;
                        delete this.canvas;
                    }
                    if (this.image) {
                        this.image.removeAttribute('src');
                        delete this.image;
                    }
                },
                update: function PDFThumbnailView_update(rotation) {
                    if (typeof rotation !== 'undefined') {
                        this.rotation = rotation;
                    }
                    var totalRotation = (this.rotation + this.pdfPageRotate) % 360;
                    this.viewport = this.viewport.clone({
                        scale: 1,
                        rotation: totalRotation
                    });
                    this.reset();
                },
                cancelRendering: function PDFThumbnailView_cancelRendering() {
                    if (this.renderTask) {
                        this.renderTask.cancel();
                        this.renderTask = null;
                    }
                    this.renderingState = RenderingStates.INITIAL;
                    this.resume = null;
                },
                _getPageDrawContext: function PDFThumbnailView_getPageDrawContext(noCtxScale) {
                    var canvas = document.createElement('canvas');
                    this.canvas = canvas;
                    canvas.mozOpaque = true;
                    var ctx = canvas.getContext('2d', { alpha: false });
                    var outputScale = getOutputScale(ctx);
                    canvas.width = this.canvasWidth * outputScale.sx | 0;
                    canvas.height = this.canvasHeight * outputScale.sy | 0;
                    canvas.style.width = this.canvasWidth + 'px';
                    canvas.style.height = this.canvasHeight + 'px';
                    if (!noCtxScale && outputScale.scaled) {
                        ctx.scale(outputScale.sx, outputScale.sy);
                    }
                    return ctx;
                },
                _convertCanvasToImage: function PDFThumbnailView_convertCanvasToImage() {
                    if (!this.canvas) {
                        return;
                    }
                    if (this.renderingState !== RenderingStates.FINISHED) {
                        return;
                    }
                    var id = this.renderingId;
                    var className = 'thumbnailImage';
                    if (this.disableCanvasToImageConversion) {
                        this.canvas.id = id;
                        this.canvas.className = className;
                        this.div.setAttribute('data-loaded', true);
                        this.ring.appendChild(this.canvas);
                        return;
                    }
                    var image = document.createElement('img');
                    image.id = id;
                    image.className = className;
                    image.style.width = this.canvasWidth + 'px';
                    image.style.height = this.canvasHeight + 'px';
                    image.src = this.canvas.toDataURL();
                    this.image = image;
                    this.div.setAttribute('data-loaded', true);
                    this.ring.appendChild(image);
                    this.canvas.width = 0;
                    this.canvas.height = 0;
                    delete this.canvas;
                },
                draw: function PDFThumbnailView_draw() {
                    if (this.renderingState !== RenderingStates.INITIAL) {
                        console.error('Must be in new state before drawing');
                        return Promise.resolve(undefined);
                    }
                    this.renderingState = RenderingStates.RUNNING;
                    var resolveRenderPromise, rejectRenderPromise;
                    var promise = new Promise(function (resolve, reject) {
                        resolveRenderPromise = resolve;
                        rejectRenderPromise = reject;
                    });
                    var self = this;
                    function thumbnailDrawCallback(error) {
                        if (renderTask === self.renderTask) {
                            self.renderTask = null;
                        }
                        if (error === 'cancelled') {
                            rejectRenderPromise(error);
                            return;
                        }
                        self.renderingState = RenderingStates.FINISHED;
                        self._convertCanvasToImage();
                        if (!error) {
                            resolveRenderPromise(undefined);
                        } else {
                            rejectRenderPromise(error);
                        }
                    }
                    var ctx = this._getPageDrawContext();
                    var drawViewport = this.viewport.clone({ scale: this.scale });
                    var renderContinueCallback = function renderContinueCallback(cont) {
                        if (!self.renderingQueue.isHighestPriority(self)) {
                            self.renderingState = RenderingStates.PAUSED;
                            self.resume = function resumeCallback() {
                                self.renderingState = RenderingStates.RUNNING;
                                cont();
                            };
                            return;
                        }
                        cont();
                    };
                    var renderContext = {
                        canvasContext: ctx,
                        viewport: drawViewport
                    };
                    var renderTask = this.renderTask = this.pdfPage.render(renderContext);
                    renderTask.onContinue = renderContinueCallback;
                    renderTask.promise.then(function pdfPageRenderCallback() {
                        thumbnailDrawCallback(null);
                    }, function pdfPageRenderError(error) {
                        thumbnailDrawCallback(error);
                    });
                    return promise;
                },
                setImage: function PDFThumbnailView_setImage(pageView) {
                    if (this.renderingState !== RenderingStates.INITIAL) {
                        return;
                    }
                    var img = pageView.canvas;
                    if (!img) {
                        return;
                    }
                    if (!this.pdfPage) {
                        this.setPdfPage(pageView.pdfPage);
                    }
                    this.renderingState = RenderingStates.FINISHED;
                    var ctx = this._getPageDrawContext(true);
                    var canvas = ctx.canvas;
                    if (img.width <= 2 * canvas.width) {
                        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
                        this._convertCanvasToImage();
                        return;
                    }
                    var MAX_NUM_SCALING_STEPS = 3;
                    var reducedWidth = canvas.width << MAX_NUM_SCALING_STEPS;
                    var reducedHeight = canvas.height << MAX_NUM_SCALING_STEPS;
                    var reducedImage = getTempCanvas(reducedWidth, reducedHeight);
                    var reducedImageCtx = reducedImage.getContext('2d');
                    while (reducedWidth > img.width || reducedHeight > img.height) {
                        reducedWidth >>= 1;
                        reducedHeight >>= 1;
                    }
                    reducedImageCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, reducedWidth, reducedHeight);
                    while (reducedWidth > 2 * canvas.width) {
                        reducedImageCtx.drawImage(reducedImage, 0, 0, reducedWidth, reducedHeight, 0, 0, reducedWidth >> 1, reducedHeight >> 1);
                        reducedWidth >>= 1;
                        reducedHeight >>= 1;
                    }
                    ctx.drawImage(reducedImage, 0, 0, reducedWidth, reducedHeight, 0, 0, canvas.width, canvas.height);
                    this._convertCanvasToImage();
                },
                get pageId() {
                    return this.id;
                }
            };
            return PDFThumbnailView;
        }();
        PDFThumbnailView.tempImageCache = null;
        exports.PDFThumbnailView = PDFThumbnailView;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebToolbar = {}, root.pdfjsWebUIUtils);
    }(this, function (exports, uiUtils) {
        var DEFAULT_SCALE_VALUE = uiUtils.DEFAULT_SCALE_VALUE;
        var DEFAULT_SCALE = uiUtils.DEFAULT_SCALE;
        var MIN_SCALE = uiUtils.MIN_SCALE;
        var MAX_SCALE = uiUtils.MAX_SCALE;
        var Toolbar = function ToolbarClosure() {
            function Toolbar(options, mainContainer, eventBus) {
                this.toolbar = options.container;
                this.mainContainer = mainContainer;
                this.eventBus = eventBus;
                this.items = options;
                this.reset();
                this._bindListeners();
            }
            Toolbar.prototype = {
                setPageScale: function (pageScaleValue, pageScale) {
                    this.pageScaleValue = pageScaleValue;
                    this.pageScale = pageScale;
                    this._updateUIState();
                },
                reset: function () {
                    this.pageScaleValue = DEFAULT_SCALE_VALUE;
                    this.pageScale = DEFAULT_SCALE;
                    this.toolbar.style.visibility = 'visible';
                    this._updateUIState();
                },
                _bindListeners: function Toolbar_bindClickListeners() {
                    var eventBus = this.eventBus;
                    var self = this;
                    var items = this.items;
                    items.zoomIn.addEventListener('click', function () {
                        eventBus.dispatch('zoomin');
                    });
                    items.zoomOut.addEventListener('click', function () {
                        eventBus.dispatch('zoomout');
                    });
                    items.zoom.addEventListener('click', function () {
                        eventBus.dispatch('scalechanged', {
                            source: self,
                            value: self.pageScaleValue === 'auto' ? 'page-width' : 'auto'
                        });
                        self._updateUIState();
                    });
                },
                _updateUIState: function Toolbar_updateUIState() {
                    var items = this.items;
                    var scale = this.pageScale;
                    items.zoomOut.disabled = scale <= MIN_SCALE;
                    if (this.pageScaleValue === 'auto') {
                        items.zoom.classList.remove('zoomed');
                        items.zoom.setAttribute('title', 'Fit width');
                    } else {
                        items.zoom.classList.add('zoomed');
                        items.zoom.setAttribute('title', 'Reset zoom');
                    }
                    items.zoomIn.disabled = scale >= MAX_SCALE;
                }
            };
            return Toolbar;
        }();
        exports.Toolbar = Toolbar;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebPDFPageView = {}, root.pdfjsWebUIUtils, root.pdfjsWebPDFRenderingQueue, root.pdfjsWebDOMEvents, root.pdfjsWebPDFJS);
    }(this, function (exports, uiUtils, pdfRenderingQueue, domEvents, pdfjsLib) {
        var CSS_UNITS = uiUtils.CSS_UNITS;
        var DEFAULT_SCALE = uiUtils.DEFAULT_SCALE;
        var getOutputScale = uiUtils.getOutputScale;
        var approximateFraction = uiUtils.approximateFraction;
        var roundToDivide = uiUtils.roundToDivide;
        var RenderingStates = pdfRenderingQueue.RenderingStates;
        var TEXT_LAYER_RENDER_DELAY = 200;
        var PDFPageView = function PDFPageViewClosure() {
            function PDFPageView(options) {
                var container = options.container;
                var id = options.id;
                var scale = options.scale;
                var defaultViewport = options.defaultViewport;
                var renderingQueue = options.renderingQueue;
                var textLayerFactory = options.textLayerFactory;
                var annotationLayerFactory = options.annotationLayerFactory;
                var enhanceTextSelection = options.enhanceTextSelection || false;
                var renderInteractiveForms = options.renderInteractiveForms || false;

                this.id = id;
                this.renderingId = 'page' + id;
                this.rotation = 0;
                this.scale = scale || DEFAULT_SCALE;
                this.viewport = defaultViewport;
                this.pdfPageRotate = defaultViewport.rotation;
                this.hasRestrictedScaling = false;
                this.enhanceTextSelection = enhanceTextSelection;
                this.renderInteractiveForms = renderInteractiveForms;
                this.eventBus = options.eventBus || domEvents.getGlobalEventBus();
                this.renderingQueue = renderingQueue;
                this.textLayerFactory = textLayerFactory;
                this.annotationLayerFactory = annotationLayerFactory;
                this.paintTask = null;
                this.paintedViewport = null;
                this.renderingState = RenderingStates.INITIAL;
                this.resume = null;
                this.error = null;
                this.onBeforeDraw = null;
                this.onAfterDraw = null;
                this.textLayer = null;
                this.zoomLayer = null;
                this.annotationLayer = null;
                var div = document.createElement('div');
                div.id = 'pageContainer' + this.id;
                div.className = 'page';
                div.style.width = Math.floor(this.viewport.width) + 'px';
                div.style.height = Math.floor(this.viewport.height) + 'px';
                div.setAttribute('data-page-number', this.id);
                this.div = div;
                container.appendChild(div);
            }
            PDFPageView.prototype = {
                setPdfPage: function PDFPageView_setPdfPage(pdfPage) {
                    this.pdfPage = pdfPage;
                    this.pdfPageRotate = pdfPage.rotate;
                    var totalRotation = (this.rotation + this.pdfPageRotate) % 360;
                    this.viewport = pdfPage.getViewport(this.scale * CSS_UNITS, totalRotation);
                    this.reset();
                },
                destroy: function PDFPageView_destroy() {
                    this.zoomLayer = null;
                    this.reset();
                    if (this.pdfPage) {
                        this.pdfPage.cleanup();
                    }
                },
                reset: function PDFPageView_reset(keepZoomLayer, keepAnnotations) {
                    this.cancelRendering();
                    var div = this.div;

                    div.style.width = Math.floor(this.viewport.width) + 'px';
                    div.style.height = Math.floor(this.viewport.height) + 'px';
                    var childNodes = div.childNodes;
                    var currentZoomLayerNode = keepZoomLayer && this.zoomLayer || null;
                    var currentAnnotationNode = keepAnnotations && this.annotationLayer && this.annotationLayer.div || null;
                    for (var i = childNodes.length - 1; i >= 0; i--) {
                        var node = childNodes[i];
                        if (currentZoomLayerNode === node || currentAnnotationNode === node) {
                            continue;
                        }
                        div.removeChild(node);
                    }
                    div.removeAttribute('data-loaded');
                    if (currentAnnotationNode) {
                        this.annotationLayer.hide();
                    } else {
                        this.annotationLayer = null;
                    }
                    if (this.canvas && !currentZoomLayerNode) {
                        this.canvas.width = 0;
                        this.canvas.height = 0;
                        delete this.canvas;
                    }
                    if (!currentZoomLayerNode) {
                        this.paintedViewport = null;
                    }
                    this.loadingIconDiv = document.createElement('div');
                    this.loadingIconDiv.className = 'loadingIcon';
                    div.appendChild(this.loadingIconDiv);

                },
                update: function PDFPageView_update(scale, rotation) {
                    this.scale = scale || this.scale;
                    if (typeof rotation !== 'undefined') {
                        this.rotation = rotation;
                    }
                    var totalRotation = (this.rotation + this.pdfPageRotate) % 360;
                    this.viewport = this.viewport.clone({
                        scale: this.scale * CSS_UNITS,
                        rotation: totalRotation
                    });
                    var isScalingRestricted = false;
                    if (this.canvas && pdfjsLib.PDFJS.maxCanvasPixels > 0) {
                        var outputScale = this.outputScale;
                        if ((Math.floor(this.viewport.width) * outputScale.sx | 0) * (Math.floor(this.viewport.height) * outputScale.sy | 0) > pdfjsLib.PDFJS.maxCanvasPixels) {
                            isScalingRestricted = true;
                        }
                    }
                    if (this.canvas) {
                        if (pdfjsLib.PDFJS.useOnlyCssZoom || this.hasRestrictedScaling && isScalingRestricted) {
                            this.cssTransform(this.canvas, true);
                            this.eventBus.dispatch('pagerendered', {
                                source: this,
                                pageNumber: this.id,
                                cssTransform: true
                            });
                            return;
                        }
                        if (!this.zoomLayer) {
                            this.zoomLayer = this.canvas.parentNode;
                            this.zoomLayer.style.position = 'absolute';
                        }
                    }
                    if (this.zoomLayer) {
                        this.cssTransform(this.zoomLayer.firstChild);
                    }
                    this.reset(true, true);
                },
                cancelRendering: function PDFPageView_cancelRendering() {
                    if (this.paintTask) {
                        this.paintTask.cancel();
                        this.paintTask = null;
                    }
                    this.renderingState = RenderingStates.INITIAL;
                    this.resume = null;
                    if (this.textLayer) {
                        this.textLayer.cancel();
                        this.textLayer = null;
                    }
                },
                updatePosition: function PDFPageView_updatePosition() {
                    if (this.textLayer) {
                        this.textLayer.render(TEXT_LAYER_RENDER_DELAY);
                    }
                },
                cssTransform: function PDFPageView_transform(target, redrawAnnotations) {
                    var CustomStyle = pdfjsLib.CustomStyle;
                    var width = this.viewport.width;
                    var height = this.viewport.height;
                    var div = this.div;
                    target.style.width = target.parentNode.style.width = div.style.width = Math.floor(width) + 'px';
                    target.style.height = target.parentNode.style.height = div.style.height = Math.floor(height) + 'px';
                    var relativeRotation = this.viewport.rotation - this.paintedViewport.rotation;
                    var absRotation = Math.abs(relativeRotation);
                    var scaleX = 1, scaleY = 1;
                    if (absRotation === 90 || absRotation === 270) {
                        scaleX = height / width;
                        scaleY = width / height;
                    }
                    var cssTransform = 'rotate(' + relativeRotation + 'deg) ' + 'scale(' + scaleX + ',' + scaleY + ')';
                    CustomStyle.setProp('transform', target, cssTransform);
                    if (this.textLayer) {
                        var textLayerViewport = this.textLayer.viewport;
                        var textRelativeRotation = this.viewport.rotation - textLayerViewport.rotation;
                        var textAbsRotation = Math.abs(textRelativeRotation);
                        var scale = width / textLayerViewport.width;
                        if (textAbsRotation === 90 || textAbsRotation === 270) {
                            scale = width / textLayerViewport.height;
                        }
                        var textLayerDiv = this.textLayer.textLayerDiv;
                        var transX, transY;
                        switch (textAbsRotation) {
                            case 0:
                                transX = transY = 0;
                                break;
                            case 90:
                                transX = 0;
                                transY = '-' + textLayerDiv.style.height;
                                break;
                            case 180:
                                transX = '-' + textLayerDiv.style.width;
                                transY = '-' + textLayerDiv.style.height;
                                break;
                            case 270:
                                transX = '-' + textLayerDiv.style.width;
                                transY = 0;
                                break;
                            default:
                                console.error('Bad rotation value.');
                                break;
                        }
                        CustomStyle.setProp('transform', textLayerDiv, 'rotate(' + textAbsRotation + 'deg) ' + 'scale(' + scale + ', ' + scale + ') ' + 'translate(' + transX + ', ' + transY + ')');
                        CustomStyle.setProp('transformOrigin', textLayerDiv, '0% 0%');
                    }
                    if (redrawAnnotations && this.annotationLayer) {
                        this.annotationLayer.render(this.viewport, 'display');
                    }
                },
                get width() {
                    return this.viewport.width;
                },
                get height() {
                    return this.viewport.height;
                },
                getPagePoint: function PDFPageView_getPagePoint(x, y) {
                    return this.viewport.convertToPdfPoint(x, y);
                },
                draw: function PDFPageView_draw() {
                    if (this.renderingState !== RenderingStates.INITIAL) {
                        console.error('Must be in new state before drawing');
                        this.reset();
                    }
                    this.renderingState = RenderingStates.RUNNING;
                    var self = this;
                    var pdfPage = this.pdfPage;
                    var div = this.div;
                    var canvasWrapper = document.createElement('div');
                    canvasWrapper.style.width = div.style.width;
                    canvasWrapper.style.height = div.style.height;
                    canvasWrapper.classList.add('canvasWrapper');
                    if (this.annotationLayer && this.annotationLayer.div) {
                        div.insertBefore(canvasWrapper, this.annotationLayer.div);
                    } else {
                        div.appendChild(canvasWrapper);
                    }
                    var textLayerDiv = null;
                    var textLayer = null;
                    if (this.textLayerFactory) {
                        textLayerDiv = document.createElement('div');
                        textLayerDiv.className = 'textLayer';
                        textLayerDiv.style.width = canvasWrapper.style.width;
                        textLayerDiv.style.height = canvasWrapper.style.height;
                        if (this.annotationLayer && this.annotationLayer.div) {
                            div.insertBefore(textLayerDiv, this.annotationLayer.div);
                        } else {
                            div.appendChild(textLayerDiv);
                        }
                        textLayer = this.textLayerFactory.createTextLayerBuilder(textLayerDiv, this.id - 1, this.viewport, this.enhanceTextSelection);
                    }
                    this.textLayer = textLayer;
                    var renderContinueCallback = null;
                    if (this.renderingQueue) {
                        renderContinueCallback = function renderContinueCallback(cont) {
                            if (!self.renderingQueue.isHighestPriority(self)) {
                                self.renderingState = RenderingStates.PAUSED;
                                self.resume = function resumeCallback() {
                                    self.renderingState = RenderingStates.RUNNING;
                                    cont();
                                };
                                return;
                            }
                            cont();
                        };
                    }
                    var finishPaintTask = function finishPaintTask(error) {
                        if (paintTask === self.paintTask) {
                            self.paintTask = null;
                        }
                        if (error === 'cancelled') {
                            self.error = null;
                            return;
                        }
                        self.renderingState = RenderingStates.FINISHED;
                        if (self.loadingIconDiv) {
                            div.removeChild(self.loadingIconDiv);
                            delete self.loadingIconDiv;
                        }
                        if (self.zoomLayer) {
                            var zoomLayerCanvas = self.zoomLayer.firstChild;
                            zoomLayerCanvas.width = 0;
                            zoomLayerCanvas.height = 0;
                            if (div.contains(self.zoomLayer)) {
                                div.removeChild(self.zoomLayer);
                            }
                            self.zoomLayer = null;
                        }
                        self.error = error;
                        if (self.onAfterDraw) {
                            self.onAfterDraw();
                        }
                        self.eventBus.dispatch('pagerendered', {
                            source: self,
                            pageNumber: self.id,
                            cssTransform: false
                        });
                    };
                    var paintTask = this.paintOnCanvas(canvasWrapper);
                    paintTask.onRenderContinue = renderContinueCallback;
                    this.paintTask = paintTask;
                    var resultPromise = paintTask.promise.then(function () {
                        finishPaintTask(null);
                        if (textLayer) {
                            pdfPage.getTextContent({ normalizeWhitespace: true }).then(function textContentResolved(textContent) {
                                textLayer.setTextContent(textContent);
                                textLayer.render(TEXT_LAYER_RENDER_DELAY);
                            });
                        }
                    }, function (reason) {
                        finishPaintTask(reason);
                        throw reason;
                    });
                    if (this.annotationLayerFactory) {
                        if (!this.annotationLayer) {
                            this.annotationLayer = this.annotationLayerFactory.createAnnotationLayerBuilder(div, pdfPage, this.renderInteractiveForms);
                        }
                        this.annotationLayer.render(this.viewport, 'display');
                    }
                    div.setAttribute('data-loaded', true);
                    if (this.onBeforeDraw) {
                        this.onBeforeDraw();
                    }
                    return resultPromise;
                },
                paintOnCanvas: function (canvasWrapper) {
                    var resolveRenderPromise, rejectRenderPromise;
                    var promise = new Promise(function (resolve, reject) {
                        resolveRenderPromise = resolve;
                        rejectRenderPromise = reject;
                    });
                    var result = {
                        promise: promise,
                        onRenderContinue: function (cont) {
                            cont();
                        },
                        cancel: function () {
                            renderTask.cancel();
                        }
                    };
                    var viewport = this.viewport;
                    var canvas = document.createElement('canvas');
                    canvas.id = 'page' + this.id;
                    canvas.setAttribute('hidden', 'hidden');
                    var isCanvasHidden = true;
                    var showCanvas = function () {
                        if (isCanvasHidden) {
                            canvas.removeAttribute('hidden');
                            isCanvasHidden = false;
                        }
                    };
                    canvasWrapper.appendChild(canvas);
                    this.canvas = canvas;
                    canvas.mozOpaque = true;
                    var ctx = canvas.getContext('2d', { alpha: false });
                    var outputScale = getOutputScale(ctx);
                    this.outputScale = outputScale;
                    if (pdfjsLib.PDFJS.useOnlyCssZoom) {
                        var actualSizeViewport = viewport.clone({ scale: CSS_UNITS });
                        outputScale.sx *= actualSizeViewport.width / viewport.width;
                        outputScale.sy *= actualSizeViewport.height / viewport.height;
                        outputScale.scaled = true;
                    }
                    if (pdfjsLib.PDFJS.maxCanvasPixels > 0) {
                        var pixelsInViewport = viewport.width * viewport.height;
                        var maxScale = Math.sqrt(pdfjsLib.PDFJS.maxCanvasPixels / pixelsInViewport);
                        if (outputScale.sx > maxScale || outputScale.sy > maxScale) {
                            outputScale.sx = maxScale;
                            outputScale.sy = maxScale;
                            outputScale.scaled = true;
                            this.hasRestrictedScaling = true;
                        } else {
                            this.hasRestrictedScaling = false;
                        }
                    }
                    var sfx = approximateFraction(outputScale.sx);
                    var sfy = approximateFraction(outputScale.sy);
                    canvas.width = roundToDivide(viewport.width * outputScale.sx, sfx[0]);
                    canvas.height = roundToDivide(viewport.height * outputScale.sy, sfy[0]);
                    canvas.style.width = roundToDivide(viewport.width, sfx[1]) + 'px';
                    canvas.style.height = roundToDivide(viewport.height, sfy[1]) + 'px';
                    this.paintedViewport = viewport;
                    var transform = !outputScale.scaled ? null : [
                        outputScale.sx,
                        0,
                        0,
                        outputScale.sy,
                        0,
                        0
                    ];
                    var renderContext = {
                        canvasContext: ctx,
                        transform: transform,
                        viewport: this.viewport,
                        renderInteractiveForms: this.renderInteractiveForms
                    };
                    var renderTask = this.pdfPage.render(renderContext);
                    renderTask.onContinue = function (cont) {
                        showCanvas();
                        if (result.onRenderContinue) {
                            result.onRenderContinue(cont);
                        } else {
                            cont();
                        }
                    };
                    renderTask.promise.then(function pdfPageRenderCallback() {
                        showCanvas();
                        resolveRenderPromise(undefined);
                    }, function pdfPageRenderError(error) {
                        showCanvas();
                        rejectRenderPromise(error);
                    });
                    return result;
                }
            };
            return PDFPageView;
        }();
        exports.PDFPageView = PDFPageView;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebPDFThumbnailViewer = {}, root.pdfjsWebUIUtils, root.pdfjsWebPDFThumbnailView);
    }(this, function (exports, uiUtils, pdfThumbnailView) {
        var watchScroll = uiUtils.watchScroll;
        var getVisibleElements = uiUtils.getVisibleElements;
        var scrollIntoView = uiUtils.scrollIntoView;
        var PDFThumbnailView = pdfThumbnailView.PDFThumbnailView;
        var THUMBNAIL_SCROLL_MARGIN = -19;
        var PDFThumbnailViewer = function PDFThumbnailViewerClosure() {
            function PDFThumbnailViewer(options) {
                this.app = options.app;
                this.container = options.container;
                this.renderingQueue = options.renderingQueue;
                this.scrollContainer = options.scrollContainer || options.container;
                this.scroll = watchScroll(this.scrollContainer, this._scrollUpdated.bind(this));
                this._resetView();
            }
            PDFThumbnailViewer.prototype = {
                _scrollUpdated: function PDFThumbnailViewer_scrollUpdated() {
                    this.renderingQueue.renderHighestPriority();
                },
                getThumbnail: function PDFThumbnailViewer_getThumbnail(index) {
                    return this.thumbnails[index];
                },
                _getVisibleThumbs: function PDFThumbnailViewer_getVisibleThumbs() {
                    return getVisibleElements(this.scrollContainer, this.thumbnails);
                },
                scrollThumbnailIntoView: function PDFThumbnailViewer_scrollThumbnailIntoView(page) {
                    var selected = document.querySelector('.thumbnail.selected');
                    if (selected) {
                        selected.classList.remove('selected');
                    }
                    var thumbnail = document.getElementById('thumbnailContainer' + page);
                    if (thumbnail) {
                        thumbnail.classList.add('selected');
                    }
                    var visibleThumbs = this._getVisibleThumbs();
                    var numVisibleThumbs = visibleThumbs.views.length;
                    if (numVisibleThumbs > 0) {
                        var first = visibleThumbs.first.id;
                        var last = numVisibleThumbs > 1 ? visibleThumbs.last.id : first;
                        if (page <= first || page >= last) {
                            scrollIntoView(thumbnail, { top: THUMBNAIL_SCROLL_MARGIN }, this.container, this.scrollContainer);
                        }
                    }
                },
                get pagesRotation() {
                    return this._pagesRotation;
                },
                set pagesRotation(rotation) {
                    this._pagesRotation = rotation;
                    for (var i = 0, l = this.thumbnails.length; i < l; i++) {
                        var thumb = this.thumbnails[i];
                        thumb.update(rotation);
                    }
                },
                cleanup: function PDFThumbnailViewer_cleanup() {
                    var tempCanvas = PDFThumbnailView.tempImageCache;
                    if (tempCanvas) {
                        tempCanvas.width = 0;
                        tempCanvas.height = 0;
                    }
                    PDFThumbnailView.tempImageCache = null;
                },
                _resetView: function PDFThumbnailViewer_resetView() {
                    this.thumbnails = [];
                    this._pagesRotation = 0;
                    this._pagesRequests = [];
                    this.container.textContent = '';
                },
                setDocument: function PDFThumbnailViewer_setDocument(pdfDocument) {
                    if (this.pdfDocument) {
                        this._cancelRendering();
                        this._resetView();
                    }
                    this.pdfDocument = pdfDocument;
                    if (!pdfDocument) {
                        return Promise.resolve();
                    }
                    return pdfDocument.getPage(1).then(function (firstPage) {
                        var pagesCount = pdfDocument.numPages;
                        var viewport = firstPage.getViewport(1.0);
                        for (var pageNum = 1; pageNum <= pagesCount; ++pageNum) {
                            var thumbnail = new PDFThumbnailView({
                                app: this.app,
                                container: this.container,
                                scrollContainer: this.scrollContainer,
                                id: pageNum,
                                defaultViewport: viewport.clone(),
                                renderingQueue: this.renderingQueue,
                                disableCanvasToImageConversion: false
                            });
                            this.thumbnails.push(thumbnail);
                        }
                    }.bind(this));
                },
                _cancelRendering: function PDFThumbnailViewer_cancelRendering() {
                    for (var i = 0, ii = this.thumbnails.length; i < ii; i++) {
                        if (this.thumbnails[i]) {
                            this.thumbnails[i].cancelRendering();
                        }
                    }
                },
                _ensurePdfPageLoaded: function PDFThumbnailViewer_ensurePdfPageLoaded(thumbView) {
                    if (thumbView.pdfPage) {
                        return Promise.resolve(thumbView.pdfPage);
                    }
                    var pageNumber = thumbView.id;
                    if (this._pagesRequests[pageNumber]) {
                        return this._pagesRequests[pageNumber];
                    }
                    var promise = this.pdfDocument.getPage(pageNumber).then(function (pdfPage) {
                        thumbView.setPdfPage(pdfPage);
                        this._pagesRequests[pageNumber] = null;
                        return pdfPage;
                    }.bind(this));
                    this._pagesRequests[pageNumber] = promise;
                    return promise;
                },
                forceRendering: function () {
                    var visibleThumbs = this._getVisibleThumbs();
                    var thumbView = this.renderingQueue.getHighestPriority(visibleThumbs, this.thumbnails, this.scroll.down);
                    if (thumbView) {
                        this._ensurePdfPageLoaded(thumbView).then(function () {
                            this.renderingQueue.renderView(thumbView);
                        }.bind(this));
                        return true;
                    }
                    return false;
                }
            };
            return PDFThumbnailViewer;
        }();
        exports.PDFThumbnailViewer = PDFThumbnailViewer;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebTextLayerBuilder = {}, root.pdfjsWebDOMEvents, root.pdfjsWebPDFJS);
    }(this, function (exports, domEvents, pdfjsLib) {
        var EXPAND_DIVS_TIMEOUT = 300;
        var TextLayerBuilder = function TextLayerBuilderClosure() {
            function TextLayerBuilder(options) {
                this.textLayerDiv = options.textLayerDiv;
                this.eventBus = options.eventBus || domEvents.getGlobalEventBus();
                this.textContent = null;
                this.renderingDone = false;
                this.pageIdx = options.pageIndex;
                this.pageNumber = this.pageIdx + 1;
                this.matches = [];
                this.viewport = options.viewport;
                this.textDivs = [];
                this.textLayerRenderTask = null;
                this.enhanceTextSelection = options.enhanceTextSelection;
                this._bindMouse();
            }
            TextLayerBuilder.prototype = {
                _finishRendering: function TextLayerBuilder_finishRendering() {
                    this.renderingDone = true;
                    if (!this.enhanceTextSelection) {
                        var endOfContent = document.createElement('div');
                        endOfContent.className = 'endOfContent';
                        this.textLayerDiv.appendChild(endOfContent);
                    }
                    this.eventBus.dispatch('textlayerrendered', {
                        source: this,
                        pageNumber: this.pageNumber,
                        numTextDivs: this.textDivs.length
                    });
                },
                render: function TextLayerBuilder_render(timeout) {
                    if (!this.textContent || this.renderingDone) {
                        return;
                    }
                    this.cancel();
                    this.textDivs = [];
                    var textLayerFrag = document.createDocumentFragment();
                    this.textLayerRenderTask = pdfjsLib.renderTextLayer({
                        textContent: this.textContent,
                        container: textLayerFrag,
                        viewport: this.viewport,
                        textDivs: this.textDivs,
                        timeout: timeout,
                        enhanceTextSelection: this.enhanceTextSelection
                    });
                    this.textLayerRenderTask.promise.then(function () {
                        this.textLayerDiv.appendChild(textLayerFrag);
                        this._finishRendering();
                    }.bind(this), function (reason) {
                    });
                },
                cancel: function TextLayerBuilder_cancel() {
                    if (this.textLayerRenderTask) {
                        this.textLayerRenderTask.cancel();
                        this.textLayerRenderTask = null;
                    }
                },
                setTextContent: function TextLayerBuilder_setTextContent(textContent) {
                    this.cancel();
                    this.textContent = textContent;
                },
                _bindMouse: function TextLayerBuilder_bindMouse() {
                    var div = this.textLayerDiv;
                    var self = this;
                    var expandDivsTimer = null;
                    div.addEventListener('mousedown', function (e) {
                        if (self.enhanceTextSelection && self.textLayerRenderTask) {
                            self.textLayerRenderTask.expandTextDivs(true);
                            if (expandDivsTimer) {
                                clearTimeout(expandDivsTimer);
                                expandDivsTimer = null;
                            }
                            return;
                        }
                        var end = div.querySelector('.endOfContent');
                        if (!end) {
                            return;
                        }
                        var adjustTop = e.target !== div;
                        adjustTop = adjustTop && window.getComputedStyle(end).getPropertyValue('-moz-user-select') !== 'none';
                        if (adjustTop) {
                            var divBounds = div.getBoundingClientRect();
                            var r = Math.max(0, (e.pageY - divBounds.top) / divBounds.height);
                            end.style.top = (r * 100).toFixed(2) + '%';
                        }
                        end.classList.add('active');
                    });
                    div.addEventListener('mouseup', function (e) {
                        if (self.enhanceTextSelection && self.textLayerRenderTask) {
                            expandDivsTimer = setTimeout(function () {
                                if (self.textLayerRenderTask) {
                                    self.textLayerRenderTask.expandTextDivs(false);
                                }
                                expandDivsTimer = null;
                            }, EXPAND_DIVS_TIMEOUT);
                            return;
                        }
                        var end = div.querySelector('.endOfContent');
                        if (!end) {
                            return;
                        }
                        end.style.top = '';
                        end.classList.remove('active');
                    });
                }
            };
            return TextLayerBuilder;
        }();
        function DefaultTextLayerFactory() {
        }
        DefaultTextLayerFactory.prototype = {
            createTextLayerBuilder: function (textLayerDiv, pageIndex, viewport, enhanceTextSelection) {
                return new TextLayerBuilder({
                    textLayerDiv: textLayerDiv,
                    pageIndex: pageIndex,
                    viewport: viewport,
                    enhanceTextSelection: enhanceTextSelection
                });
            }
        };
        exports.TextLayerBuilder = TextLayerBuilder;
        exports.DefaultTextLayerFactory = DefaultTextLayerFactory;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebAnnotationLayerBuilder = {}, root.pdfjsWebUIUtils, root.pdfjsWebPDFJS);
    }(this, function (exports, uiUtils, pdfjsLib) {
        var AnnotationLayerBuilder = function AnnotationLayerBuilderClosure() {
            function AnnotationLayerBuilder(options) {
                this.pageDiv = options.pageDiv;
                this.pdfPage = options.pdfPage;
                this.renderInteractiveForms = options.renderInteractiveForms;
                this.div = null;
            }
            AnnotationLayerBuilder.prototype = {
                render: function AnnotationLayerBuilder_render(viewport, intent) {
                    var self = this;
                    var parameters = { intent: intent === undefined ? 'display' : intent };
                    this.pdfPage.getAnnotations(parameters).then(function (annotations) {
                        viewport = viewport.clone({ dontFlip: true });
                        parameters = {
                            viewport: viewport,
                            div: self.div,
                            annotations: annotations,
                            page: self.pdfPage,
                            renderInteractiveForms: self.renderInteractiveForms
                        };
                        if (self.div) {
                            pdfjsLib.AnnotationLayer.update(parameters);
                        } else {
                            if (annotations.length === 0) {
                                return;
                            }
                            self.div = document.createElement('div');
                            self.div.className = 'annotationLayer';
                            self.pageDiv.appendChild(self.div);
                            parameters.div = self.div;
                            pdfjsLib.AnnotationLayer.render(parameters);
                        }
                    });
                },
                hide: function AnnotationLayerBuilder_hide() {
                    if (!this.div) {
                        return;
                    }
                    this.div.setAttribute('hidden', 'true');
                }
            };
            return AnnotationLayerBuilder;
        }();
        function DefaultAnnotationLayerFactory() {
        }
        DefaultAnnotationLayerFactory.prototype = {
            createAnnotationLayerBuilder: function (pageDiv, pdfPage, renderInteractiveForms) {
                return new AnnotationLayerBuilder({
                    pageDiv: pageDiv,
                    pdfPage: pdfPage,
                    renderInteractiveForms: renderInteractiveForms
                });
            }
        };
        exports.AnnotationLayerBuilder = AnnotationLayerBuilder;
        exports.DefaultAnnotationLayerFactory = DefaultAnnotationLayerFactory;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebPDFViewer = {}, root.pdfjsWebUIUtils, root.pdfjsWebPDFPageView, root.pdfjsWebPDFRenderingQueue, root.pdfjsWebTextLayerBuilder, root.pdfjsWebAnnotationLayerBuilder, root.pdfjsWebDOMEvents, root.pdfjsWebPDFJS);
    }(this, function (exports, uiUtils, pdfPageView, pdfRenderingQueue, textLayerBuilder, annotationLayerBuilder, domEvents, pdfjsLib) {
        var UNKNOWN_SCALE = uiUtils.UNKNOWN_SCALE;
        var SCROLLBAR_PADDING = uiUtils.SCROLLBAR_PADDING;
        var VERTICAL_PADDING = uiUtils.VERTICAL_PADDING;
        var MAX_AUTO_SCALE = uiUtils.MAX_AUTO_SCALE;
        var CSS_UNITS = uiUtils.CSS_UNITS;
        var DEFAULT_SCALE = uiUtils.DEFAULT_SCALE;
        var DEFAULT_SCALE_VALUE = uiUtils.DEFAULT_SCALE_VALUE;
        var scrollIntoView = uiUtils.scrollIntoView;
        var watchScroll = uiUtils.watchScroll;
        var getVisibleElements = uiUtils.getVisibleElements;
        var PDFPageView = pdfPageView.PDFPageView;
        var RenderingStates = pdfRenderingQueue.RenderingStates;
        var PDFRenderingQueue = pdfRenderingQueue.PDFRenderingQueue;
        var TextLayerBuilder = textLayerBuilder.TextLayerBuilder;
        var AnnotationLayerBuilder = annotationLayerBuilder.AnnotationLayerBuilder;
        var DEFAULT_CACHE_SIZE = 10;
        var PDFViewer = function pdfViewer() {
            function PDFPageViewBuffer(size) {
                var data = [];
                this.push = function cachePush(view) {
                    var i = data.indexOf(view);
                    if (i >= 0) {
                        data.splice(i, 1);
                    }
                    data.push(view);
                    if (data.length > size) {
                        data.shift().destroy();
                    }
                };
                this.resize = function (newSize) {
                    size = newSize;
                    while (data.length > size) {
                        data.shift().destroy();
                    }
                };
            }
            function isSameScale(oldScale, newScale) {
                if (newScale === oldScale) {
                    return true;
                }
                if (Math.abs(newScale - oldScale) < 1e-15) {
                    return true;
                }
                return false;
            }
            function PDFViewer(options) {
                this.container = options.container;
                this.scrollContainer = options.scrollContainer || options.container;
                this.viewer = options.viewer || options.container.firstElementChild;
                this.eventBus = options.eventBus || domEvents.getGlobalEventBus();
                this.enhanceTextSelection = options.enhanceTextSelection || false;
                this.renderInteractiveForms = options.renderInteractiveForms || false;
                this.defaultRenderingQueue = !options.renderingQueue;
                if (this.defaultRenderingQueue) {
                    this.renderingQueue = new PDFRenderingQueue();
                    this.renderingQueue.setViewer(this);
                } else {
                    this.renderingQueue = options.renderingQueue;
                }
                this.scroll = watchScroll(this.scrollContainer, this._scrollUpdate.bind(this));
                this._resetView();
            }
            PDFViewer.prototype = {
                get pagesCount() {
                    return this._pages.length;
                },
                getPageView: function (index) {
                    return this._pages[index];
                },
                get pageViewsReady() {
                    return this._pageViewsReady;
                },
                get currentPageNumber() {
                    return this._currentPageNumber;
                },
                set currentPageNumber(val) {
                    if ((val | 0) !== val) {
                        throw new Error('Invalid page number.');
                    }
                    if (!this.pdfDocument) {
                        this._currentPageNumber = val;
                        return;
                    }
                    this._setCurrentPageNumber(val, true);
                },
                _setCurrentPageNumber: function PDFViewer_setCurrentPageNumber(val, resetCurrentPageView) {
                    if (this._currentPageNumber === val) {
                        if (resetCurrentPageView) {
                            this._resetCurrentPageView();
                        }
                        return;
                    }
                    if (!(0 < val && val <= this.pagesCount)) {
                        console.error('PDFViewer_setCurrentPageNumber: "' + val + '" is out of bounds.');
                        return;
                    }
                    var arg = {
                        source: this,
                        pageNumber: val
                    };
                    this._currentPageNumber = val;
                    this.eventBus.dispatch('pagechanging', arg);
                    this.eventBus.dispatch('pagechange', arg);
                    if (resetCurrentPageView) {
                        this._resetCurrentPageView();
                    }
                },
                get currentScale() {
                    return this._currentScale !== UNKNOWN_SCALE ? this._currentScale : DEFAULT_SCALE;
                },
                set currentScale(val) {
                    if (isNaN(val)) {
                        throw new Error('Invalid numeric scale');
                    }
                    if (!this.pdfDocument) {
                        this._currentScale = val;
                        this._currentScaleValue = val !== UNKNOWN_SCALE ? val.toString() : null;
                        return;
                    }
                    this._setScale(val, false);
                },
                get currentScaleValue() {
                    return this._currentScaleValue;
                },
                set currentScaleValue(val) {
                    if (!this.pdfDocument) {
                        this._currentScale = isNaN(val) ? UNKNOWN_SCALE : val;
                        this._currentScaleValue = val.toString();
                        return;
                    }
                    this._setScale(val, false);
                },
                get pagesRotation() {
                    return this._pagesRotation;
                },
                set pagesRotation(rotation) {
                    if (!(typeof rotation === 'number' && rotation % 90 === 0)) {
                        throw new Error('Invalid pages rotation angle.');
                    }
                    this._pagesRotation = rotation;
                    if (!this.pdfDocument) {
                        return;
                    }
                    for (var i = 0, l = this._pages.length; i < l; i++) {
                        var pageView = this._pages[i];
                        pageView.update(pageView.scale, rotation);
                    }
                    this._setScale(this._currentScaleValue, true);
                    if (this.defaultRenderingQueue) {
                        this.update();
                    }
                },
                setDocument: function (pdfDocument) {
                    if (this.pdfDocument) {
                        this._cancelRendering();
                        this._resetView();
                    }
                    this.pdfDocument = pdfDocument;
                    if (!pdfDocument) {
                        return;
                    }
                    var pagesCount = pdfDocument.numPages;
                    var self = this;
                    var resolvePagesPromise;
                    var pagesPromise = new Promise(function (resolve) {
                        resolvePagesPromise = resolve;
                    });
                    this.pagesPromise = pagesPromise;
                    pagesPromise.then(function () {
                        self._pageViewsReady = true;
                        self.eventBus.dispatch('pagesloaded', {
                            source: self,
                            pagesCount: pagesCount
                        });
                    });
                    var isOnePageRenderedResolved = false;
                    var resolveOnePageRendered = null;
                    var onePageRendered = new Promise(function (resolve) {
                        resolveOnePageRendered = resolve;
                    });
                    this.onePageRendered = onePageRendered;
                    var bindOnAfterAndBeforeDraw = function (pageView) {
                        pageView.onBeforeDraw = function pdfViewLoadOnBeforeDraw() {
                            self._buffer.push(this);
                        };
                        pageView.onAfterDraw = function pdfViewLoadOnAfterDraw() {
                            if (!isOnePageRenderedResolved) {
                                isOnePageRenderedResolved = true;
                                resolveOnePageRendered();
                            }
                        };
                    };
                    var firstPagePromise = pdfDocument.getPage(1);
                    this.firstPagePromise = firstPagePromise;
                    return firstPagePromise.then(function (pdfPage) {
                        var scale = this.currentScale;
                        var viewport = pdfPage.getViewport(scale * CSS_UNITS);
                        for (var pageNum = 1; pageNum <= pagesCount; ++pageNum) {
                            var textLayerFactory = null;
                            if (!pdfjsLib.PDFJS.disableTextLayer) {
                                textLayerFactory = this;
                            }
                            var pageView = new PDFPageView({
                                container: this.viewer,
                                scrollContainer: this.scrollContainer,
                                eventBus: this.eventBus,
                                id: pageNum,
                                scale: scale,
                                defaultViewport: viewport.clone(),
                                renderingQueue: this.renderingQueue,
                                textLayerFactory: textLayerFactory,
                                annotationLayerFactory: this,
                                enhanceTextSelection: this.enhanceTextSelection,
                                renderInteractiveForms: this.renderInteractiveForms
                            });
                            bindOnAfterAndBeforeDraw(pageView);
                            this._pages.push(pageView);
                        }
                        onePageRendered.then(function () {
                            if (!pdfjsLib.PDFJS.disableAutoFetch) {
                                var getPagesLeft = pagesCount;
                                for (var pageNum = 1; pageNum <= pagesCount; ++pageNum) {
                                    pdfDocument.getPage(pageNum).then(function (pageNum, pdfPage) {
                                        var pageView = self._pages[pageNum - 1];
                                        if (!pageView.pdfPage) {
                                            pageView.setPdfPage(pdfPage);
                                        }
                                        getPagesLeft--;
                                        if (!getPagesLeft) {
                                            resolvePagesPromise();
                                        }
                                    }.bind(null, pageNum));
                                }
                            } else {
                                resolvePagesPromise();
                            }
                        });
                        self.eventBus.dispatch('pagesinit', { source: self });
                        if (this.defaultRenderingQueue) {
                            this.update();
                        }
                    }.bind(this));
                },
                _resetView: function () {
                    this._pages = [];
                    this._currentPageNumber = 1;
                    this._currentScale = UNKNOWN_SCALE;
                    this._currentScaleValue = null;
                    this._buffer = new PDFPageViewBuffer(DEFAULT_CACHE_SIZE);
                    this._location = null;
                    this._pagesRotation = 0;
                    this._pagesRequests = [];
                    this._pageViewsReady = false;
                },
                _scrollUpdate: function PDFViewer_scrollUpdate() {
                    if (this.pagesCount === 0) {
                        return;
                    }
                    this.update();
                    for (var i = 0, ii = this._pages.length; i < ii; i++) {
                        this._pages[i].updatePosition();
                    }
                },
                _setScaleDispatchEvent: function pdfViewer_setScaleDispatchEvent(newScale, newValue, preset) {
                    var arg = {
                        source: this,
                        scale: newScale,
                        presetValue: preset ? newValue : undefined
                    };
                    this.eventBus.dispatch('scalechanging', arg);
                    this.eventBus.dispatch('scalechange', arg);
                },
                _setScaleUpdatePages: function pdfViewer_setScaleUpdatePages(newScale, newValue, noScroll, preset) {
                    this._currentScaleValue = newValue.toString();
                    if (isSameScale(this._currentScale, newScale)) {
                        if (preset) {
                            this._setScaleDispatchEvent(newScale, newValue, true);
                        }
                        return;
                    }
                    for (var i = 0, ii = this._pages.length; i < ii; i++) {
                        this._pages[i].update(newScale);
                    }
                    this._currentScale = newScale;
                    if (!noScroll) {
                        var page = this._currentPageNumber, dest;
                        if (this._location && !pdfjsLib.PDFJS.ignoreCurrentPositionOnZoom) {
                            page = this._location.pageNumber;
                            dest = [
                                null,
                                { name: 'XYZ' },
                                this._location.left,
                                this._location.top,
                                null
                            ];
                        }
                        this.scrollPageIntoView({
                            pageNumber: page,
                            destArray: dest,
                            allowNegativeOffset: true
                        });
                    }
                    this._setScaleDispatchEvent(newScale, newValue, preset);
                    if (this.defaultRenderingQueue) {
                        this.update();
                    }
                },
                _setScale: function PDFViewer_setScale(value, noScroll) {
                    var scale = parseFloat(value);
                    if (scale > 0) {
                        this._setScaleUpdatePages(scale, value, noScroll, false);
                    } else {
                        var currentPage = this._pages[this._currentPageNumber - 1];
                        if (!currentPage) {
                            return;
                        }
                        var hPadding = SCROLLBAR_PADDING;
                        var vPadding = VERTICAL_PADDING;
                        var pageWidthScale = (this.container.clientWidth - hPadding) / currentPage.width * currentPage.scale;
                        var pageHeightScale = (this.container.clientHeight - vPadding) / currentPage.height * currentPage.scale;
                        switch (value) {
                            case 'page-actual':
                                scale = 1;
                                break;
                            case 'page-width':
                                scale = pageWidthScale;
                                break;
                            case 'page-height':
                                scale = pageHeightScale;
                                break;
                            case 'page-fit':
                                scale = Math.min(pageWidthScale, pageHeightScale);
                                break;
                            case 'auto':
                                var isLandscape = currentPage.width > currentPage.height;
                                var horizontalScale = isLandscape ? Math.min(pageHeightScale, pageWidthScale) : pageWidthScale;
                                scale = Math.min(MAX_AUTO_SCALE, horizontalScale);
                                break;
                            default:
                                console.error('PDFViewer_setScale: "' + value + '" is an unknown zoom value.');
                                return;
                        }
                        this._setScaleUpdatePages(scale, value, noScroll, true);
                    }
                },
                _resetCurrentPageView: function () {
                    var pageView = this._pages[this._currentPageNumber - 1];
                    scrollIntoView(pageView.div, null, this.viewer, this.scrollContainer);
                },
                scrollPageIntoView: function PDFViewer_scrollPageIntoView(params) {
                    if (!this.pdfDocument) {
                        return;
                    }
                    if (arguments.length > 1 || typeof params === 'number') {
                        console.warn('Call of scrollPageIntoView() with obsolete signature.');
                        var paramObj = {};
                        if (typeof params === 'number') {
                            paramObj.pageNumber = params;
                        }
                        if (arguments[1] instanceof Array) {
                            paramObj.destArray = arguments[1];
                        }
                        params = paramObj;
                    }
                    var pageNumber = params.pageNumber || 0;
                    var dest = params.destArray || null;
                    var allowNegativeOffset = params.allowNegativeOffset || false;
                    if (!dest) {
                        this._setCurrentPageNumber(pageNumber, true);
                        return;
                    }
                    var pageView = this._pages[pageNumber - 1];
                    if (!pageView) {
                        console.error('PDFViewer_scrollPageIntoView: ' + 'Invalid "pageNumber" parameter.');
                        return;
                    }
                    var x = 0, y = 0;
                    var width = 0, height = 0, widthScale, heightScale;
                    var changeOrientation = pageView.rotation % 180 === 0 ? false : true;
                    var pageWidth = (changeOrientation ? pageView.height : pageView.width) / pageView.scale / CSS_UNITS;
                    var pageHeight = (changeOrientation ? pageView.width : pageView.height) / pageView.scale / CSS_UNITS;
                    var scale = 0;

                    switch (dest[1].name) {
                        case 'XYZ':
                            x = dest[2];
                            y = dest[3];
                            scale = dest[4];
                            x = x !== null ? x : 0;
                            y = y !== null ? y : pageHeight;
                            break;
                        case 'Fit':
                        case 'FitB':
                            scale = 'page-fit';
                            break;
                        case 'FitH':
                        case 'FitBH':
                            y = dest[2];
                            scale = 'page-width';
                            if (y === null && this._location) {
                                x = this._location.left;
                                y = this._location.top;
                            }
                            break;
                        case 'FitV':
                        case 'FitBV':
                            x = dest[2];
                            width = pageWidth;
                            height = pageHeight;
                            scale = 'page-height';
                            break;
                        case 'FitR':
                            x = dest[2];
                            y = dest[3];
                            width = dest[4] - x;
                            height = dest[5] - y;
                            var hPadding = SCROLLBAR_PADDING;
                            var vPadding = VERTICAL_PADDING;
                            widthScale = (this.container.clientWidth - hPadding) / width / CSS_UNITS;
                            heightScale = (this.container.clientHeight - vPadding) / height / CSS_UNITS;
                            scale = Math.min(Math.abs(widthScale), Math.abs(heightScale));
                            break;
                        default:
                            console.error('PDFViewer_scrollPageIntoView: \'' + dest[1].name + '\' is not a valid destination type.');
                            return;
                    }
                    if (scale && scale !== this._currentScale) {
                        this.currentScaleValue = scale;
                    } else if (this._currentScale === UNKNOWN_SCALE) {
                        this.currentScaleValue = DEFAULT_SCALE_VALUE;
                    }
                    if (scale === 'page-fit' && !dest[4]) {
                        scrollIntoView(pageView.div, null, this.viewer, this.scrollContainer);
                        return;
                    }
                    var boundingRect = [
                        pageView.viewport.convertToViewportPoint(x, y),
                        pageView.viewport.convertToViewportPoint(x + width, y + height)
                    ];
                    var left = Math.min(boundingRect[0][0], boundingRect[1][0]);
                    var top = Math.min(boundingRect[0][1], boundingRect[1][1]);
                    if (!allowNegativeOffset) {
                        left = Math.max(left, 0);
                        top = Math.max(top, 0);
                    }
                    scrollIntoView(pageView.div, {
                        left: left,
                        top: top
                    }, this.viewer, this.scrollContainer);
                },

                update: function PDFViewer_update() {
                    var visible = this._getVisiblePages();
                    var visiblePages = visible.views;
                    if (visiblePages.length === 0) {
                        return;
                    }
                    var suggestedCacheSize = Math.max(DEFAULT_CACHE_SIZE, 2 * visiblePages.length + 1);
                    this._buffer.resize(suggestedCacheSize);
                    this.renderingQueue.renderHighestPriority(visible);
                    var currentId = this._currentPageNumber;
                    for (var i = 0, ii = visiblePages.length, stillFullyVisible = false; i < ii; ++i) {
                        var page = visiblePages[i];
                        if (page.percent < 100) {
                            break;
                        }
                        if (page.id === currentId) {
                            stillFullyVisible = true;
                            break;
                        }
                    }
                    if (!stillFullyVisible) {
                        currentId = visiblePages[0].id;
                    }
                    this._setCurrentPageNumber(currentId);
                },
                containsElement: function (element) {
                    return this.container.contains(element);
                },
                focus: function () {
                    this.container.focus();
                },
                _getVisiblePages: function () {
                    return getVisibleElements(this.scrollContainer, this._pages, true);
                },
                cleanup: function () {
                    for (var i = 0, ii = this._pages.length; i < ii; i++) {
                        if (this._pages[i] && this._pages[i].renderingState !== RenderingStates.FINISHED) {
                            this._pages[i].reset();
                        }
                    }
                },
                _cancelRendering: function PDFViewer_cancelRendering() {
                    for (var i = 0, ii = this._pages.length; i < ii; i++) {
                        if (this._pages[i]) {
                            this._pages[i].cancelRendering();
                        }
                    }
                },
                _ensurePdfPageLoaded: function (pageView) {
                    if (pageView.pdfPage) {
                        return Promise.resolve(pageView.pdfPage);
                    }
                    var pageNumber = pageView.id;
                    if (this._pagesRequests[pageNumber]) {
                        return this._pagesRequests[pageNumber];
                    }
                    var promise = this.pdfDocument.getPage(pageNumber).then(function (pdfPage) {
                        pageView.setPdfPage(pdfPage);
                        this._pagesRequests[pageNumber] = null;
                        return pdfPage;
                    }.bind(this));
                    this._pagesRequests[pageNumber] = promise;
                    return promise;
                },
                forceRendering: function (currentlyVisiblePages) {
                    var visiblePages = currentlyVisiblePages || this._getVisiblePages();
                    var pageView = this.renderingQueue.getHighestPriority(visiblePages, this._pages, this.scroll.down);
                    if (pageView) {
                        this._ensurePdfPageLoaded(pageView).then(function () {
                            this.renderingQueue.renderView(pageView);
                        }.bind(this));
                        return true;
                    }
                    return false;
                },
                createTextLayerBuilder: function (textLayerDiv, pageIndex, viewport, enhanceTextSelection) {
                    return new TextLayerBuilder({
                        textLayerDiv: textLayerDiv,
                        eventBus: this.eventBus,
                        pageIndex: pageIndex,
                        viewport: viewport,
                        enhanceTextSelection: enhanceTextSelection
                    });
                },
                createAnnotationLayerBuilder: function (pageDiv, pdfPage, renderInteractiveForms) {
                    return new AnnotationLayerBuilder({
                        pageDiv: pageDiv,
                        pdfPage: pdfPage,
                        renderInteractiveForms: renderInteractiveForms
                    });
                }
            };
            return PDFViewer;
        }();
        exports.PDFViewer = PDFViewer;
    }));

    (function (root, factory) {
        factory(root.pdfjsWebApp = {}, root.pdfjsWebUIUtils, root.pdfjsWebPDFThumbnailViewer, root.pdfjsWebToolbar, root.pdfjsWebPDFViewer, root.pdfjsWebPDFRenderingQueue, root.pdfjsWebDOMEvents, root.pdfjsWebPDFJS);
    }(this, function (exports, uiUtilsLib, pdfThumbnailViewerLib, toolbarLib, pdfViewerLib, pdfRenderingQueueLib, domEventsLib, pdfjsLib) {
        var UNKNOWN_SCALE = uiUtilsLib.UNKNOWN_SCALE;
        var DEFAULT_SCALE_VALUE = uiUtilsLib.DEFAULT_SCALE_VALUE;
        var MIN_SCALE = uiUtilsLib.MIN_SCALE;
        var MAX_SCALE = uiUtilsLib.MAX_SCALE;
        var DEFAULT_SCALE_DELTA = 1.1;

        var PDFThumbnailViewer = pdfThumbnailViewerLib.PDFThumbnailViewer;
        var Toolbar = toolbarLib.Toolbar;
        var PDFViewer = pdfViewerLib.PDFViewer;
        var PDFRenderingQueue = pdfRenderingQueueLib.PDFRenderingQueue;
        var getGlobalEventBus = domEventsLib.getGlobalEventBus;

        var PDFViewerApplication = {
            initialized: false,
            appConfig: null,
            pdfDocument: null,
            pdfLoadingTask: null,
            pdfViewer: null,
            pdfThumbnailViewer: null,
            pdfRenderingQueue: null,
            toolbar: null,
            eventBus: null,
            pageRotation: 0,
            viewerPrefs: {
                showPreviousViewOnLoad: true,
                enhanceTextSelection: false,
                renderInteractiveForms: false
            },
            url: '',
            baseUrl: '',
            initialize: function pdfViewInitialize(pdfjsConfig) {
                var self = this;
                //console.debug("pdf.js:initialize");

                this.appConfig = {
                    eventBus: null,
                    mainContainer: document.getElementById('pdfPreview'),
                    viewerContainer: document.getElementById('pdfViewer'),
                    thumbnailContainer: document.getElementById('pdfThumbs'),
                    // NOTE: body element is not scrolling so set main container as scrollcontainer also
                    scrollContainer: document.getElementById('pdfPreview') || document.body,
                    toolbar: {
                        container: document.getElementById('pdfToolbar'),
                        zoomOut: document.getElementById('zoomOut'),
                        zoom: document.getElementById('zoom'),
                        zoomIn: document.getElementById('zoomIn')
                    }
                };

                var PDFJS = pdfjsLib.PDFJS;
                Object.assign(PDFJS, pdfjsConfig);

                return this._initializeViewerComponents().then(function () {
                    self.bindEvents();
                    self.bindWindowEvents();
                    self.initialized = true;
                });
            },

            _initializeViewerComponents: function () {
                var self = this;
                var appConfig = this.appConfig;
                return new Promise(function (resolve, reject) {
                    var eventBus = appConfig.eventBus || getGlobalEventBus();
                    self.eventBus = eventBus;
                    var pdfRenderingQueue = new PDFRenderingQueue();
                    pdfRenderingQueue.onIdle = self.cleanup.bind(self);
                    self.pdfRenderingQueue = pdfRenderingQueue;
                    var container = appConfig.mainContainer;
                    var viewer = appConfig.viewerContainer;
                    self.pdfViewer = new PDFViewer({
                        container: container,
                        scrollContainer: appConfig.scrollContainer,
                        viewer: viewer,
                        eventBus: eventBus,
                        renderingQueue: pdfRenderingQueue,
                        enhanceTextSelection: self.viewerPrefs.enhanceTextSelection,
                        renderInteractiveForms: self.viewerPrefs.renderInteractiveForms
                    });
                    pdfRenderingQueue.setViewer(self.pdfViewer);
                    var thumbnailContainer = appConfig.thumbnailContainer;
                    self.pdfThumbnailViewer = new PDFThumbnailViewer({
                        app: self,
                        container: thumbnailContainer,
                        scrollContainer: thumbnailContainer,
                        renderingQueue: pdfRenderingQueue
                    });
                    pdfRenderingQueue.setThumbnailViewer(self.pdfThumbnailViewer);
                    self.toolbar = new Toolbar(appConfig.toolbar, container, eventBus);
                    resolve(undefined);
                });
            },
            zoomIn: function pdfViewZoomIn(ticks) {
                var newScale = this.pdfViewer.currentScale;
                do {
                    newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
                    newScale = Math.ceil(newScale * 10) / 10;
                    newScale = Math.min(MAX_SCALE, newScale);
                } while (--ticks > 0 && newScale < MAX_SCALE);
                this.pdfViewer.currentScaleValue = newScale;
            },
            zoomOut: function pdfViewZoomOut(ticks) {
                var newScale = this.pdfViewer.currentScale;
                do {
                    newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
                    newScale = Math.floor(newScale * 10) / 10;
                    newScale = Math.max(MIN_SCALE, newScale);
                } while (--ticks > 0 && newScale > MIN_SCALE);
                this.pdfViewer.currentScaleValue = newScale;
            },
            get pagesCount() {
                return this.pdfDocument ? this.pdfDocument.numPages : 0;
            },
            set page(val) {
                this.pdfViewer.currentPageNumber = val;
            },
            get page() {
                return this.pdfViewer.currentPageNumber;
            },

            close: function pdfViewClose() {
                if (!this.pdfLoadingTask) {
                    return Promise.resolve();
                }
                var promise = this.pdfLoadingTask.destroy();
                this.pdfLoadingTask = null;
                if (this.pdfDocument) {
                    this.pdfDocument = null;
                    this.pdfThumbnailViewer.setDocument(null);
                    this.pdfViewer.setDocument(null);
                }
                this.toolbar.reset();

                return promise;
            },
            open: function pdfViewOpen(file) {
                console.debug("pdf.js:" + file);

                if (this.pdfLoadingTask) {
                    return this.close().then(function () {
                        return this.open(file);
                    }.bind(this));
                }

                var self = this;
                self.downloadComplete = false;
                var loadingTask = pdfjsLib.getDocument(file);
                this.pdfLoadingTask = loadingTask;
                loadingTask.onPassword = function passwordNeeded(updateCallback, reason) {
                    self.error("Cannot preview password protected PDF.", reason);
                };
                return loadingTask.promise.then(function getDocumentCallback(pdfDocument) {
                    self.load(pdfDocument);
                }, function getDocumentError(exception) {
                    var message = exception && exception.message;
                    var loadingErrorMessage = 'An error occurred while loading the PDF.';
                    if (exception instanceof pdfjsLib.InvalidPDFException) {
                        loadingErrorMessage = 'Invalid or corrupted PDF file.';
                    } else if (exception instanceof pdfjsLib.MissingPDFException) {
                        loadingErrorMessage = 'Missing PDF file.';
                    } else if (exception instanceof pdfjsLib.UnexpectedResponseException) {
                        loadingErrorMessage = 'Unexpected server response.';
                    }
                    var moreInfo = { message: message };
                    self.error(loadingErrorMessage, moreInfo);
                    throw new Error(loadingErrorMessage);
                });
            },

            error: function pdfViewError(message, moreInfo) {
                console.error(message);
                if (moreInfo) {
                    console.error(moreInfo);
                }
            },

            load: function pdfViewLoad(pdfDocument) {
                var self = this;

                this.pdfDocument = pdfDocument;
                var downloadedPromise = pdfDocument.getDownloadInfo().then(function () {
                    self.downloadComplete = true;
                });
                self.pdfViewer.viewer.textContent = ''
                var pdfViewer = this.pdfViewer;
                pdfViewer.currentScale = UNKNOWN_SCALE;
                pdfViewer.setDocument(pdfDocument);
                var firstPagePromise = pdfViewer.firstPagePromise;
                this.pageRotation = 0;
                var pdfThumbnailViewer = this.pdfThumbnailViewer;
                pdfThumbnailViewer.setDocument(pdfDocument);
                firstPagePromise.then(function (pdfPage) {
                    downloadedPromise.then(function () {
                        self.eventBus.dispatch('documentload', { source: self });
                    });
                    self.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
                    self.page = 1;
                    self.forceRendering();
                });
                pdfDocument.getMetadata().then(function (data) {
                    var info = data.info, metadata = data.metadata;
                    self.documentInfo = info;
                    self.metadata = metadata;
                    //console.debug('PDF ' + pdfDocument.fingerprint + ' [' + info.PDFFormatVersion + ' ' + (info.Producer || '-').trim() + ' / ' + (info.Creator || '-').trim() + ']' + ' (PDF.js: ' + (pdfjsLib.version || '-') + (!pdfjsLib.PDFJS.disableWebGL ? ' [WebGL]' : '') + ')');
                    if (info.IsAcroFormPresent) {
                        console.warn('Warning: AcroForm/XFA is not supported');
                    }
                });
            },

            cleanup: function pdfViewCleanup() {
                if (!this.pdfDocument) {
                    return;
                }
                this.pdfViewer.cleanup();
                this.pdfThumbnailViewer.cleanup();
                this.pdfDocument.cleanup();
            },
            forceRendering: function pdfViewForceRendering() {
                this.pdfRenderingQueue.isThumbnailViewEnabled = this.appConfig.thumbnailContainer ? true : false;
                this.pdfRenderingQueue.renderHighestPriority();
            },
            rotatePages: function pdfViewRotatePages(delta) {
                var pageNumber = this.page;
                this.pageRotation = (this.pageRotation + 360 + delta) % 360;
                this.pdfViewer.pagesRotation = this.pageRotation;
                this.pdfThumbnailViewer.pagesRotation = this.pageRotation;
                this.forceRendering();
                this.pdfViewer.currentPageNumber = pageNumber;
            },
            bindEvents: function pdfViewBindEvents() {
                var eventBus = this.eventBus;
                eventBus.on('resize', webViewerResize);
                eventBus.on('pagerendered', webViewerPageRendered);
                eventBus.on('pagechanging', webViewerPageChanging);
                eventBus.on('scalechanging', webViewerScaleChanging);
                eventBus.on('zoomin', webViewerZoomIn);
                eventBus.on('zoomout', webViewerZoomOut);
                eventBus.on('scalechanged', webViewerScaleChanged);
            },
            bindWindowEvents: function pdfViewBindWindowEvents() {
                var eventBus = this.eventBus;
                window.addEventListener('keydown', webViewerKeyDown);
                window.addEventListener('resize', function windowResize() {
                    eventBus.dispatch('resize');
                });

                var pdfViewer = this.pdfViewer;
                var viewerContainer = this.appConfig.viewerContainer;
                var scrollContainer = this.appConfig.scrollContainer;

                var pinchScaling = false;
                var pinchStartDistance;
                var pinchCurrentDistance;
                var initialScale;
                var initialPageOffset;
                var currentPageNumber;
                var currentPage;

                // REVIEW: Consider marking event handler as 'passive' to make the page more responsive. See https://www.chromestatus.com/feature/5745543795965952
                viewerContainer.addEventListener('touchstart', function (e) {
                    if (e.touches.length == 2) {
                        currentPageNumber = e.target.closest(".page").dataset.pageNumber;
                        if (currentPageNumber) {
                            currentPage = pdfViewer._pages[currentPageNumber - 1];
                            pinchStartDistance = Math.sqrt(
                                (e.touches[0].clientX - e.touches[1].clientX) * (e.touches[0].clientX - e.touches[1].clientX) +
                                (e.touches[0].clientY - e.touches[1].clientY) * (e.touches[0].clientY - e.touches[1].clientY)
                            );
                            initialScale = pdfViewer._currentScale;

                            var offsetClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                            var offsetClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                            var offsetPageX = (e.touches[0].pageX + e.touches[1].pageX) / 2;
                            var offsetPageY = (e.touches[0].pageY + e.touches[1].pageY) / 2;
                            var currentPageLeft = currentPage.div.offsetLeft - (parseInt(window.getComputedStyle(currentPage.div).marginLeft) || 0);
                            var currentPageTop = currentPage.div.offsetTop - (parseInt(window.getComputedStyle(currentPage.div).marginTop) || 0);

                            initialPageOffset = {
                                left: offsetPageX - currentPageLeft,
                                top: offsetPageY - currentPageTop
                            };

                            viewerContainer.style.transformOrigin = offsetPageX + "px " + offsetPageY + "px";

                            pinchScaling = true;
                        }
                    }
                }, { passive: true });

                // REVIEW: Consider marking event handler as 'passive' to make the page more responsive. See https://www.chromestatus.com/feature/5745543795965952
                viewerContainer.addEventListener('touchmove', function (e) {
                    if (e.touches.length == 2 && pinchScaling && currentPageNumber && pinchStartDistance) {

                        pinchCurrentDistance = Math.sqrt(
                            (e.touches[0].clientX - e.touches[1].clientX) * (e.touches[0].clientX - e.touches[1].clientX) +
                            (e.touches[0].clientY - e.touches[1].clientY) * (e.touches[0].clientY - e.touches[1].clientY)
                        );

                        viewerContainer.style.transform = "scale(" + pinchCurrentDistance / pinchStartDistance + ")";
                    }
                }, { passive: true });

                // REVIEW: Consider marking event handler as 'passive' to make the page more responsive. See https://www.chromestatus.com/feature/5745543795965952
                viewerContainer.addEventListener('touchend', function (e) {
                    if (pinchScaling) {
                        if (pinchCurrentDistance && pinchStartDistance) {
                            var changedScale = pinchCurrentDistance / pinchStartDistance;

                            pdfViewer._setScale(initialScale * changedScale, true);

                            viewerContainer.style.transform = "";
                            viewerContainer.style.transformOrigin = "";

                            pinchScaling = false;
                            pinchStartDistance = 0;
                            pinchCurrentDistance = 0;

                            var scaledPageOffset = {
                                left: initialPageOffset.left * changedScale,
                                top: initialPageOffset.top * changedScale
                            };

                            uiUtilsLib.scrollIntoView(currentPage.div, scaledPageOffset, viewerContainer, scrollContainer, viewerContainer);
                            pdfViewer.currentPageNumber = currentPageNumber;
                        }
                    }
                });

            }
        };

        function webViewerPageRendered(e) {
            var pageNumber = e.pageNumber;
            var pageIndex = pageNumber - 1;
            var pageView = PDFViewerApplication.pdfViewer.getPageView(pageIndex);
            if (!pageView) {
                return;
            }
            if (PDFViewerApplication.appConfig.thumbnailContainer) {
                var thumbnailView = PDFViewerApplication.pdfThumbnailViewer.getThumbnail(pageIndex);
                thumbnailView.setImage(pageView);
            }
            if (pageView.error) {
                PDFViewerApplication.error('An error occurred while rendering the page.', pageView.error);
            }
        }

        function webViewerResize() {
            var currentScaleValue = PDFViewerApplication.pdfViewer.currentScaleValue;
            if (currentScaleValue === 'auto' || currentScaleValue === 'page-fit' || currentScaleValue === 'page-width') {
                PDFViewerApplication.pdfViewer.currentScaleValue = currentScaleValue;
            } else if (!currentScaleValue) {
                PDFViewerApplication.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
            }
            PDFViewerApplication.pdfViewer.update();
            PDFViewerApplication.pdfThumbnailViewer.scrollThumbnailIntoView(PDFViewerApplication.page);
        }

        function webViewerZoomIn() {
            PDFViewerApplication.zoomIn();
        }

        function webViewerZoomOut() {
            PDFViewerApplication.zoomOut();
        }

        function webViewerScaleChanged(e) {
            PDFViewerApplication.pdfViewer.currentScaleValue = e.value;
        }

        function webViewerScaleChanging(e) {
            PDFViewerApplication.toolbar.setPageScale(e.presetValue, e.scale);
            PDFViewerApplication.pdfViewer.update();
        }

        function webViewerPageChanging(e) {
            var page = e.pageNumber;
            PDFViewerApplication.pdfThumbnailViewer.scrollThumbnailIntoView(page);
        }

        function webViewerKeyDown(evt) {
            var curElement = document.activeElement || document.querySelector(':focus');
            var curElementTagName = curElement && curElement.tagName.toUpperCase();
            if (curElementTagName === 'INPUT' || curElementTagName === 'TEXTAREA' || curElementTagName === 'SELECT') {
                if (evt.keyCode !== 27) { // ESC
                    return;
                }
            }
        }
        exports.PDFViewerApplication = PDFViewerApplication;
    }));

}.call(wvy.pdf));

