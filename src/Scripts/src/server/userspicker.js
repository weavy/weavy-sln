var wvy = wvy || {};

wvy.userspicker = (function ($) {

    function validateEmail(email) {
        var re = /^([a-zA-Z0-9_\-.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
        return re.test(email);
    }

    function formatUser(user) {
        if (user.loading) return user.text;
        if (user.invite) return user.email + " <span class='badge badge-info'>" + wvy.t("invite") + "</span>";        
        return "<img class='img-32 avatar' src='" + wvy.url.thumb(user.thumb, "32") + "'/> " + (user.profile && user.profile.name ? user.profile.name : user.username) + ' <small>@' + user.username + '</small>'+ (user.is_external ? " <span class='badge badge-warning'>external</span>" : "");
    }

    function formatUserSelection(user) {                
        var name = (user.profile && user.profile.name ? user.profile.name : user.username || user.text);
        if (user.invite) return user.email + " <span class='badge badge-info'>" + wvy.t("invite") + "</span>";
        return name;
    }

    function initPicker(element) {
        

        var $el;

        if (element) {
            $el = $(element);
        } else {
            $el = $("select[data-role=users]");
        }
        
        return $el.select2({
            ajax: {
                url: wvy.url.resolve("a/users"),
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        q: params.term,
                        status: "active",
                        top: 10,
                        skip: (params.page - 1) * 10,
                        count: true,
                        filter: true
                    };
                },
                processResults: function (data, params) {
                    // allow user invite with attribute data-user-invite
                    if (this.$element.data("userInvite") !== undefined) {
                        if (data.count === 0 && validateEmail(params.term)) {                            
                            return {
                                results: [{ id: params.term, invite: true, name: params.term, email: params.term }]
                            }
                        }
                    }

                    return {
                        results: data.data,
                        pagination: {
                            more: data.next ? true : false
                        }
                    };
                },
                cache: false
            },
            escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
            minimumInputLength: 1,
            templateResult: formatUser,
            templateSelection: formatUserSelection,
            selectOnClose: true,
            allowClear: true,
            placeholder: $el.data("placeholder") || "",
        });
    }

    // init picker
    document.addEventListener("turbolinks:load", function () {
        //console.debug("userspicker.js:init");
        initPicker();
    });

    // destroy picker
    document.addEventListener("turbolinks:before-cache", function () {
        //console.debug("userspicker.js:destroy");
        $('select[data-role=users]').select2('destroy');
    });

    return {
        init: initPicker
    }
})(jQuery);
