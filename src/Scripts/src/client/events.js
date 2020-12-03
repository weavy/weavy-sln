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

    /**
     * @class WeavyEvents
     * @classdesc 
     * Event handling with event propagation and before and after phases.
     * 
     * The event system provides event-chaining with a bubbling mechanism that propagates all the way from the emitting child trigger to the root instance.
     * 
     * **NOTE:** Each weavy instance has an event handler instance exposed as `weavy.events`. So references to `weavyEvents.triggerEvent()` in this documentation would translate to `weavy.events.triggerEvent()`.
     * For convenience the `.on()`, `.one()` and `.off()` functions are exposed directly on the weavy instance as `weavy.on()`, `weavy.one()` and `weavy.off()`.
     * They are also exposed as child object functions on spaces and apps as `space.on()` and `app.on()` etc.
     * 
     * All events in the client have three phases; before, on and after. Each event phase is a prefix to the event name.
     * - The before:event-name is triggered in an early stage of the event cycle and is a good point to modify event data or cancel the event.
     * - The on:event-name is the normal trigger point for the event. It does not need to be prefixed when registering an event listener, you can simly use the event-name when you register a listener. This is the phase you normally use to register event listeners.
     * - The after:event-name is triggered when everything is processed. This is a good point to execute code that is dependent on that all other listers have been executed.
     * 
     * In each phase, the event is propagated to objects in the hierarchy, much like bubbling in the DOM. 
     * The event chain always contains at least the triggering object and the root, but may have more objects in between. 
     * This means that the root will receive all events regardless of which child-object that was triggering event, but the child objects will only receive the events that they triggered themeselves or any of their child objects triggered.
     * - The event chain starts at the root in the before: phase and works it's way towards the triggering child object. This gives all parent-listeners a chance to modify event data or cancel the event before it reaches the triggering child object.
     * - In the on: phase the event chain starts at the trigger and goes up to the weavy instance, like rings on the water.
     * - Finally, the after: phase goes back from the weavy instance and ends up at the triggering child-object at last.
     * 
     * Cancelling an event by calling `event.stopPropagation()` will stop any propagation and cause all the following phases for the event to be cancelled.
     */

    /**
     * @constructor
     * @hideconstructor
     * @param {Object} root - The base for all events, usually the Weavy instance. Children may reuse the same methods applying themselves as this.
     */
    var WeavyEvents = function (root) {
        /** 
         *  Reference to this instance
         *  @lends WeavyEvents#
         */
        var weavyEvents = this;

        // EVENT HANDLING
        var _eventHandlers = [];

        /**
         * Saves a single eventhandler.
         * 
         * @internal
         * @param {string} event - One or more events. Multiple events are currently not registered individually.
         * @param {function} handler - The handler function
         * @param {Object} context - The context for the handler
         * @param {string|Object} [selector] - Optional refinement selector
         * @param {function} [wrappingHandler] - Optional wrapped event handler. Used when wrapping the event into a once-handler.
         */
        function registerEventHandler(event, handler, context, selector, wrappingHandler) {
            _eventHandlers.push(Array.from(arguments || []));
        }

        /**
         * Returns the event handler or wrapped event handler. The arguments must match the registered event handler.
         * 
         * @internal
         * @param {string} event - The events registered
         * @param {function} handler - The registered handler
         * @param {Object} context - The context for the handler
         * @param {string|Object} [selector] - The optional selector for the handler.
         */
        function getEventHandler(event, handler, context, selector) {
            var getHandler = Array.from(arguments || []);
            var eventHandler = _eventHandlers.filter(function (eventHandler) {
                for (var i = 0; i < getHandler.length; i++) {
                    if (eventHandler[i] === getHandler[i] || utils.eqObjects(eventHandler[i], getHandler[i])) {
                        return true;
                    }
                }
                return false;
            }).pop();

            return eventHandler && (eventHandler[4] || eventHandler[0]);
        }

        /**
         * Unregister an event handler. Arguments must match the registered event handler.
         * 
         * @internal
         * @param {string} event - The events registered
         * @param {function} handler - The registered handler
         * @param {Object} context - The context for the handler
         * @param {string|Object} [selector] - The optional selector for the handler.
         */
        function unregisterEventHandler(event, handler, context, selector) {
            var removeHandler = Array.from(arguments || []);
            _eventHandlers = _eventHandlers.filter(function (eventHandler) {
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
         * @category eventhandling
         */
        weavyEvents.clear = function () {
            _eventHandlers.forEach(function (eventHandler) {
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
            _eventHandlers = [];
        }

        /**
         * Extracts and normalizes all parts of the events arguments.
         * 
         * @internal
         * @param {Object} contextRoot - The context for the events
         * @param {Array.<Object>} eventArguments - The function argument list: `[context], events, [selector], handler`
         * @returns {Object}
         * @property {Object} context - The context for the event. Must have an `.on()` function.
         * @property {string} events - Event names with added namespace for local events.
         * @property {string|Object} selector - The optional selector.
         * @property {function} handler - The handler function
         * @
         */
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
            events = localEvent ? namespaceEvents(events, namespace) : events;

            return { context: context, events: events, selector: selector, handler: handler };
        }

        /**
         * Adds an event namespace to all events in a string.
         * 
         * @internal
         * @param {string} events - The string with space separeated events.
         * @param {string} namespace - The namespace to add.
         */
        function namespaceEvents(events, namespace) {
            return events.split(" ").map(function (eventName) { return eventName.indexOf(namespace) === -1 ? eventName + namespace : eventName; }).join(" ")
        }

        /**
         * Gets an valid context.
         * 
         * @internal
         * @param {any} context The context to validate and return if valid.
         * @returns {object} if the context has `.on()` return it, otherwise try to return a jQuery context or lastly return a root context or document context.
         */
        function validateContext(context) {
            return context && context.on && context || context && $(context) || (context ? $(root) : $(document))
        }


        /**
         * Registers one or several event listneres. All event listners are managed and automatically unregistered on destroy.
         * 
         * When listening to weavy events, you may also listen to `before:` and `after:` events by simply adding the prefix to a weavy event.
         * Eventhandlers listening to weavy events may return modified data that is returned to the trigger. The data is passed on to the next event in the trigger event chain. If an event handler calls `event.stopPropagation()` or `return false`, the event chain will be stopped and the value is returned.
         *
         * @example <caption>Instance event</caption>
         * weavyEvents.on("before:options", function(e, options) { ... })
         * weavyEvents.on("options", function(e, options) { ... })
         * weavyEvents.on("after:options", function(e, options) { ... })
         *  
         * @example <caption>Realtime event</caption>
         * weavyEvents.on(weavy.connection, "eventname", function(e, message) { ... })
         *   
         * @example <caption>Connection event</caption>
         * weavyEvents.on(weavy.connection, "disconnect.connection", function(e) { ... })
         *   
         * @example <caption>Button event</caption>
         * weavyEvents.on(myButton, "click", function() { ... })
         *   
         * @example <caption>Multiple document event listeners using jQuery selector</caption>
         * weavyEvents.on(document, "show.bs.modal hide.bs.modal", ".modal", function() { ... })
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

        /**
         * Get the event chain for the triggering object. All the objects in the chain except the root must have a link to their parent defined by a .eventParent property.
         * 
         * @internal
         * @param {Object} currentTarget - The triggering target.
         * @param {Object} root - The event root.
         * @returns {Array.<Object>} All objects in the chain. Starts with the currentTarget and ends with the root.
         */
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
                // No complete chain, return currentTarget and root
                return [currentTarget, root];
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
         * // Normal triggering
         * weavyEvents.triggerEvent("myevent");
         * 
         * // Will trigger the following events on the root instance
         * // 1. before:myevent.event.weavy
         * // 2. myevent.event.weavy
         * // 3. after:myevent.event.weavy
         * 
         * @example
         * // Custom triggering, one at the time
         * weavyEvents.triggerEvent("before:myevent");
         * weavyEvents.triggerEvent("on:myevent");
         * weavyEvents.triggerEvent("after:myevent");
         * 
         * @example
         * // Advanced triggering with data handling
         * 
         * function doSomething() {
         *     // Will trigger the events sequentially and check the response data in between
         *
         *     var myTriggerData = { counter: 123, label: "my label" };
         * 
         *     // Custom triggering, one at the time
         * 
         *     // 1. Trigger before: and save the response data back to myTriggerData
         *     myTriggerData = weavyEvents.triggerEvent("before:myevent", myTriggerData);
         *     
         *     if (myTriggerData === false) {
         *         console.warn("before:myevent was cancelled by event.stopPropagation() or return false");
         *         return;
         *     }
         * 
         *     // ...
         * 
         *     // 2. Continue with on: and save the response data back to myTriggerData
         *     myTriggerData = weavyEvents.triggerEvent("on:myevent", myTriggerData);
         *     
         *     if (myTriggerData === false) {
         *         console.warn("on:myevent was cancelled by event.stopPropagation() or return false");
         *         return;
         *     }
         *
         *     // ...
         * 
         *     // 3. At last trigger after: and save the response data back to myTriggerData
         *     myTriggerData = weavyEvents.triggerEvent("after:myevent", myTriggerData);
         *     
         *     if (myTriggerData === false) {
         *         console.warn("after:myevent was cancelled by event.stopPropagation() or return false");
         *         return;
         *     }
         *     
         *     console.log("myevent was fully executed", myTriggerData);
         *     return myTriggerData;
         * }
         * 
         * @category eventhandling
         * @param {string} name - The name of the event.
         * @param {(Array/Object/JSON)} [data] - Data may be an array or plain object with data or a JSON encoded string. Unlike jQuery, an array of data will be passed as an array and _not_ as multiple arguments.
         * @param {Event} [originalEvent] - When relaying another event, you may pass the original Event to access it in handlers.
         * @returns {data} The data passed to the event trigger including any modifications by event handlers. Returns false if the event is cancelled.
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
