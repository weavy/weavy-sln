/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals (root is window)
        root.WeavyEvents = factory(jQuery);
    }
}(typeof self !== 'undefined' ? self : this, function ($) {
    console.debug("events.js");

    var WeavyEvents = function (root) {
        /** 
         *  Reference to this instance
         *  @lends WeavyEvents#
         */
        var weavyEvents = this;

        // EVENT HANDLING
        var _events = [];

        function registerEventHandler(event, handler, context, selector, onceHandler) {
            _events.push(arguments);
        }

        function getEventHandler(event, handler, context, selector) {
            var removeHandler = arguments;
            var eventHandler = _events.filter(function (eventHandler) {
                for (var i = 0; i < removeHandler.length; i++) {
                    if (eventHandler[i] === removeHandler[i]) {
                        return true;
                    }
                }
                return false;
            }).pop();

            return eventHandler && (eventHandler[4] || eventHandler[0]);
        }

        function unregisterEventHandler(event, handler, context, selector) {
            var removeHandler = arguments;
            _events = _events.filter(function (eventHandler) {
                for (var i = 0; i < eventHandler.length; i++) {
                    if (eventHandler[i] !== removeHandler[i]) {
                        return true;
                    }
                }
                return false;
            });
        }

        /**
         * Clears all registered eventhandlers
         */
        weavyEvents.clear = function () {
            _events.forEach(function (eventHandler) {
                var events = eventHandler[0];
                var handler = eventHandler[1];
                var context = eventHandler[2];
                var selector = eventHandler[3];
                var attachedHandler = eventHandler[4];

                if (typeof selector === "string") {
                    context.off(events, selector, attachedHandler || handler);
                } else {
                    context.off(events, attachedHandler || handler);
                }
            });
            _events = [];
        }

        function getEventArguments(context, events, selector, handler) {
            var namespace = "";
            var defaultNamespace = ".event.weavy"

            if (typeof arguments[0] === "string") {
                // Widget event
                handler = typeof arguments[1] === 'function' ? arguments[1] : arguments[2];
                selector = typeof arguments[1] === 'function' ? null : arguments[1];
                events = arguments[0];
                context = null;

                namespace = defaultNamespace;
            } else {
                // Global event

                handler = typeof arguments[2] === 'function' ? arguments[2] : arguments[3];
                selector = typeof arguments[2] === 'function' ? null : arguments[2];
            }

            context = context && context.on && context || context && $(context) || (namespace === defaultNamespace ? $(root) : $(document));

            // Supports multiple events separated by space
            events = events.split(" ").map(function (eventName) { return eventName + namespace; }).join(" ");

            return { context: context, events: events, selector: selector, handler: handler, namespace: namespace };
        }


        /**
         * Registers one or several event listneres. All event listners are managed and automatically unregistered on destroy.
         * 
         * When listening to weavy events, you may also listen to `before:` and `after:` events by simply adding the prefix to a weavy event.
         * Eventhandlers listening to weavy events may return modified data that is returned to the trigger. The data is passed on to the next event in the trigger event chain. If an event handler calls event.stopPropagation() or returns false, the event chain will be stopped and the value is returned.
         *
         * @example <caption>Widget event</caption>
         * weavy.on("before:options", function(e, options) { ... })
         * weavy.on("options", function(e, options) { ... })
         * weavy.on("after:options", function(e, options) { ... })
         *  
         * @example <caption>Realtime event</caption>
         * weavy.on(weavy.connection, "eventname", function(e, message) { ... })
         *   
         * @example <caption>Connection event</caption>
         * weavy.on(weavy.connection, "disconnect.connection", function(e) { ... })
         *   
         * @example <caption>Button event</caption>
         * weavy.on(myButton, "click", function() { ... })
         *   
         * @example <caption>Multiple document listeners with custom namespace</caption>
         * weavy.on(document, ".modal", "show hide", function() { ... }, ".bs.modal")
         * 
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Widget instance. weavy.connection and wvy.postal may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, followed by any data arguments provided by the trigger.
         * @see The underlying jQuery.on: {@link http://api.jquery.com/on/}
         */
        weavyEvents.on = function (context, events, selector, handler) {
            var args = getEventArguments.apply(this, arguments);
            var once = arguments[4];

            if (once) {
                var attachedHandler = function () {
                    args.handler.apply(this, arguments);
                    unregisterEventHandler(args.events, args.handler, args.context, args.selector);
                };

                registerEventHandler(args.events, args.handler, args.context, args.selector, attachedHandler);

                if (typeof args.selector === "string") {
                    args.context.one(args.events, args.selector, attachedHandler);
                } else {
                    args.context.one(args.events, attachedHandler);
                }
            } else {
                registerEventHandler(args.events, args.handler, args.context, args.selector);


                if (typeof args.selector === "string") {
                    args.context.on(args.events, args.selector, args.handler);
                } else {
                    args.context.on(args.events, args.handler);
                }
            }
        };

        /**
         * Registers one or several event listneres that are executed once. All event listners are managed and automatically unregistered on destroy.
         * 
         * Similar to {@link Weavy#on}.
         * 
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Widget instance. weavy.connection and wvy.postal may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         */
        weavyEvents.one = function (context, events, selector, handler) {
            weavyEvents.on(context, events, selector, handler, true);
        };

        /**
         * Unregisters event listneres. The arguments must match the arguments provided on registration using .on() or .one().
         *
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Widget instance. weavy.connection and wvy.postal may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         */
        weavyEvents.off = function (context, events, selector, handler) {
            var args = getEventArguments.apply(this, arguments);

            var offHandler = getEventHandler(args.events, args.handler, args.context, args.selector);

            unregisterEventHandler(args.events, args.handler, args.context, args.selector);

            if (offHandler) {
                if (typeof args.selector === "string") {
                    args.context.off(args.events, args.selector, offHandler);
                } else {
                    args.context.off(args.events, offHandler);
                }
            }
        }

        /**
         * Trigger a custom event. Events are per default triggered on the weavy instance using the weavy namespace.
         * 
         * The trigger has an event chain that adds `before:` and `after:` events automatically for all events except when any custom `prefix:` is specified. This way you may customize the eventchain by specifying `before:`, `on:` and `after:` in your event name to fire them one at the time. The `on:` prefix will then be removed from the name when the event is fired.
         * 
         * Eventhandlers listening to the event may return modified data that is returned by the trigger event. The data is passed on to the next event in the trigger event chain. If an event handler calls `event.stopPropagation()` or `return false`, the event chain will be stopped and the value is returned.
         * 
         * @example
         * 
         * // Normal triggering
         * weavy.triggerEvent("myevent");
         * 
         * // Will trigger the following events on the weavy instance
         * // 1. `before:myevent.event.weavy`
         * // 2. `myevent.event.weavy`
         * // 3. `after:myevent.event.weavy`
         * 
         * // Custom triggering, one at the time
         * weavy.triggerEvent("before:myevent");
         * weavy.triggerEvent("on:myevent");
         * weavy.triggerEvent("after:myevent");
         * 
         * @category eventhandling
         * @param {any} name - The name of the event.
         * @param {(Array/Object/JSON)} [data] - Data may be an array or plain object with data or a JSON encoded string. Unlike jQuery, an array of data will be passed as an array and _not_ as multiple arguments.
         * @param {Event} [originalEvent] - When relaying another event, you may pass the original Event to access it in handlers.
         * @returns {data} The data passed to the event trigger including any modifications by event handlers.
         */
        weavyEvents.triggerEvent = function (name, data, originalEvent) {
            var hasPrefix = name.indexOf(":") !== -1;
            var namespace = ".event.weavy";
            var context = $(root);
            name = name.replace("on:", "") + namespace;

            // Triggers additional before:* and after:* events
            var beforeEvent = $.Event("before:" + name);
            var event = $.Event(name);
            var afterEvent = $.Event("after:" + name);

            if (originalEvent) {
                beforeEvent.originalEvent = originalEvent;
                event.originalEvent = originalEvent;
                afterEvent.originalEvent = originalEvent;
            }

            if (data && !$.isArray(data) && !$.isPlainObject(data)) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    root.warn("Could not parse event data");
                }
            }

            root.debug("trigger", name);
            var result;

            // Wrap arrays in an array to avoid arrays converted to multiple arguments by jQuery
            if (hasPrefix) {
                result = context.triggerHandler(event, $.isArray(data) ? [data] : data);
                data = (result || result === false) ? result : data;
            } else {
                result = context.triggerHandler(beforeEvent, $.isArray(data) ? [data] : data);
                data = (result || result === false) ? result : data;
                if (data === false || beforeEvent.isPropagationStopped()) { return data; }

                result = context.triggerHandler(event, $.isArray(data) ? [data] : data);
                data = (result || result === false) ? result : data;
                if (data === false || event.isPropagationStopped()) { return data; }

                result = context.triggerHandler(afterEvent, $.isArray(data) ? [data] : data);
                data = (result || result === false) ? result : data;
            }

            return data;
        };

    };

    return WeavyEvents;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

/**
 * @external jqXHR
 * @see http://api.jquery.com/jQuery.ajax/#jqXHR
 */

/**
 * @external jqAjaxSettings
 * @see http://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
 */
