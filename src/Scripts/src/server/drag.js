// drag and drop for moving content items in the files app
// see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
var wvy = wvy || {};
wvy.drag = (function ($) {

    // refererence to dragged item
    var _dragged;

    if (wvy.turbolinks.enabled) {
        // init
        document.addEventListener("turbolinks:load", init);

        // cleanup
        document.addEventListener("turbolinks:before-cache", destroy);
    } else {
        $(document).ready(init);
    }

    function init() {
        $(".draggable [draggable='true']").get().forEach(function (el) {
            initElement(el);
        });

        $(".breadcrumb a[data-allowed-children]").get().forEach(function (el) {
            el.addEventListener('dragenter', dragEnter, false);
            el.addEventListener('dragover', dragOver, false);
            el.addEventListener('dragleave', dragLeave, false);
            el.addEventListener('drop', drop, false);
        });
    }

    // init a single element
    function initElement(el) {
        el.addEventListener('dragstart', dragStart, false);
        el.addEventListener('dragenter', dragEnter, false);
        el.addEventListener('dragover', dragOver, false);
        el.addEventListener('dragleave', dragLeave, false);
        el.addEventListener('dragend', dragEnd, false);
        el.addEventListener('drop', drop, false);
    }

    function destroy() {
        document.addEventListener("turbolinks:before-cache", function () {
            $(".draggable [draggable='true']").get().forEach(function (item) {
                item.removeEventListener('dragstart', dragStart);
                item.removeEventListener('dragenter', dragEnter);
                item.removeEventListener('dragover', dragOver);
                item.removeEventListener('dragleave', dragLeave);
                item.removeEventListener('dragend', dragEnd);
                item.removeEventListener('drop', drop);
            });

            $(".breadcrumb a[data-allowed-children]").get().forEach(function (item) {
                item.removeEventListener('dragenter', dragEnter);
                item.removeEventListener('dragover', dragOver);
                item.removeEventListener('dragleave', dragLeave);
                item.removeEventListener('drop', drop);
            });
        });
    }

    function dragStart(e) {
        // store ref. to dragged elem and add dragging class
        _dragged = e.target;
        _dragged.classList.add("dragging");

        // indicate that we are moving
        e.dataTransfer.effectAllowed = "move";

        // add .drag class to body
        document.documentElement.classList.add("drag");
    }

    function dragEnter(e) {
        if (_dragged != null) {
            var allowed = e.currentTarget.dataset.allowedChildren;
            if (allowed != null && e.currentTarget.dataset.id !== _dragged.dataset.id && (allowed === "*" || allowed.includes(_dragged.dataset.contentGuid))) {
                // highlight potential drop target when the draggable element enters it
                this.classList.add("drop-target");
            }
        }
    }

    function dragOver(e) {
        if (this.classList.contains("drop-target")) {
            // prevent default to allow drop
            e.preventDefault();
        }
    }

    function dragLeave(e) {
        // reset drop target when the draggable element leaves it
        this.classList.remove("drop-target");
    }

    function drop(e) {
        // prevent default action (open as link for some elements)
        e.preventDefault();

        // reset drop target
        this.classList.remove("drop-target");

        if (_dragged != null) {

            var url = "/a/content/" + _dragged.dataset.id + "/move";
            if (e.currentTarget.dataset.app) {
                url += "?appid=" + e.currentTarget.dataset.app;
            } else if (e.currentTarget.dataset.id) {
                url += "?contentid=" + e.currentTarget.dataset.id;
            } else {
                return;
            }

            // hide dragged element
            var $dragged = $(_dragged).hide();

            // then call api to move content item
            $.ajax({
                url: wvy.url.resolve(url),
                type: "POST"
            }).done(function () {
                // remove dragged element
                $dragged.remove();
            }).fail(function (xhr) {
                // show dragged element again
                $dragged.show();
                var json = JSON.parse(xhr.responseText);
                wvy.alert.warning(json.message);
            });

        }
    }

    function dragEnd(e) {
        // reset the dragged element
        _dragged.classList.remove("dragging");
        _dragged = null;

        // remove .drag class from html
        document.documentElement.classList.remove("drag");
    }

    return {
        initElement: initElement
    }


})(jQuery);
