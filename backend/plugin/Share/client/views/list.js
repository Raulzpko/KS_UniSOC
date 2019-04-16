define(['kloudspeaker/instance', 'kloudspeaker/share', 'kloudspeaker/share/repository', 'kloudspeaker/ui/texts', 'kloudspeaker/utils', 'knockout'], function(app, share, repository, texts, utils, ko) {
    return function() {
        var that = this;
        var model = {
            item: null,

            canAdd: ko.observable(false),
            items: ko.observableArray(null)
        };

        var refresh = function() {
            repository.getItemShares(model.item, true).done(function(r) {
                model.canAdd(r.canAdd);
                r.shares.forEach(function(s) {
                    s._expanded = ko.observable(false);
                });
                model.items(r.shares);
            });
        };

        return {
            model: model,
            onShow: function(container) {
                that._container = container;

                if (container.setTitle) {
                    var title = "";
                    if (model.item.shareTitle)
                        title = model.item.shareTitle;
                    else {
                        if (model.item.customType) {
                            // TODO register type handlers from plugins
                            if (model.item.customType == 'ic') title = texts.get("pluginItemCollectionShareTitle");
                        } else {
                            title = texts.get(model.item.is_file ? 'shareDialogShareFileTitle' : 'shareDialogShareFolderTitle') + " " + model.item.name;
                        }
                    }

                    container.setTitle(title);
                }
            },
            activate: function(params) {
                model.item = params.item;
                refresh();
            },
            getShareLink: function(s) {
                return app.getPageUrl("share/" + s.id);
            },

            onAddShare: function() {
                that._container.close();
                share.addShare(model.item);
            },
            onQuickShare: function() {
                that._container.close();
                share.quickShare(model.item);
            },
            onEditShare: function(s) {
                that._container.close();
                share.editShare(s);
            },
            onRemoveShare: function(s) {
                share.removeShare(model.item, s).done(refresh);
            },
            onCopyShareUrl: function() {}
        };
    };
});