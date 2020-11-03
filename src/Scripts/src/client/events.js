/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            './utils'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('./utils')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyEvents = factory(
            jQuery,
            root.WeavyUtils
        );
    }
}(typeof self !== 'undefined' ? self : this, function ($, utils) {
    console.debug("events.js");

    var WeavyEvents = function (root) {
        /** 
         *  Reference to this instance
         *  @lends WeavyEvents#
         */
        var weavyEvents = this;

        // EVENT HANDLING
        var _events = [];

        function registerEventHandler(event, handler, context, selector, wrappingHandler) {
            _events.push(Array.from(arguments || []));
        }

        function getEventHandler(event, handler, context, selector) {
            var getHandler = Array.from(arguments || []);
            var eventHandler = _events.filter(function (eventHandler) {
                for (var i = 0; i < getHandler.length; i++) {
                    if (eventHandler[i] === getHandler[i] || utils.eqObjects(eventHandler[i], getHandler[i])) {
                        return true;
                    }
                }
                return false;
            }).pop();

            return eventHandler && (eventHandler[4] || eventHandler[0]);
        }

        function unregisterEventHandler(event, handler, context, selector) {
            var removeHandler = Array.from(arguments || []);
            _events = _events.filter(function (eventHandler) {
                for (var i = 0; i < removeHandler.length; i++) {
                    if (eventHandler[i] !== removeHandler[i] && !utils.eqObjects(eventHandler[i], removeHandler[i])) {
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

                if (context && typeof context.off === "function") {
                    if (typeof selector === "string" || $.isPlainObject(selector)) {
                        context.off(events, selector, attachedHandler || handler);
                    } else {
                        context.off(events, attachedHandler || handler);
                    }
                } else {
                    console.warn("event context is missing off handler", eventHandler);
                }
            });
            _events = [];
        }

        function getEventArguments(contextRoot, eventArguments) {
            var context, events, selector, handler;

            var localEvent = typeof eventArguments[1] === "function" && eventArguments[1];
            var namespace = localEvent ? ".event.weavy" : "";

            if (localEvent) {
                // Local event
                handler = typeof eventArguments[1] === 'function' ? eventArguments[1] : eventArguments[2];
                selector = typeof eventArguments[1] === 'function' ? null : eventArguments[1];
                events = eventArguments[0];
                context = weavyEvents === contextRoot ? $(root) : $(contextRoot);
            } else {
                // Global event
                handler = typeof eventArguments[2] === 'function' ? eventArguments[2] : eventArguments[3];
                selector = typeof eventArguments[2] === 'function' ? null : eventArguments[2];
                events = eventArguments[1];
                context = eventArguments[0];
            }

            context = validateContext(context);

            // Supports multiple events separated by space
            events = localEvent ? namespaceEvents(events) : events;

            return { context: context, events: events, selector: selector, handler: handler, namespace: namespace };
        }

        function namespaceEvents(events, namespace) {
            namespace = namespace || ".event.weavy";
            return events.split(" ").map(function (eventName) { return eventName.indexOf(namespace) === -1 ? eventName + namespace : eventName; }).join(" ")
        }

        function validateContext(context) {
            return context && context.on && context || context && $(context) || (context ? $(root) : $(document))
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
         * @param {Element} [context] - Context Element. If omitted it defaults to the Weavy instance. weavy.connection and wvy.postal may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, followed by any data arguments provided by the trigger.
         * @see The underlying jQuery.on: {@link http://api.jquery.com/on/}
         */
        weavyEvents.on = function (context, events, selector, handler) {
            var argumentsArray = Array.from(arguments || []);
            var args = getEventArguments(this, argumentsArray);
            var once = argumentsArray[4];

            if (once) {
                var attachedHandler = function () {
                    var attachedArguments = Array.from(arguments || []);
                    try {
                        args.handler.apply(this, attachedArguments);
                    } catch (e) {
                        try {
                            args.handler();
                        } catch (e) {
                            console.warn("Could not invoke one handler:", e);
                        }
                    }
                    unregisterEventHandler(args.events, args.handler, args.context, args.selector);
                };

                registerEventHandler(args.events, args.handler, args.context, args.selector, attachedHandler);

                if (typeof args.selector === "string" || $.isPlainObject(args.selector)) {
                    args.context.one(args.events, args.selector, attachedHandler);
                } else {
                    args.context.one(args.events, attachedHandler);
                }
            } else {
                registerEventHandler(args.events, args.handler, args.context, args.selector);


                if (typeof args.selector === "string" || $.isPlainObject(args.selector)) {
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
         * @param {Element} [context] - Context Element. If omitted it defaults to the Weavy instance. weavy.connection and wvy.postal may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         */
        weavyEvents.one = function (context, events, selector, handler) {
            weavyEvents.on.call(this, context, events, selector, handler, true);
        };

        /**
         * Unregisters event listneres. The arguments must match the arguments provided on registration using .on() or .one().
         *
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Weavy instance. weavy.connection and wvy.postal may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         */
        weavyEvents.off = function (context, events, selector, handler) {
            var args = getEventArguments(this, Array.from(arguments || []));

            var offHandler = getEventHandler(args.events, args.handler, args.context, args.selector);

            unregisterEventHandler(args.events, args.handler, args.context, args.selector);

            if (offHandler) {
                if (args.context && typeof args.context.off === "function") {
                    if (typeof args.selector === "string" || $.isPlainObject(args.selector)) {
                        args.context.off(args.events, args.selector, offHandler);
                    } else {
                        args.context.off(args.events, offHandler);
                    }
                } else {
                    console.warn("event context is missing off handler", offHandler);
                }
            }
        };

        function getEventChain(currentTarget, root) {
            var eventChain = [];
            var currentLevel = currentTarget;
            while (currentLevel !== root && currentLevel.eventParent) {
                eventChain.push(currentLevel);
                currentLevel = currentLevel.eventParent;
            }
            if (currentLevel === root) {
                eventChain.push(root);
                return eventChain;
            } else {
                // No complete chain, return root only
                // Would it be better to return currentTarget instead of root?
                return [root];
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
            var prefix = name.split(":")[0];
            var namespace = ".event.weavy";
            var eventChain = getEventChain(this, root);
            var eventChainReverse = eventChain.slice().reverse();

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
            var result, currentTarget, ct;

            // Wrap arrays in an array to avoid arrays converted to multiple arguments by jQuery
            if (hasPrefix) {
                // Defined prefix. before: on: after: custom:
                // select direction of eventChain
                var singleEventChain = (prefix === "before" || prefix === "after") ? eventChainReverse : eventChain;

                for (ct = 0; ct < singleEventChain.length; ct++) {
                    currentTarget = singleEventChain[ct];
                    result = $(currentTarget).triggerHandler(event, $.isArray(data) ? [data] : data);
                    data = (result || result === false) ? result : data;
                    if (data === false || event.isPropagationStopped()) { return data; }
                }
            } else {
                // Before
                // eventChain from root
                for (ct = 0; ct < eventChainReverse.length; ct++) {
                    currentTarget = eventChainReverse[ct];
                    result = $(currentTarget).triggerHandler(beforeEvent, $.isArray(data) ? [data] : data);
                    data = (result || result === false) ? result : data;
                    if (data === false || beforeEvent.isPropagationStopped()) { return data; }
                }

                // On
                // eventChain from target
                for (ct = 0; ct < eventChain.length; ct++) {
                    currentTarget = eventChain[ct];
                    result = $(currentTarget).triggerHandler(event, $.isArray(data) ? [data] : data);
                    data = (result || result === false) ? result : data;
                    if (data === false || event.isPropagationStopped()) { return data; }
                }

                // After
                // eventChain from root
                for (ct = 0; ct < eventChainReverse.length; ct++) {
                    currentTarget = eventChainReverse[ct];
                    result = $(currentTarget).triggerHandler(afterEvent, $.isArray(data) ? [data] : data);
                    data = (result || result === false) ? result : data;
                }
            }

            return beforeEvent.isDefaultPrevented() || event.isDefaultPrevented() || afterEvent.isDefaultPrevented() ? false : data;
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
