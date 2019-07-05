var wvy = wvy || {};

// restore entity
$(document).on("click", ".table-trashed [data-recycle][data-id]", function (e) {
    e.preventDefault();
    console.log("restore?");

    var $row = $(this).closest(".table-trashed");
    var type = this.dataset.recycle;
    var id = this.dataset.id;

    wvy.api.restore(type, id).then(function () {
        $row.addClass("d-none");
        wvy.alert.alert("success", "The <a href='" + wvy.url.mvc(type) + id + "' class='alert-link'>" + type + "</a> was restored.", 5000, "alert-trash-" + type + "-" + id);
    });
});
