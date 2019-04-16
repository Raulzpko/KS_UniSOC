define(['kloudspeaker/instance', 'kloudspeaker/settings', 'kloudspeaker/session', 'kloudspeaker/service', 'kloudspeaker/features', 'kloudspeaker/permissions', 'kloudspeaker/plugins', 'kloudspeaker/dom', 'kloudspeaker/templates', 'kloudspeaker/ui', 'kloudspeaker/ui/dialogs', 'kloudspeaker/localization', 'kloudspeaker/ui/views/main/files', 'kloudspeaker/ui/views/main/config', 'kloudspeaker/utils', 'kloudspeaker/events'], function (app, settings, session, service, features, permissions, plugins, dom, templates, ui, dialogs, loc, FilesView, ConfigView, utils, events) {
    return function () {
        var that = this;

        that._mainFileView = false;
        that._mainConfigView = false;
        that._views = [];
        that._currentView = false;

        that._subviews = {};
        that._subviewsById = {};

        that.init = function ($c, viewId) {
            that._mainFileView = new FilesView();
            that._mainConfigView = new ConfigView();
            that._views = [that._mainFileView, that._mainConfigView];

            // legacy
            $.each(plugins.getMainViewPlugins(), function (i, p) {
                if (!p.mainViewHandler) return;
                var view = p.mainViewHandler();
                that._views.push(view);
            });

            // new
            _.each(utils.getKeys(ui._mainViews), function (id) {
                var view = ui._mainViews[id];
                that._views.push(view);

                if (view.subviews) {
                    that._subviews[id] = [];
                    _.each(view.subviews, function (sv) {
                        that._subviews[id].push(sv);
                        that._subviewsById[id + "/" + sv.id] = sv;
                    });
                }
            });

            return dom.loadContentInto($c, templates.url("mainview.html"), function () {
                that.onLoad(viewId);
            }, ['localize']);
        }

        that.destroy = function () {
            if (that._currentView && that._currentView.onDeactivate) that._currentView.onDeactivate();
            $.each(that._views, function (i, v) {
                if (v.deinit) v.deinit(that);
            });
        }

        that._getViewTitle = function (v) {
            var title = v.title;
            if (typeof (title) === "string" && title.startsWith("i18n:")) title = loc.get(title.substring(5));
            if (utils.isArray(title)) title = loc.get(title[0], title.slice(1));
            return title;
        }

        that.onLoad = function (viewId) {
            $(window).resize(that.onResize);
            that.onResize();

            var s = session.get();
            dom.template("kloudspeaker-tmpl-main-username", s).appendTo("#kloudspeaker-mainview-user");
            if (s.user) {
                ui.controls.dropdown({
                    element: $('#kloudspeaker-username-dropdown'),
                    items: that.getSessionActions()
                });
            }

            var menuitems = [];
            $.each(that._views, function (i, v) {
                if (v.init) v.init(that);

                menuitems.push({
                    icon: v.icon,
                    title: that._getViewTitle(v),
                    view: v
                });
            });

            ui.controls.dropdown({
                element: $('#kloudspeaker-mainview-dropdown'),
                items: menuitems,
                onItem: function (i) {
                    that.activateView(i.view);
                }
            });
            that._subviewmenu = ui.controls.dropdown({
                element: $('#kloudspeaker-mainsubview-dropdown'),
                items: [],
                onItem: function (i) {
                    if (that._subviewcb) that._subviewcb(i);
                }
            });

            events.dispatch('mainview/init', {});

            if (that._views.length > 0) {
                var view = false;
                if (viewId) {
                    view = that._findView(viewId[0]);
                    viewId = viewId.slice(1);
                    if (viewId.length === 0 || (viewId.length == 1 && viewId[0] === "")) viewId = false;
                }
                if (!view) {
                    view = that._views[0];
                    viewId = false;
                }
                that.activateView(view, viewId);
            }
        };

        that._findView = function (id) {
            var found = false;
            $.each(that._views, function (i, v) {
                if (v.id == id || v.viewId == id) {
                    found = v;
                    return false;
                }
            });
            return found;
        };

        that.onRestoreView = function (id) {
            var viewId = id[0];
            if (that._currentView && that._currentView.viewId == viewId) {
                that._currentView.onRestoreView(id.slice(1));
            } else {
                var view = that._findView(viewId);
                if (view) {
                    viewId = id.slice(1);
                    if (viewId.length === 0 || (viewId.length == 1 && viewId[0] === "")) viewId = false;
                    that.activateView(view, viewId);
                }
            }
        };

        that._onActivated = function () {
            events.dispatch('mainview/activate', {
                view: that._currentView
            });
        };

        that.activateView = function (v, id) {
            ui.hideActivePopup();
            if (that._currentView && that._currentView.onDeactivate) that._currentView.onDeactivate();
            $("#kloudspeaker-mainview-navlist-content").empty();
            that.showSubviewList(false);

            that._currentView = v;

            $("#kloudspeaker-mainview-navbar").empty();
            var $content = $("#kloudspeaker-mainview-viewcontent").empty();
            var $tools = $("#kloudspeaker-mainview-viewtools").empty();

            if (v.onActivate) {
                v.onActivate({
                    id: id,
                    content: $content,
                    tools: $tools,
                    addNavBar: that.addNavBar,
                    mainview: that,
                    fileview: that._mainFileView
                });
                that._onActivated();
            } else {
                var activateSubView = function (view, subview) {
                    that._doActivate(subview, view);
                };
                if (v.nav) {
                    var navBar = false;
                    var navBarItems = {};
                    var subViews = [];

                    _.each(v.nav, function (navItem) {
                        if (navItem.type == 'heading') {
                            if (navBar) that.addNavBar(navBar);
                            navBar = {
                                title: navItem.title,
                                items: []
                            };
                        } else if (navItem.type == 'link') {
                            var i = {
                                title: navItem.title,
                                callback: function () {
                                    window.location.href = navItem.url;
                                }
                            };
                            navBar.items.push(i);
                            subViews.push(i);
                        } else {
                            var sv = that._subviewsById[v.id + "/" + navItem.id];
                            var title = navItem.title || sv.title;
                            if (typeof (title) === "string" && title.startsWith("i18n:")) title = loc.get(title.substring(5));
                            if (utils.isArray(title)) title = loc.get(title[0], title.slice(1));

                            var svi = {
                                title: title,
                                callback: function () {
                                    activateSubView(v, sv);
                                }
                            };
                            navBar.items.push(svi);
                            subViews.push(svi);
                        }
                    });
                    if (navBar) that.addNavBar(navBar);
                    if (subViews) that.showSubviewList(subViews, function (sv) {
                        activateSubView(v, sv);
                    });
                }

                if (id && that._subviewsById[v.id + "/" + id]) that._doActivate(that._subviewsById[v.id + "/" + id], v);
                else that._doActivate(v);
            }

            //TODO template
            var aih = that._getViewTitle(v);
            if (v.icon) aih = "<i class='fa fa-" + v.icon + "'></i>&nbsp;" + aih;
            var $ai = $("#kloudspeaker-mainview-dropdown > a > span").html(aih);
        };

        that._doActivate = function (v, parent) {
            var $content = $("#kloudspeaker-mainview-viewcontent").empty();
            var $tools = $("#kloudspeaker-mainview-viewtools").empty();

            if (parent) that.setActiveSubview(v);
            else that.setActiveSubview(false);

            if (v.model) {
                var model = v.model;
                var p = {};
                if (utils.isArray(model)) {
                    p = model[1];
                    model = model[0];
                }

                ui.viewmodel(v.view || model, [model, p], $content).done(function (m) {
                    if (v.id || v.viewId) app.storeView((parent ? parent.id + "/" : '') + (v.id || v.viewId));
                    that._onActivated();
                });
            } else if (v.view) {
                if (v.id || v.viewId) app.storeView((parent ? parent.id + "/" : '') + (v.id || v.viewId));

                require(['text!' + v.view], function (html) {
                    $content.html(html);
                    that._onActivated();
                });
            }
        };

        that.showSubviewList = function (list, cb) {
            that._subviewmenu.items(list || []);
            that._subviewcb = cb; //TODO remove when legacy views rewritten
            if (list)
                $("#kloudspeaker-mainsubview-menu").show();
            else $("#kloudspeaker-mainsubview-menu").hide();
        }

        that.setActiveSubview = function (sv) {
            if (!sv) {
                $("#kloudspeaker-mainsubview-dropdown > a > span").empty();
                return;
            }
            //TODO template
            var aih = that._getViewTitle(sv);
            if (sv.icon) aih = "<i class='fa fa-" + sv.icon + "'></i>&nbsp;" + aih;
            var $ai = $("#kloudspeaker-mainsubview-dropdown > a > span").html(aih);
        }

        that.onNotification = function (spec) {
            var $trg = (spec && spec.target) ? ((typeof spec.target === 'string') ? $("#" + spec.target) : spec.target) : $("#kloudspeaker-mainview-content");
            var $ntf = dom.template("kloudspeaker-tmpl-main-notification", spec).hide().appendTo($trg);
            $ntf.fadeIn(300, function () {
                setTimeout(function () {
                    $ntf.fadeOut(300, function () {
                        $ntf.remove();
                        if (spec["on-finish"]) spec["on-finish"]();
                    });
                    if (spec["on-show"]) spec["on-show"]();
                }, spec.time | 3000);
            });
            return true;
        };

        that.getActiveView = function () {
            return that._currentView;
        };

        that.addNavBar = function (nb) {
            var $nb = dom.template("kloudspeaker-tmpl-main-navbar", nb).appendTo($("#kloudspeaker-mainview-navlist-content"));
            var items = nb.items;
            var initItems = function () {
                var $items = $nb.find(".kloudspeaker-mainview-navbar-item");
                if (nb.classes) $items.addClass(nb.classes);
                if (nb.dropdown) {
                    $items.each(function (i, e) {
                        $('<li class="kloudspeaker-mainview-navbar-dropdown"><a href="#" class="dropdown-toggle"><i class="fa fa-cog"></i></a></li>').appendTo($(e));
                    });
                    $items.on('click', '.kloudspeaker-mainview-navbar-dropdown > a', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var $item = $(this).closest('.kloudspeaker-mainview-navbar-item');
                        var item = items[$items.index($item)];
                        var dropdownItems = nb.dropdown.items;
                        if (typeof (nb.dropdown.items) == 'function') dropdownItems = nb.dropdown.items(item.obj);
                        var $h = $(this).parent().addClass("open");

                        var popup = ui.controls.popupmenu({
                            element: $h,
                            items: dropdownItems,
                            onHide: function () {
                                $h.removeClass("open");
                            }
                        })
                    });
                }
                $items.click(function () {
                    var item = items[$items.index(this)];
                    if (item.callback) item.callback();
                });
                if (nb.onRender) nb.onRender($nb, $items, function ($e) {
                    var ind = $items.index($e);
                    return items[ind].obj;
                });
            };
            initItems();
            return {
                element: $nb,
                setActive: function (o) {
                    var $items = $nb.find(".kloudspeaker-mainview-navbar-item");
                    $items.removeClass("active");
                    if (!o) return;
                    $.each($items, function (i, itm) {
                        var obj = items[i].obj;
                        if (!obj) return;

                        var match = utils.isDefined(o.id) ? o.id == obj.id : o == obj;
                        if (match) {
                            $(itm).addClass("active");
                            return false;
                        }
                    });
                },
                update: function (l) {
                    items = l;
                    $nb.find(".kloudspeaker-mainview-navbar-item").remove();
                    dom.template("kloudspeaker-tmpl-main-navbar-item", items).appendTo($nb);
                    initItems();
                }
            };
        }

        that.onResize = function () {
            if (that._currentView && that._currentView.onResize) that._currentView.onResize();

            var w = $(window).width();
            var h = $(window).height();
            var top = $("#kloudspeaker-mainview-navlist-parent").position().top;
            var maxH = (h - top - 60); //60?

            // simulate responsive classes
            var cls = "kloudspeaker-size-xl";
            if (w < 980) cls = "kloudspeaker-size-m";
            if (w < 768) {
                cls = "kloudspeaker-size-s";
                maxH = 0;
            }

            $("body").removeClass("kloudspeaker-size-xl kloudspeaker-size-m kloudspeaker-size-m").addClass(cls);

            if (maxH > 0)
                $("#kloudspeaker-mainview-navlist-content").css("max-height", maxH + "px");
            else $("#kloudspeaker-mainview-navlist-content").css("max-height", false);
        }

        that.getSessionActions = function () {
            var actions = [];
            var s = session.get();
            if (features.hasFeature('change_password') && s.user.auth == 'pw' && permissions.hasPermission("change_password")) {
                actions.push({
                    "title-key": "mainViewChangePasswordTitle",
                    callback: that.changePassword
                });
                actions.push({
                    "title": "-"
                });
            }
            actions.push({
                "title-key": "mainViewLogoutTitle",
                callback: session.end
            });
            return actions;
        }

        that.changePassword = function () {
            var $dlg = false;
            var $old = false;
            var $new1 = false;
            var $new2 = false;
            var $hint = false;
            var errorTextMissing = loc.get('mainviewChangePasswordErrorValueMissing');
            var errorConfirm = loc.get('mainviewChangePasswordErrorConfirm');

            var doChangePassword = function (oldPw, newPw, hint, successCb) {
                service.put("configuration/users/current/password/", {
                    old: utils.Base64.encode(oldPw),
                    "new": utils.Base64.encode(newPw),
                    hint: hint
                }).done(function (r) {
                    successCb();
                    dialogs.notification({
                        message: loc.get('mainviewChangePasswordSuccess')
                    });
                }).fail(function (e) {
                    that.handled = true;
                    if (e.code == 107) {
                        dialogs.notification({
                            message: loc.get('mainviewChangePasswordError'),
                            type: 'error',
                            cls: 'full',
                            target: $dlg.find(".modal-footer")
                        });
                    } else that.handled = false;
                });
            }

            dialogs.custom({
                title: loc.get('mainviewChangePasswordTitle'),
                content: $("#kloudspeaker-tmpl-main-changepassword").tmpl({
                    message: loc.get('mainviewChangePasswordMessage')
                }),
                buttons: [{
                    id: "yes",
                    "title": loc.get('mainviewChangePasswordAction'),
                    cls: "btn-primary"
                }, {
                    id: "no",
                    "title": loc.get('dialogCancel')
                }],
                "on-button": function (btn, d) {
                    var old = false;
                    var new1 = false;
                    var new2 = false;
                    var hint = false;

                    if (btn.id === 'yes') {
                        $dlg.find(".control-group").removeClass("error");
                        $dlg.find(".help-inline").text("");

                        // check
                        old = $old.find("input").val();
                        new1 = $new1.find("input").val();
                        new2 = $new2.find("input").val();
                        hint = $hint.find("input").val();

                        if (!old) {
                            $old.addClass("error");
                            $old.find(".help-inline").text(errorTextMissing);
                        }
                        if (!new1) {
                            $new1.addClass("error");
                            $new1.find(".help-inline").text(errorTextMissing);
                        }
                        if (!new2) {
                            $new2.addClass("error");
                            $new2.find(".help-inline").text(errorTextMissing);
                        }
                        if (new1 && new2 && new1 != new2) {
                            $new1.addClass("error");
                            $new2.addClass("error");
                            $new1.find(".help-inline").text(errorConfirm);
                            $new2.find(".help-inline").text(errorConfirm);
                        }
                        if (!old || !new1 || !new2 || new1 != new2) return;
                    }

                    if (btn.id === 'yes') doChangePassword(old, new1, hint || '', d.close);
                    else d.close();
                },
                "on-show": function (h, $d) {
                    $dlg = $d;
                    $old = $("#kloudspeaker-mainview-changepassword-old");
                    $new1 = $("#kloudspeaker-mainview-changepassword-new1");
                    $new2 = $("#kloudspeaker-mainview-changepassword-new2");
                    $hint = $("#kloudspeaker-mainview-changepassword-hint");

                    $old.find("input").focus();
                }
            });
        }
        return that;
    };
});
