this["Handlebars"] = this["Handlebars"] || {};
this["Handlebars"]["templates"] = this["Handlebars"]["templates"] || {};
this["Handlebars"]["templates"]["fileuploads"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<tr>\r\n    <td class=\"table-icon\"><svg class=\"i i-file\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"m13 9v-5.5l5.5 5.5m-12.5-7c-1.11 0-2 .89-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-12l-6-6z\" /></svg></td>\r\n    <td>"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + " ("
    + alias4((helpers.file_size || (depth0 && depth0.file_size) || alias2).call(alias1,(depth0 != null ? depth0.size : depth0),{"name":"file_size","hash":{},"data":data}))
    + ")<input type=\"hidden\" name=\"blobs\" value=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" /></td>\r\n    <td class=\"table-icon\"><button type=\"button\" class=\"btn btn-icon\" data-remove=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\"><svg class=\"i i-close\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"m19 6.41-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z\" /></svg></button></td>\r\n</tr>\r\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.data : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"useData":true});
this["Handlebars"]["templates"]["message-sending"] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<div class=\"message me sending"
    + alias3((helpers.transparent_emoji || (depth0 && depth0.transparent_emoji) || alias2).call(alias1,(depth0 != null ? depth0.text : depth0),{"name":"transparent_emoji","hash":{},"data":data}))
    + "\" data-message=\""
    + alias3(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\">\r\n\r\n    <div class=\"bubble\">\r\n        <div class=\"text\">"
    + alias3((helpers.emojione || (depth0 && depth0.emojione) || alias2).call(alias1,(depth0 != null ? depth0.text : depth0),{"name":"emojione","hash":{},"data":data}))
    + "</div>\r\n    </div>\r\n\r\n    <div class=\"status status-sending\" title=\"Sending\">\r\n        <svg class=\"i i-18 i-circle-outline\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"m12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m0-18c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10z\" /></svg>\r\n    </div>\r\n</div>\r\n";
},"useData":true});
this["Handlebars"]["templates"]["message-sent"] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<div class=\"message me"
    + alias3((helpers.transparent_emoji || (depth0 && depth0.transparent_emoji) || alias2).call(alias1,(depth0 != null ? depth0.text : depth0),{"name":"transparent_emoji","hash":{},"data":data}))
    + "\" data-message=\""
    + alias3(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\">\r\n\r\n    <div class=\"bubble\">\r\n        <div class=\"text\">"
    + alias3((helpers.emojione || (depth0 && depth0.emojione) || alias2).call(alias1,(depth0 != null ? depth0.text : depth0),{"name":"emojione","hash":{},"data":data}))
    + "</div>\r\n    </div>\r\n\r\n    <div class=\"status status-sent\" title=\"Sent\">\r\n        <svg class=\"i i-18 i-check-circle-outline\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"m12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10-10-4.48-10-10 4.48-10 10-10m0 2c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8m-1 12.5-4.5-4.5 1.41-1.41 3.09 3.08 5.59-5.58 1.41 1.41z\" /></svg>        \r\n    </div>\r\n</div>\r\n";
},"useData":true});
this["Handlebars"]["templates"]["suggest-template"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper;

  return ((stack1 = ((helper = (helper = helpers.title_highlight || (depth0 != null ? depth0.title_highlight : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"title_highlight","hash":{},"data":data}) : helper))) != null ? stack1 : "");
},"3":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"title","hash":{},"data":data}) : helper)));
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<svg class=\"i i-link-variant\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"m10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0-1.95-1.95-1.95-5.12 0-7.07l3.54-3.54c1.95-1.95 5.12-1.95 7.07 0s1.95 5.12 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48c1.18-1.17 1.18-3.07 0-4.24-1.17-1.18-3.07-1.18-4.24 0l-3.53 3.53c-1.18 1.17-1.18 3.07 0 4.24m2.82-4.24c.39-.39 1.03-.39 1.42 0 1.95 1.95 1.95 5.12 0 7.07l-3.54 3.54c-1.95 1.95-5.12 1.95-7.07 0s-1.95-5.12 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47c-1.18 1.17-1.18 3.07 0 4.24 1.17 1.18 3.07 1.18 4.24 0l3.53-3.53c1.18-1.17 1.18-3.07 0-4.24-.41-.39-.41-1.03 0-1.42z\" /></svg>\r\n<span>"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.title_highlight : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "</span>\r\n";
},"useData":true});