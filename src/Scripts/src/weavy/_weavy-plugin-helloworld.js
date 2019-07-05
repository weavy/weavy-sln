(function ($) {
    // Set you plugin name here. This name will be used for registration and options etc.
    var PLUGIN_NAME = "helloworld";

    // This is an example hello-world plugin for Weavy.
    // It adds the class 'weavy-hello-world' to the weavy container.
    // It demonstrates various ways to work with weavy.

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    // Register the plugin the same way you would define a prototype
    // {this} is passed as a reference to the weavy instance
    // {options} is passed to the function, which you also may access via weavy.options.plugins[PLUGIN_NAME]
    Weavy.plugins[PLUGIN_NAME] = function (options) {

        // Best practice is to use 'weavy' instead of 'this' to avoid confusion
        var weavy = this;

        // EXAMPLE CODE BELOW, REPLACE IT WITH ANY CUSTOM CODE

        // Other options
        var weavyOptions = weavy.options; // All global options for weavy
        var pluginOptions = weavy.options.plugins[PLUGIN_NAME]; // Same as options
        
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
            if (weavy.nodes.container) {
                // Add weavy-hello-world class to the main weavy container
                $(weavy.nodes.container).addClass("weavy-" + classText);

                // This is the last step in the flow and shows true if everything was successful
                weavy.log("Hello World done:", PLUGIN_NAME, $(weavy.nodes.container).hasClass("weavy-hello-world"));
            }
        }

        // Add a one-time load event listener
        weavy.one("load", function (e) {
            weavy.debug("Hello World oneload:", PLUGIN_NAME);
            weavy.info("Weavy ver:", weavy.options.version);

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
    Weavy.plugins[PLUGIN_NAME].defaults = {
        helloText: 'hello',
        worldText: 'world'
    };

    // Non-optional dependencies
    // Dependency plugins always run prior to this plugin.
    // Unfound plugins or incorrect dependencies will result in an error.
    // The following will result in a circular reference error.
    Weavy.plugins[PLUGIN_NAME].dependencies = [
        "helloworld"
    ];

})(jQuery);
