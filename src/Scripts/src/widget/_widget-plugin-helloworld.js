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
    // {options} is passed to the function, which you also may access via this.options
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {

        // Best practice is to use 'widget' instead of 'this' to avoid confusion
        var widget = this;

        // EXAMPLE CODE BELOW, REPLACE IT WITH ANY CUSTOM CODE

        // Set a common widget property from options
        widget.helloWorldText = options.hello_world;

        // Register a public prototype method on the widget
        WeavyWidget.prototype.helloWorld = function () {
            if (widget.container) {
                sayHello();
            }
        };

        // Internal protected method
        function sayHello() {
            // Add weavy-hello-world class to the main widget container
            $(widget.container).addClass("weavy-" + widget.helloWorldText);
        }

        // Add a one-time load event listener
        widget.one("load", function (e) {
            console.debug("WeavyWidget plugin oneload:", PLUGIN_NAME);
            console.info("WeavyWidget version:", widget.version);
            console.info("Weavy version:", widget.options.version);
            widget.helloWorld();
        });

        // END OF EXAMPLE CODE
    }

    // Set any default options here
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        hello_world: 'hello-world'
    };

})(jQuery);
