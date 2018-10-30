(function ($) {
    var PLUGIN_NAME = "helloworld";

    // This is an example hello-world plugin for the Weavy widget.
    // It adds the class 'widget-hello-world' to the widget container.
    // It demonstrates various ways to work with the widget.

    console.debug("registering widget plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy widget prototype is required to register plugin: " + PLUGIN_NAME);
    }

    // Register the plugin the same way you would define a prototype
    // {this} is passed as a reference to the widget instance
    // {options} is passed to the function, which you also may access via this.options
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        console.debug("running widget plugin:", PLUGIN_NAME);

        // Best practice is to use 'widget' instead of 'this' to avoid confusion
        var widget = this;

        // add plugin default options to widget.options
        // any options set when instantiating new Weavy(options) is passed to the plugin
        if (options && typeof options === "object") {
            widget.options = widget.extendDefaults(Weavy.plugins[PLUGIN_NAME].defaults, options);
        }

        // EXAMPLE CODE BELOW, REPLACE IT WITH ANY CUSTOM CODE

        // Set a common widget property from options
        widget.helloWorldText = widget.options.hello_world;

        // Register a public prototype method on the widget
        Weavy.prototype.helloWorld = function () {
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
            console.debug("widget plugin oneload:", PLUGIN_NAME)
            widget.helloWorld();
        })

        // END OF EXAMPLE CODE
    }

    // Set any default options here
    Weavy.plugins[PLUGIN_NAME].defaults = {
        hello_world: 'hello-world'
    }

})($);
