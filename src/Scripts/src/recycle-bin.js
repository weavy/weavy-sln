var wvy = wvy || {};

// restore entity
$(document).on("click", ".table-trashed [data-recycle][data-id]", function (e) {
    e.preventDefault();

    var $row = $(this).closest(".table-trashed");
    var type = this.dataset.recycle;
    var id = this.dataset.id;

    wvy.api.restore(type, id).then(function () {
        $row.addClass("d-none");
        wvy.alert.alert("success", "<a href='" + wvy.url.mvc(type) + id + "' class='alert-link'>" + wvy.t("The item was restored.") + "</a>", 5000, "alert-trash-" + type + "-" + id);
    });
});

// permanently delete entity
$(document).on("click", ".table-trashed [data-delete][data-id]", function (e) {
    e.preventDefault();

    var $row = $(this).closest(".table-trashed");
    var type = this.dataset.delete;
    var id = this.dataset.id;

    wvy.api.delete(type, id).then(function () {
        $row.addClass("d-none");
        wvy.alert.alert("success", wvy.t("The item was deleted."), 5000, "alert-trash-" + type + "-" + id);
    });
});
