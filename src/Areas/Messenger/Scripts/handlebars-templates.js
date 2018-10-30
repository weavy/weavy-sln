this["Handlebars"] = this["Handlebars"] || {};
this["Handlebars"]["templates"] = this["Handlebars"]["templates"] || {};
this["Handlebars"]["templates"]["fileuploads"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=container.lambda, alias2=container.escapeExpression, alias3=depth0 != null ? depth0 : (container.nullContext || {}), alias4=helpers.helperMissing, alias5="function";

  return "<tr>\r\n    <td class=\"table-icon\"><svg class=\"i text-"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.color : stack1), depth0))
    + "\"><use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.name : stack1), depth0))
    + "\"></use></svg></td>\r\n    <td>"
    + alias2(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"name","hash":{},"data":data}) : helper)))
    + " ("
    + alias2((helpers.file_size || (depth0 && depth0.file_size) || alias4).call(alias3,(depth0 != null ? depth0.size : depth0),{"name":"file_size","hash":{},"data":data}))
    + ")<input type=\"hidden\" name=\"blobs\" value=\""
    + alias2(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" /></td>\r\n    <td class=\"table-icon\"><button type=\"button\" class=\"btn btn-icon\" data-remove=\""
    + alias2(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"id","hash":{},"data":data}) : helper)))
    + "\"><svg class=\"i\"><use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#close\"></use></svg></button></td>\r\n</tr>\r\n";
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
    + "</div>\r\n    </div>\r\n\r\n    <div class=\"status status-sending\" title=\"Sending\">\r\n        <svg class=\"i i-18\"><use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#circle-outline\"></use></svg>\r\n    </div>\r\n</div>\r\n";
},"useData":true});
this["Handlebars"]["templates"]["message-sent"] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<div class=\"message me"
    + alias3((helpers.transparent_emoji || (depth0 && depth0.transparent_emoji) || alias2).call(alias1,(depth0 != null ? depth0.text : depth0),{"name":"transparent_emoji","hash":{},"data":data}))
    + "\" data-message=\""
    + alias3(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\">\r\n\r\n    <div class=\"bubble\">\r\n        <div class=\"text\">"
    + alias3((helpers.emojione || (depth0 && depth0.emojione) || alias2).call(alias1,(depth0 != null ? depth0.text : depth0),{"name":"emojione","hash":{},"data":data}))
    + "</div>\r\n    </div>\r\n\r\n    <div class=\"status status-sent\" title=\"Sent\">\r\n        <svg class=\"i i-18\"><use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#check-circle-outline\"></use></svg>\r\n    </div>\r\n</div>\r\n";
},"useData":true});
this["Handlebars"]["templates"]["suggest-template"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper;

  return ((stack1 = ((helper = (helper = helpers.title_highlight || (depth0 != null ? depth0.title_highlight : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"title_highlight","hash":{},"data":data}) : helper))) != null ? stack1 : "");
},"3":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"title","hash":{},"data":data}) : helper)));
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<svg class=\"i text-"
    + alias4(((helper = (helper = helpers.color || (depth0 != null ? depth0.color : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"color","hash":{},"data":data}) : helper)))
    + "\"><use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#"
    + alias4(((helper = (helper = helpers.icon || (depth0 != null ? depth0.icon : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"icon","hash":{},"data":data}) : helper)))
    + "\"></use></svg>\r\n    <span>"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.title_highlight : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "</span>\r\n";
},"useData":true});