define(['kloudspeaker/core/user/repository', 'kloudspeaker/settings', 'kloudspeaker/utils', 'kloudspeaker/ui/texts', 'kloudspeaker/ui/dialogs', 'knockout'], function(repository, settings, utils, texts, dialogs, ko) {
    return function() {
        var showLanguages = (settings.language.options && settings.language.options.length > 1);
        var model = {
            user: null,
            newUser: true,

            name: ko.observable('').extend({
                required: true
            }),
            email: ko.observable(''),
            password: ko.observable(''),
            type: ko.observable(null),
            expiration: ko.observable(null),
            language: ko.observable(null),
            auth: ko.observable(null),

            passwordMissing: ko.observable(false),

            languageOptions: settings.language.options,
            languageOptionTitle: function(l) {
                return texts.get('language_' + l);
            },
            languageNoneTitle: texts.get('configAdminUsersUserDialogLangDefault', texts.get('language_' + (settings.language["default"] || 'en'))),

            userTypeOptions: ['a'],
            userTypeOptionTitle: function(type) {
                return texts.get('configAdminUsersType_' + type);
            },
            userTypeNoneTitle: texts.get('configAdminUsersTypeNormal'),

            authOptions: [],
            authOptionTitle: function(ao) {
                return ao;
            },
            authNoneTitle: ""
        };
        model.errors = ko.validation.group(model, {
            observable: true,
            deep: false
        });

        return {
            activate: function(o) {
                model.authOptions = o.authenticationOptions;
                model.authNoneTitle = texts.get('configAdminUsersUserDialogAuthDefault', o.authenticationOptions[0]);
                if (o.userId) {
                    model.newUser = false;

                    repository.getUser(o.userId).done(function(u) {
                        model.user = u;

                        model.name(u.name);
                        model.email(u.email);
                        model.type(u.user_type ? u.user_type.toLowerCase() : null);
                        model.expiration(u.expiration);
                        model.language(u.lang ? u.lang.toLowerCase() : null);
                        model.auth(u.auth ? u.auth.toLowerCase() : null);
                    });
                }
            },
            generatePassword: function() {
                model.password(utils.generatePassword());
            },
            onDialogButton: function(id) {
                if (id == 'no') {
                    this.close();
                    return;
                }

                //validate
                model.name.valueHasMutated();
                model.passwordMissing(false);
                if (model.newUser) {
                    var effectiveAuth = model.auth() || model.authOptions[0];
                    var pwRequired = (effectiveAuth === 'pw');
                    if (pwRequired && (!model.password() || model.password().length === 0)) {
                        model.passwordMissing(true); //TODO dynamic validation
                        return;
                    }
                }
                if (model.errors().length > 0) {
                    return;
                }

                // store
                var user = {
                    name: model.name(),
                    email: model.email(),
                    user_type: model.type(),
                    expiration: model.expiration(),
                    lang: model.language(),
                    auth: model.auth()
                }
                if (model.newUser) {
                    user.password = model.password();
                    repository.addUser(user).done(this.complete).fail(function(e) {
                        if (e.code == 301) {
                            this.handled = true;
                            dialogs.error({
                                message: texts.get('configAdminUsersUserErrorDuplicate')
                            });
                        }
                    });
                } else repository.updateUser(model.user.id, user).done(this.complete).fail(function(e) {
                    if (e.code == 301) {
                        this.handled = true;
                        dialogs.error({
                            message: texts.get('configAdminUsersUserErrorDuplicate')
                        });
                    }
                });
            },
            showLanguages: showLanguages,

            model: model
        };
    }
});
