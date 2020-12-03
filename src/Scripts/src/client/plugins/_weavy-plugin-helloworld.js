/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            'weavy'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('weavy')
        );
    } else {
        // Browser globals (root is window)
        if (typeof Weavy === 'undefined' || !Weavy.plugins) {
            throw new Error("Weavy must be loaded before registering plugin");
        }

        factory(jQuery, Weavy);
    }
}(typeof self !== 'undefined' ? self : this, function ($, Weavy) {

    // This is an example hello-world plugin for Weavy.
    // It adds the class 'weavy-hello-world' to the weavy container.
    // It demonstrates various ways to work with weavy.

    // {this} is passed as a reference to the weavy instance
    // {options} is passed to the function, which you also may access via weavy.options.plugins[PLUGIN_NAME]
    var HelloWorldPlugin = function (options) {

        // Best practice is to use 'weavy' instead of 'this' to avoid confusion
        var weavy = this;

        // EXAMPLE CODE BELOW, REPLACE IT WITH ANY CUSTOM CODE

        // Other options
        var weavyOptions = weavy.options; // All global options for weavy
        var pluginOptions = weavy.options.plugins.helloworld; // Same as options
        
        // Set a common weavy property from options
        weavy.helloText = options.helloText;

        // Register a public method on weavy
        // Avoid prototype methods, since they cannot be disabled
        weavy.helloWorld = function (targetText) {

            // Combine the common weavy property and the provided text
            sayHello(weavy.helloText + "-" + targetText);
        };

        // Internal protected method
        function sayHello(classText) {
            var root = weavy.getRoot()
            if (root) {
                // Add weavy-hello-world class to the main weavy container
                $(root.section).addClass("weavy-" + classText);

                // This is the last step in the flow and shows true if everything was successful
                weavy.log("Hello World done:", $(root.section).hasClass("weavy-hello-world"));
            }
        }

        // Add a one-time load event listener
        weavy.one("load", function (e) {
            weavy.debug("Hello World oneload");
            weavy.info("Weavy ver:", Weavy.version);

            // Check if this plugin is enabled.
            // Not necessary here, but useful if you reference another plugin instead
            if (weavy.plugins.helloworld) {
                // Call the public method with the exported text as parameter
                weavy.helloWorld(weavy.plugins.helloworld.exportedText);
            }
        });

        // Export the worldText
        return { exportedText: pluginOptions.worldText };

        // END OF EXAMPLE CODE
    }

    // Set any default options here
    HelloWorldPlugin.defaults = {
        helloText: 'hello',
        worldText: 'world'
    };

    // Non-optional dependencies
    // Dependency plugins always run prior to this plugin.
    // Unfound plugins or incorrect dependencies will result in an error.
    // The following will result in a circular reference error.
    HelloWorldPlugin.dependencies = [
        "helloworld"
    ];

    // Register and return the plugin.
    // You should register the plugin the same way you would define a prototype for an object
    console.debug("Registering Weavy plugin: helloworld");

    return Weavy.plugins.helloworld = HelloWorldPlugin;
}));
