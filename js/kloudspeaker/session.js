define(['kloudspeaker/service', 'kloudspeaker/events', 'kloudspeaker/permissions', 'kloudspeaker/utils', 'kloudspeaker/ui'], function(service, events, permissions, utils, ui) {
    //TODO remove global session

    var session = false;
    var reset = function() {
        events.dispatch('session/end');
        init();
    }
    var init = function() {
        service.get("session/info/").fail(function() {
            ui.showError();
        }).done(function(s) {
            onStart(s);
        });
    };
    var onStart = function(s) {
        var user = s.authenticated ? {
            id: s.user_id,
            name: s.username,
            type: s.user_type,
            lang: s.lang,
            admin: s.user_type == 'a',
            permissions: s.permissions,
            auth: s.user_auth,
            hasPermission: permissions.hasPermission    //shortcut
        } : null;

        session = {
            id: s.session_id,
            user: user,
            features: s.features,
            plugins: s.plugins,
            data: s,
            version: s.version,
            revision: s.revision
        };

        kloudspeaker.session = session; //TODO remove

        events.dispatch('session/start', session);
    };

    return {
        init: init,
        authenticate: function(username, password, remember) {
            return service.post("session/authenticate/", {
                username: username,
                password: utils.Base64.encode(password),
                remember: remember
            }).done(function(s) {
                onStart(s);
            });
        },
        end: function(dontSend) {
            session = false;
            kloudspeaker.session = false; //TODO remove

            if (!dontSend)
                return service.post("session/logout").done(function(s) {
                    reset();
                });
            reset();
        },
        get: function() {
            return session;
        }
    };
});
