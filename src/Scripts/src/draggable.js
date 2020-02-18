var wvy = wvy || {};

// See https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API

(function ($) {

    var dragData;

    if (wvy.turbolinks.enabled) {
        // init
        document.addEventListener("turbolinks:load", init);

        // cleanup
        document.addEventListener("turbolinks:before-cache", destroy);
    } else {
        $(document).ready(init);
    }

    function init() {
        $(".draggable [draggable='true']").get().forEach(function (item) {
            item.addEventListener('dragstart', dragStart, false);
            item.addEventListener('drop', drop, false);
            item.addEventListener('dragenter', dragEnter, false);
            item.addEventListener('dragover', dragOver, false);
            item.addEventListener('dragleave', dragLeave, false);
            item.addEventListener('dragend', dragEnd, false);
        });

        $(".breadcrumb a[data-allowed-children]").get().forEach(function (item) {
            item.addEventListener('drop', drop, false);
            item.addEventListener('dragover', dragOver, false);
            item.addEventListener('dragleave', dragLeave, false);
        });
    }

    function destroy() {
        document.addEventListener("turbolinks:before-cache", function () {
            $(".draggable [draggable='true']").get().forEach(function (item) {
                item.removeEventListener('dragstart', dragStart);
                item.removeEventListener('drop', drop);
                item.removeEventListener('dragenter', dragEnter);
                item.removeEventListener('dragover', dragOver);
                item.removeEventListener('dragleave', dragLeave);
                item.removeEventListener('dragend', dragEnd);
            });

            $(".breadcrumb a[data-allowed-children]").get().forEach(function (item) {
                item.removeEventListener('drop', drop);
                item.removeEventListener('dragover', dragOver);
                item.removeEventListener('dragleave', dragLeave);
            });
        });
    }

    function dragStart(e) {
        $("body").addClass("dragging");
        e.dataTransfer.dropEffect = "move";
        e.dataTransfer.effectAllowed = "move";

        dragData = { id: $(e.target).data("id"), guid: $(e.target).data("item-guid") };
        e.dataTransfer.setData("application/json", JSON.stringify(dragData));
        e.dataTransfer.setData("text/uri-list", document.location.origin + $(e.target).data("href"));
        e.dataTransfer.setData("text/plain", $(e.target).data("id"));
    }

    function dragEnter(e) {
        e.dataTransfer.dropEffect = "move";
    }

    function dragOver(e) {
        var allowed = $(e.currentTarget).data("allowed-children");

        if (allowed != null && $(e.currentTarget).data("id") !== dragData.id && (allowed === "*" || allowed.includes(dragData.guid))) {
            this.classList.add("dragging-over");
            e.dataTransfer.dropEffect = "move";            
            e.preventDefault();
        }
    }

    function dragLeave(e) {
        e.preventDefault();
        this.classList.remove("dragging-over");
    }

    function drop(e) {
        var data = JSON.parse(e.dataTransfer.getData("application/json"));
        var source = $("[data-id='" + data.id + "']");
        var targetContent = e.target.getAttribute("data-id") != null ? $(e.target) : $(e.target).closest("[data-id]");
        var targetApp = e.target.getAttribute("data-app") != null ? $(e.target) : $(e.target).closest("a[data-app]");

        if (source.length && (targetContent.length || targetApp)) {
            source.hide();
            var url = "/a/content/" + data.id + "/move?" + (targetContent.length ? "contentid=" + targetContent.data("id") : "appid=" + targetApp.data("app"));

            $.ajax({
                url: wvy.url.resolve(url),
                type: "POST"
            }).done(function () {
                source.remove();
            }).fail(function (xhr) {
                source.show();
                var json = JSON.parse(xhr.responseText);
                wvy.alert.warning(json.message);
            });
        }
    }

    function dragEnd(e) {
        dragData = null;
        $("body").removeClass("dragging");
    }

})(jQuery);
