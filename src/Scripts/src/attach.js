/*global Turbolinks */
var wvy = wvy || {};
wvy.attach = (function ($) {

    document.addEventListener("turbolinks:load", function () {
        if (!wvy.browser.embedded) {
            $("#filebrowser").attr("src", "https://filebrowser.weavycloud.com?origin=" + window.location.origin);
        } else {
            // request current origin from Weavy()
            window.parent.postMessage({ name: 'request:origin' }, "*")
        }
    });

    // submit new google drive doc to filebrowser.weavycloud.com
    $(document).on("click", "#google-create-modal button[type='submit']", function (e) {

        var guid = $(this).data("guid");
        var type = $(this).data("type");
        var title = $("#google-create-modal input.doctitle").val() || "New Google " + type;
        $(this).prop("disabled", true);

        $("#filebrowser")[0].contentWindow.postMessage({ name: 'create', title: title, type: type, guid: guid }, "*");

        return false;
    });

    // handle click on each provider when selecting adding new file from cloud provider
    $(document).on("click", "a.list-group-item[data-provider]", function (e) {
        e.preventDefault();

        var guid = $(this).data("guid");
        var provider = $(this).data("provider");
        var action = $(this).data("action");

        switch (action) {

            case "custom-link":
                $("#attach-modal .custom-link").removeClass("d-none");
                $("#attach-modal .modal-footer").removeClass("d-none");
                break;
            default:
                // maximize window if Google Drive picker
                if (provider === "google-drive") {
                    $("#filebrowser").show();
                    window.parent.postMessage({ name: 'maximize' }, "*")
                }

                // send message to filebrowser.weavycloud.com to open up correct picker
                $("#filebrowser")[0].contentWindow.postMessage({ name: 'open', provider: provider, guid: guid }, "*");
        }

        return false;
    });

    // handle custom link
    $(document).on("click", "#attach-form button[type=submit]", function (e) {
        e.preventDefault();
        var url = $("#attach-form input[name=url]").val();
        var guid = $("#attach-form input[name=guid]").val();
        var title = $("#attach-form input[name=linktitle]").val() || url;
        var embedded = $("#attach-form input[name=linkembedded]").is(":checked");


        if (url !== "") {
            attach([{ url: url, title: title, embedded: embedded, guid: guid }], 'custom');
        }
    });

    // hide show custom link properties
    $(document).on("change keyup input", "#attach-form input[name=url]", function (e) {
        if ($(this).val() !== "") {
            $("#attach-form input[name=linktitle]").parent().removeClass("d-none");
            $("#attach-form input[name=linkembedded]").parent().removeClass("d-none");
            $("#attach-form button[type=submit]").prop("disabled", false);
        } else {
            $("#attach-form input[name=linktitle]").parent().addClass("d-none");
            $("#attach-form input[name=linkembedded]").parent().addClass("d-none");
            $("#attach-form button[type=submit]").prop("disabled", true);
        }
    })

    // listen to messages from filebrowser.weavycloud.com and weavy client
    window.addEventListener("message", function (e) {

        if (e.data.name === "insert") {
            // insert new link entity
            var links = e.data.links;
            var provider = e.data.provider;
            var open = e.data.open;

            $("#attach-form button[type=submit]").prop("disabled", true);

            attach(links, provider, open);

            $("#filebrowser").hide();
        } else if (e.data.name === "closePicker") {
            // close Google Drive picker
            $("#filebrowser").hide();
        } else if (e.data.name === "origin") {
            // set correct origin to filebrowser.weavycloud.com. Required by Google Drive picker!
            $("#filebrowser").attr("src", "https://filebrowser.weavycloud.com?origin=" + e.data.url);
        }
    });

    var attach = function (links, provider, open) {

        var $overlaySpinner = $("#attach-modal-spinner");
        $overlaySpinner.removeClass("d-none");

        var url = wvy.url.resolve($("#attach-form").attr("action"));

        var data = [];
        for (var i = 0; i < links.length; i++) {
            data.push({ guid: links[i].guid, name: links[i].title, provider: provider, kind: links[i].type, uri: links[i].url });
        }

        $.ajax({
            url: url,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(data)
        }).then(function (response) {
            
            if (response.skipped) {
                
                if (response.skipped.length === 1) {
                    wvy.alert.warning('There is already an item named ' + response.skipped[0].name + '.' +
                        '<div>' +
                        '<button type="button" class="btn btn-icon insert-content-keep"><svg class="i">' +
                        '<svg class="i i-check-all" height="24" viewBox="0 0 24 24" width="24"><path d="m.41 13.41 5.59 5.59 1.41-1.42-5.58-5.58m20.41-6.42-10.58 10.59-4.16-4.17-1.43 1.41 5.59 5.59 12-12m-5.66 0-1.41-1.42-6.35 6.35 1.42 1.41z"/></svg> Keep both' +
                        '</button > ' +                        
                        '<button type="button" class="btn btn-icon insert-content-replace"><svg class="i">' +
                        '<svg class="i i-check" height="24" viewBox="0 0 24 24" width="24"><path d="m21 7-12 12-5.5-5.5 1.41-1.41 4.09 4.08 10.59-10.58z"/></svg> Replace the item' +
                        '</button > ' +                        
                        '<button type="button" class="btn btn-icon insert-content-skip">' +
                        '<svg class="i i-close" height="24" viewBox="0 0 24 24" width="24"><path d="m19 6.41-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"/></svg> Skip this item' +
                        '</button></div>');
                } else {
                    wvy.alert.warning('There are ' + response.skipped.length + ' items with the same names.' +
                        '<div>' +
                        '<button type="button" class="btn btn-icon insert-content-keep">' +
                        '<svg class="i i-check-all" height="24" viewBox="0 0 24 24" width="24"><path d="m.41 13.41 5.59 5.59 1.41-1.42-5.58-5.58m20.41-6.42-10.58 10.59-4.16-4.17-1.43 1.41 5.59 5.59 12-12m-5.66 0-1.41-1.42-6.35 6.35 1.42 1.41z"/></svg> Keep all the items' +
                        '</button>' +
                        '<button type="button" class="btn btn-icon insert-content-replace">' +
                        '<svg class="i i-check" height="24" viewBox="0 0 24 24" width="24"><path d="m21 7-12 12-5.5-5.5 1.41-1.41 4.09 4.08 10.59-10.58z"/></svg> Replace the items' +
                        '</button>' +                        
                        '<button type="button" class="btn btn-icon insert-content-skip">' +
                        '<svg class="i i-close" height="24" viewBox="0 0 24 24" width="24"><path d="m19 6.41-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"/></svg> Skip these items' +
                        '</button></div>');
                }

                $("button.insert-content-skip").on("click", function (e) {
                    redirect();
                });

                $("button.insert-content-keep").on("click", function (e) {
                    replaceOrKeep(url, response.skipped, 'keep');
                });

                $("button.insert-content-replace").on("click", function (e) {
                    replaceOrKeep(url, response.skipped, 'replace');
                });

            } else {
                redirect(open ? response.inserted[0].url : undefined);

            }
        }).fail(function (xhr, status, error) {
            setTimeout(function () {
                var json = JSON.parse(xhr.responseText);
                wvy.alert.warning(json.message);
            }, 100);

        }).always(function () {
            $overlaySpinner.addClass("d-none");
            $("button[type='submit']").prop("disabled", false);
        });


    }

    var replaceOrKeep = function (url, items, action) {
        $.ajax({
            url: url,
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify({
                action: action, items: items.map(function (i) {
                    i.guid = i.content_type;
                    i.url = i.link_url;
                    delete i["created_by"];
                    delete i["icon"];
                    return i;
                })
            })
        }).then(function () {
            redirect();
        })
    }

    var redirect = function (url) {
        if (url) {
            // redirect to new item
            Turbolinks.visit(url, { action: "replace" });
            window.parent.postMessage({ name: 'maximize' }, "*")
        } else {
            // reload page
            Turbolinks.visit(location.toString(), { action: "replace" })
        }
    }
    
})(jQuery);
