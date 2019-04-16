define(['kloudspeaker/session', 'kloudspeaker/utils', 'kloudspeaker/ui', 'kloudspeaker/dom', 'kloudspeaker/ui/views'], function(session, utils, ui, dom, views) {
    return function() {
        return {
            attached: function($t, $c) {
                var s = session.get();
                var mv = views.getActiveMainView();

                dom.template("kloudspeaker-tmpl-config-useraccountview", s).appendTo($c);
                ui.process($c, ["localize"]);

                //TODO changePassword action?
                $("#user-account-change-password-btn").click(mv._mainview.changePassword);
            }
        };
    };
});
