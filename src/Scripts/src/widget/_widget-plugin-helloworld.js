(function ($) {
    // Set you plugin name here. This name will be used for registration and options etc.
    var PLUGIN_NAME = "helloworld";

    // This is an example hello-world plugin for the Weavy widget.
    // It adds the class 'widget-hello-world' to the widget container.
    // It demonstrates various ways to work with the widget.

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    // Register the plugin the same way you would define a prototype
    // {this} is passed as a reference to the widget instance
    // {options} is passed to the function, which you also may access via widget.options.plugins[PLUGIN_NAME]
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {

        // Best practice is to use 'widget' instead of 'this' to avoid confusion
        var widget = this;

        // EXAMPLE CODE BELOW, REPLACE IT WITH ANY CUSTOM CODE

        // Other options
        var widgetOptions = widget.options; // All global options for the widget
        var pluginOptions = widget.options.plugins[PLUGIN_NAME]; // Same as options
        
        // Set a common widget property from options
        widget.helloText = options.helloText;

        // Register a public method on the widget
        // Avoid prototype methods, since they cannot be disabled
        widget.helloWorld = function (targetText) {

            // Combine the common widget property and the provided text
            sayHello(widget.helloText + "-" + targetText);
        };

        // Internal protected method
        function sayHello(classText) {
            if (widget.nodes.container) {
                // Add weavy-hello-world class to the main widget container
                $(widget.nodes.container).addClass("weavy-" + classText);

                // This is the last step in the flow and shows true if everything was successful
                widget.log("Hello World done:", PLUGIN_NAME, $(widget.nodes.container).hasClass("weavy-hello-world"));
            }
        }

        // Add a one-time load event listener
        widget.one("load", function (e) {
            widget.debug("Hello World oneload:", PLUGIN_NAME);
            widget.info("WeavyWidget ver:", widget.options.version);

            // Check if this plugin is enabled.
            // Not necessary here, but useful if you reference another plugin instead
            if (widget.plugins.helloworld) {
                // Call the public method with the exported text as parameter
                widget.helloWorld(widget.plugins.helloworld.exportedText);
            }
        });

        // Export the worldText
        return { exportedText: pluginOptions.worldText };

        // END OF EXAMPLE CODE
    }

    // Set any default options here
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        helloText: 'hello',
        worldText: 'world'
    };

    // Non-optional dependencies
    // Dependency plugins always run prior to this plugin.
    // Unfound plugins or incorrect dependencies will result in an error.
    // The following will result in a circular reference error.
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = [
        "helloworld"
    ];

})(jQuery);
