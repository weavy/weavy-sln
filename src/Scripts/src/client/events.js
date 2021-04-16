/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            '../utils'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('../utils')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyEvents = factory(
            root.WeavyUtils
        );
    }
}(typeof self !== 'undefined' ? self : this, function (utils) {
    console.debug("events.js");

    /**
     * @class WeavyEvents
     * @classdesc 
     * Event handling with event propagation and before and after phases.
     * 
     * The event system provides event-chaining with a bubbling mechanism that propagates all the way from the emitting child trigger to the root instance.
     * 
     * **NOTE:** Each weavy instance has an event handler instance exposed as `weavy.events`. So references to `.triggerEvent()` in this documentation would translate to `weavy.events.triggerEvent()`.
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
     * @param {Object} rootTarget - The base for all events, usually the Weavy instance. Children may reuse the same methods applying themselves as this.
     */
    var WeavyEvents = function (rootTarget) {
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
         * @function
         * @param {Object} context - The context for the handler
         * @param {string} event - One or more events. Multiple events are currently not registered individually.
         * @param {string|Object} [selector] - Optional refinement selector
         * @param {function} handler - The handler function. may be wrapped for once-handlers
         * @param {function} originalHandler - The original non-wrapped event handler.
         * @param {boolean} external - Is the handler using an external event system
         */
        function registerEventHandler(context, events, selector, handler, originalHandler, external) {
            _eventHandlers.push({ context: context, events: events, selector: selector, handler: handler, originalHandler: originalHandler, external: external });
        }

        /**
         * Returns the event handler or wrapped event handler. The arguments must match the registered event handler.
         * 
         * @internal
         * @function
         * @param {string} event - The events registered
         * @param {function} handler - The registered handler
         * @param {Object} context - The context for the handler
         * @param {string|Object} [selector] - The optional selector for the handler.
         */
        function getEventHandler(context, events, selector, handler, originalHandler, external) {
            var getHandler = { context: context, events: events, selector: selector, handler: handler, originalHandler: originalHandler, external: external };
            var eventHandler = _eventHandlers.filter(function (eventHandler) {
                // Check if all arguments match
                return utils.eqObjects(getHandler, eventHandler, true);
            }).pop();

            return eventHandler && eventHandler.handler;
        }

        /**
         * Unregister an event handler. Arguments must match the registered event handler.
         * 
         * @internal
         * @function
         * @param {string} event - The events registered
         * @param {function} handler - The registered handler
         * @param {Object} context - The context for the handler
         * @param {string|Object} [selector] - The optional selector for the handler.
         * @returns {boolean} - True if any handler was removed
         */
        function unregisterEventHandler(context, events, selector, handler, originalHandler, external) {
            var removeHandler = { context: context, events: events, selector: selector, handler: handler, originalHandler: originalHandler, external: external };
            var handlerRemoved = false;

            _eventHandlers.forEach(function (eventHandler, eventHandlerIndex) {
                // Check if all arguments match
                if (utils.eqObjects(removeHandler, eventHandler, true)) {
                    handlerRemoved = true;
                    _eventHandlers.splice(eventHandlerIndex, 1);
                }
            });

            return handlerRemoved;
        }

        /**
         * Triggers any local event handlers registered. Each handler may modify the data and return it or return false to cancel the event chain. .stopPropagation() and .preventDefault() may also be used.
         * 
         * @example
         * weavyEvents.on("myevent", function(e, data) { ... })
         * 
         * triggerHandler(this, "myevent", { key: 1 })
         * 
         * @internal
         * @function
         * @param {any} target - The target in the event chain where the event should be triggered.
         * @param {any} eventName - The name of the event. Event names without prefix will also trigger handlers with the "on:" prefix.
         * @param {any} data - Any data to pass to the handler as second argument
         */
        function triggerHandler(target, eventName, data) {
            var event = new CustomEvent(eventName, { cancelable: true });
            var isCancelled = false;
            //TODO: Handle stopImmediatePropagation using wrapper function

            _eventHandlers.forEach(function (eventHandler) {
                if (!eventHandler.external && eventHandler.context === target) {
                    eventHandler.events.split(" ").forEach(function (eventHandlerName) {
                        // Normalize on:
                        eventHandlerName = eventHandlerName.indexOf("on:") === 0 ? eventHandlerName.split("on:")[1] : eventHandlerName;
                        if (eventName === eventHandlerName) {
                            // Trigger the handler
                            var returnData = eventHandler.handler(event, data);
                            if (returnData) {
                                data = returnData;
                            } else if (returnData === false) {
                                isCancelled = true;
                            }
                        }
                    })
                }
            });

            return isCancelled || event.cancelBubble || event.defaultPrevented ? false : data;
        }

        /**
         * Extracts and normalizes all parts of the events arguments.
         * 
         * @internal
         * @function
         * @param {Object} contextTarget - The context for the events
         * @param {Array.<Object>} eventArguments - The function argument list: `[context], events, [selector], handler`
         * @returns {Object}
         * @property {Object} context - The context for the event. Must have an `.on()` function.
         * @property {string} events - Event names with added namespace for local events.
         * @property {string|Object} selector - The optional selector.
         * @property {function} handler - The handler function
         * @
         */
        function getEventArguments(contextTarget, eventArguments) {
            var context, events, selector, handler;

            var localEvent = typeof eventArguments[1] === "function" && eventArguments[1];

            if (localEvent) {
                // Local event
                handler = typeof eventArguments[1] === 'function' ? eventArguments[1] : eventArguments[2];
                selector = typeof eventArguments[1] === 'function' ? null : eventArguments[1];
                events = eventArguments[0];
                context = weavyEvents === contextTarget ? rootTarget : contextTarget;
            } else {
                // External event
                handler = typeof eventArguments[2] === 'function' ? eventArguments[2] : eventArguments[3];
                selector = typeof eventArguments[2] === 'function' ? null : eventArguments[2];
                events = eventArguments[1];
                context = eventArguments[0];
                context = validateContext(context);
            }

            return { context: context, events: events, selector: selector, handler: handler, external: !localEvent };
        }


        /**
         * Gets an valid context.
         * 
         * @internal
         * @function
         * @param {any} context The context to validate and return if valid.
         * @returns {object} if the context has `.on()` return it, otherwise try to return a context element or lastly return the root context.
         */
        function validateContext(context) {
            if (context) {
                if (context.on) {
                    return context;
                }

                var contextElement = utils.asElement(context);
                if (contextElement) {
                    return contextElement;
                }
            }

            return rootTarget;
        }

        /**
         * Get the event chain for the triggering object. All the objects in the chain except the root must have a link to their parent defined by a .eventParent property.
         * 
         * @internal
         * @param {Object} currentTarget - The triggering target.
         * @param {Object} rootTarget - The event root target.
         * @returns {Array.<Object>} All objects in the chain. Starts with the currentTarget and ends with the rootTarget.
         */
        function getEventChain(currentTarget, rootTarget) {
            var eventChain = [];
            var currentLevel = currentTarget;
            while (currentLevel !== rootTarget && currentLevel.eventParent) {
                eventChain.push(currentLevel);
                currentLevel = currentLevel.eventParent;
            }
            if (currentLevel === rootTarget) {
                eventChain.push(rootTarget);
                return eventChain;
            } else {
                // No complete chain, return currentTarget and rootTarget
                return [currentTarget, rootTarget];
            }
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
         * @example <caption>Multiple document event listeners using jQuery context and selector</caption>
         * weavyEvents.on($(document), "show.bs.modal hide.bs.modal", ".modal", function() { ... })
         * 
         * @category eventhandling
         * @function
         * @name WeavyEvents#on
         * @param {Element} [context] - Context Element. If omitted it defaults to the Weavy instance. weavy.connection and wvy.postal may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string|Object} [selector] - Only applicable if the context supports selectors, for instance jQuery.on().
         * @param {function} handler - The listener. The first argument is always the event, followed by any data arguments provided by the trigger.
         */
        this.on = function (context, events, selector, handler) {
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
                    unregisterEventHandler(args.context, args.events, args.selector, null, args.handler, args.external);
                };

                registerEventHandler(args.context, args.events, args.selector, attachedHandler, args.handler, args.external);

                if (args.external) {
                    if (typeof args.selector === "string" || utils.isPlainObject(args.selector)) {
                        if (typeof args.context.one === "function") {
                            args.context.one(args.events, args.selector, attachedHandler);
                        } else {
                            rootTarget.warn("external .one() target does not support selectors")
                        }
                    } else {
                        if (typeof args.context.one === "function") {
                            args.context.one(args.events, attachedHandler);
                        } else if (args.context instanceof EventTarget) {
                            args.events.split(" ").forEach(function (eventName) {
                                args.context.addEventListener(eventName, attachedHandler, { once: true });
                            });
                        } else {
                            rootTarget.warn("external target does not have valid event listening");
                        }
                    }
                }
            } else {
                registerEventHandler(args.context, args.events, args.selector, args.handler, args.handler, args.external);

                if (args.external) {
                    if (typeof args.selector === "string" || utils.isPlainObject(args.selector)) {
                        if (typeof args.context.one === "function") {
                            args.context.on(args.events, args.selector, args.handler);
                        } else {
                            rootTarget.warn("external .on() target does not support selectors")
                        }
                    } else {
                        if (typeof args.context.on === "function") {
                            args.context.on(args.events, args.handler);
                        } else if (args.context instanceof EventTarget) {
                            args.events.split(" ").forEach(function (eventName) {
                                args.context.addEventListener(eventName, args.handler);
                            });
                        } else {
                            rootTarget.warn("external target does not have valid event listening");
                        }
                    }
                }
            }
        };

        /**
         * Registers one or several event listneres that are executed once. All event listners are managed and automatically unregistered on destroy.
         * 
         * Similar to {@link WeavyEvents#on}.
         * 
         * @category eventhandling
         * @function
         * @name WeavyEvents#one
         * @param {Element} [context] - Context Element. If omitted it defaults to the Weavy instance. weavy.connection and wvy.postal may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string|Object} [selector] - Only applicable if the context supports selectors, for instance jQuery.on().
         * @param {Function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         */
        this.one = function (context, events, selector, handler) {
            this.on.call(this, context, events, selector, handler, true);
        };

        /**
         * Unregisters event listneres. The arguments must match the arguments provided on registration using .on() or .one().
         *
         * @category eventhandling
         * @function
         * @name WeavyEvents#off
         * @param {Element} [context] - Context Element. If omitted it defaults to the Weavy instance. weavy.connection and wvy.postal may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context supports selectors, for instance jQuery.on().
         * @param {function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         */
        this.off = function (context, events, selector, handler) {
            var args = getEventArguments(this, Array.from(arguments || []));

            var offHandler = getEventHandler(args.events, args.handler, args.context, args.selector);

            var handlerRemoved = unregisterEventHandler(args.context, args.events, args.selector, offHandler, args.handler, args.external);

            if (handlerRemoved && offHandler) {
                if (args.external && args.context) {

                    if (typeof args.selector === "string" || utils.isPlainObject(args.selector)) {
                        if (typeof args.context.off === "function") {
                            args.context.off(args.events, args.selector, offHandler);
                        } else {
                            rootTarget.warn("external target does not have valid event listening");
                        }
                            
                    } else {
                        if (typeof args.context.off === "function") {
                            args.context.off(args.events, offHandler);
                        } else if (args.context instanceof EventTarget) {
                            args.events.split(" ").forEach(function (eventName) {
                                args.context.removeEventListener(eventName, offHandler);
                            });
                        } else {
                            rootTarget.warn("external target does not have valid event listening");
                        }
                    }

                }
            } else {
                console.debug("event off: handler not found or already removed;", args.events);
            }
        };

        /**
         * Clears all registered eventhandlers
         * 
         * @category eventhandling
         * @function
         * @name WeavyEvents#clear
         */
        this.clear = function () {
            _eventHandlers.forEach(function (eventHandler) {
                // TODO: Maybe use .off instead?
                if (eventHandler.external && eventHandler.context) {
                    if (typeof eventHandler.selector === "string" || utils.isPlainObject(eventHandler.selector)) {
                        if (typeof eventHandler.context.off === "function") {
                            eventHandler.context.off(eventHandler.events, eventHandler.selector, eventHandler.handler);
                        } else {
                            rootTarget.warn("external target does not have valid event listening");
                        }

                    } else {
                        if (typeof eventHandler.context.off === "function") {
                            eventHandler.context.off(eventHandler.events, eventHandler.handler);
                        } else if (eventHandler.context instanceof EventTarget) {
                            eventHandler.events.split(" ").forEach(function (eventName) {
                                eventHandler.context.removeEventListener(eventName, eventHandler.handler);
                            });
                        } else {
                            rootTarget.warn("external target does not have valid event listening");
                        }
                    }

                }
            });

            _eventHandlers.length = 0; // Empty the array without removing references
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
         * @function
         * @name WeavyEvents#triggerEvent
         * @param {string} name - The name of the event.
         * @param {(Array/Object/JSON)} [data] - Data may be an array or plain object with data or a JSON encoded string.
         * @returns {data} The data passed to the event trigger including any modifications by event handlers. Returns false if the event is cancelled.
         */
        this.triggerEvent = function (name, data) {
            var hasPrefix = name.indexOf(":") !== -1;
            var prefix = name.split(":")[0];
            var eventChain = getEventChain(this, rootTarget);
            var eventChainReverse = eventChain.slice().reverse();

            if (this instanceof HTMLElement && this.isConnected) {
                console.warn("Triggering event on DOM Node may cause unexpected bubbling:", '"' + name + '"', "<" + this.nodeName.toLowerCase() + (this.id ? ' id="' + this.id + '" />' : ' />'));
            }

            name = name.replace("on:", "");

            // Triggers additional before:* and after:* events
            var beforeEventName = "before:" + name;
            var eventName = name;
            var afterEventName = "after:" + name;

            if (data && !Array.isArray(data) && !utils.isPlainObject(data)) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    rootTarget.warn("Could not parse event data");
                }
            }

            rootTarget.debug("trigger", name);
            var result, currentTarget, ct;

            if (hasPrefix) {
                // Defined prefix. before: on: after: custom:
                // select direction of eventChain
                var singleEventChain = (prefix === "before" || prefix === "after") ? eventChainReverse : eventChain;

                for (ct = 0; ct < singleEventChain.length; ct++) {
                    currentTarget = singleEventChain[ct];
                    result = triggerHandler(currentTarget, eventName, data);
                    data = (result || result === false) ? result : data;
                    if (data === false) { return data; }
                }
            } else {
                // Before
                // eventChain from root
                for (ct = 0; ct < eventChainReverse.length; ct++) {
                    currentTarget = eventChainReverse[ct];
                    result = triggerHandler(currentTarget, beforeEventName, data);
                    data = (result || result === false) ? result : data;
                    if (data === false) { return data; }
                }

                // On
                // eventChain from target
                for (ct = 0; ct < eventChain.length; ct++) {
                    currentTarget = eventChain[ct];
                    result = triggerHandler(currentTarget, eventName, data);
                    data = (result || result === false) ? result : data;
                    if (data === false) { return data; }
                }

                // After
                // eventChain from root
                for (ct = 0; ct < eventChainReverse.length; ct++) {
                    currentTarget = eventChainReverse[ct];
                    result = triggerHandler(currentTarget, afterEventName, data);
                    data = (result || result === false) ? result : data;
                }
            }

            return data;
        };

    };

    return WeavyEvents;
}));
