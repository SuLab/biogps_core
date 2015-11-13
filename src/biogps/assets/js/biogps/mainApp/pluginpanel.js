// pluginpanel.js
// Created: Dec 11, 2008

// Provides the rendering for the BioGPS Plugin Library.
//
// The library is first loaded by 'biogps.renderPluginBrowsePanel()' from
// biogps_base.js which takes the following actions:
//   - If not present, creates the "Plugin Library" tab with the 'fit' layout.
//   - Sets the tab as the active item.
//   - If this is the first time loading, or a refresh is forced:
//      - Loads '/plugin_v1/browse' via AJAX into the panel.
//         The method is provided by 'pluginbrowser()' in plugin.py
//         The HTML template used is templates/pluginlibrary.html
//      - Calls "initLibrary();" to load the main view.
//
// The library is rendered as a large container panel "pluginlibrary_card" with
// the following contents:
//   - tbar: Breadcrumb navigation, always visible.
//   - library-header: Logo image and intro blurb.
//   - library-search: Search box with Advanced options.
//   - library-add: Form to create a new plugin.
//   - library-home: Front page shown on initial load.
//   - library-browse: Search results / category browsing page.
//   - library-plugin: Single plugin large display with preview iframe.
//   - library-edit: Form to edit an existing plugin.
//   - bbar: PagingToolbar shown only with the browse page.
//
// We track the usage of this interface by making calls to Google Analytics'
// trackPageview function.  The pages follow the below URL structure:
//      /pluginlibrary/
//      /pluginlibrary/browse/
//      /pluginlibrary/search/?query=[term]
//      /pluginlibrary/plugin/[id]
//      /pluginlibrary/edit/[id]
//      /pluginlibrary/edit/preview/
//      /pluginlibrary/edit/save/
//      /pluginlibrary/edit/cancel/
//      /pluginlibrary/edit/delete/
//      /pluginlibrary/add/


// biogps.renderPluginBrowsePanel
// Loads up the Plugin Library as defined in pluginpanel.js.  The handling in
// this function deals mostly with setting up the Ext tab container to hold the
// library.  Loading / rendering of the actual library is kicked off by the
// call to 'initLibrary()' at the bottom.
//    Param forcerefresh: (optional)
//    Param historyParams: (optional) passed from biogps.dispatcher_by_hash()
//      further up in this file.  Since renderPluginBrowsePanel is only called
//      once, this is not part of the the back button history functionality.
//      Instead, we're using the same parameters here to handle deep linking.
biogps.renderPluginBrowsePanel = function(forcerefresh, historyParams){
    //var tab_container = Ext.getCmp('center_panel');
    var container_id = 'pluginbrowse_panel';
    var container = biogps.centerTab.getItem(container_id);
    var is_new_container = false;
    if (!container) {
        container = biogps.centerTab.add({ title:'Plugin Library',
                                       id:container_id,
                                       closable: true,
                                       layout: 'fit',
                                       autoScroll:true});
        var fn = function(){if (Ext.get('pluginbrowse_panel')) biogps.renderPluginBrowsePanel(forcerefresh=true);};
        biogps.usrMgr.linkWithAuthentication(fn);
        container.on('destroy', function(){
            biogps.usrMgr.unlinkWithAuthentication(fn);
            biogps.currentPluginRenderer = null;
            delete biogps.currentPluginRenderer;
        });
        is_new_container = true;
    }


    biogps.centerTab.suspendEvents();    //avoid to fire "tabchange" event again.
    biogps.centerTab.setActiveTab(container);
    biogps.centerTab.resumeEvents();

    if (is_new_container || forcerefresh) {
        // Mask the whole tab to cover up the "flashing effect" in ticket #390
        var libMask = new Ext.LoadMask(biogps.centerTab.body, {
                            msg:"Loading Plugin Library...",
                            removeMask:true
                        });
        libMask.show();

        // Load the HTML content & initialize the library
        container.load({url:'/plugin_v1/browse',
                        scripts:true,
                        nocache: true,
                        callback: function(el, success, response, options) {
                            if (success) {
                                if (initLibrary) {
                                    initLibrary(historyParams); }
                            }
                            else {
                                biogps.ajaxfailure(null, response);
                            }
                        }
                        });
    }
    else {
        // We get here by already having the library loaded, then clicked on
        // the link in the dark-blue top bar.  It should take us back to the
        // library home page.
        biogps.currentLibrary.setActiveItem('library-home','breadcrumb');
    }
};

///////////////////////////////////////////////////////////////////////////////
// PLUGIN LIBRARY OBJECT
///////////////////////////////////////////////////////////////////////////////

// The PluginLibrary object is the primary holder of functions relevant to the
// display of the various library pages.
biogps.PluginLibrary = function(config) {
    this.id = '';
    this.currentItem = 'library-home'; // Used for creating the history hash.
    this.mask = new Ext.LoadMask('pluginbrowse_panel', {msg:"Loading plugin data..."});
    this.mask.show();
    Ext.apply(this, config);
    biogps.currentLibrary = this;

    // Call the constructor for Ext.Panel.
    biogps.PluginLibrary.superclass.constructor.call(this);
};

Ext.extend(biogps.PluginLibrary, Ext.Panel, {
    /////////////////////////////////////////////
    // Navigation Functions
    /////////////////////////////////////////////

    // setActiveItem
    // Toggles the visibility of different panels and navigation buttons
    // appropriately to simulate changing between pages.
    //   Param item: string of the name of the page we want to show.
    //      ex: library-add, library-browse, library-plugin, library-home
    //   Param from: string of the source of the function call.
    //      ex: breadcrumb, library-home, library-browse, library-search, delete
    setActiveItem: function(item, from) {
        // Look up all of the panels to save on the overhead below.
        var panel_add = Ext.getCmp('library-add');
        var panel_browse = Ext.getCmp('library-browse');
        var panel_plugin = Ext.getCmp('library-plugin');
        var panel_header = Ext.getCmp('library-header');
        var panel_search = Ext.getCmp('library-search');
        var panel_home = Ext.getCmp('library-home');
        var panel_edit = Ext.getCmp('library-edit');

        var btn_home = Ext.getCmp('btn-library-home');
        var btn_browse = Ext.getCmp('btn-library-browse');
        var btn_plugin = Ext.getCmp('btn-library-plugin');
        var btn_edit = Ext.getCmp('btn-library-edit');
        var btn_add = Ext.getCmp('btn-library-add');

        // Hide all of the main panels
        panel_home.hide();
        panel_browse.hide();
        panel_plugin.hide();
        panel_edit.hide();
        panel_add.hide();

        // Unbold all of the breadcrumbs.
        btn_home.removeClass('activeBreadcrumb');
        btn_browse.removeClass('activeBreadcrumb');
        btn_plugin.removeClass('activeBreadcrumb');
        btn_edit.removeClass('activeBreadcrumb');
        btn_add.removeClass('activeBreadcrumb');

        // If we're going 'home'...
        //   Show the header panel.
        //   Hide the buttons for plugin and edit if we just did a delete.
        if (item == 'library-home') {
            panel_header.show();
            if(from == 'delete') {
                btn_plugin.hide();
                btn_edit.hide();
            }
        }
        else {
            panel_header.hide();
        }

        // If we're going to 'browse'...
        //   Show the nav toolbar & button.
        //   Hide the 'plugin' breadcrumb. (Requested by asu on 2/5/09)
        if (item == 'library-browse') {
            Ext.getCmp('library-browse-nav').show();
            btn_browse.show();
            if(from != "breadcrumb") {
                btn_plugin.hide();
                btn_edit.hide();
            }
        }
        else {
            Ext.getCmp('library-browse-nav').hide();
        }

        // If we're going to 'plugin'...
        //   Show the button.
        //   Hide the 'browse' breadcrumb if we're coming from 'home'.
        //   Hide the 'edit' breadcrumb unless we're coming from breadcrumb.
        if (item == 'library-plugin') {
            btn_plugin.show();
            if(from == 'library-home') {
                btn_browse.hide();
            }
            if(from != 'breadcrumb') {
                btn_edit.hide();
            }
        }

        // If we're going to 'edit'...
        //   Show the button.
        if (item == 'library-edit') {
            btn_edit.show();
        }

        // If we're going to 'add' or 'edit'...
        //   Hide the search panel.
        if (item == 'library-add' || item == 'library-edit') {
            Ext.getCmp('library-search').hide();
        }
        else {
            Ext.getCmp('library-search').show();
        }

        // If the user is not logged in...
        if (item == 'library-add' && biogps.usrMgr.is_anonymoususer) {
            // Mask the add plugin form.
            // While it conceptually makes sense to only do this once, we need
            // to do it after the panel is rendered for IE6 to work.
           panel_add.on('show', function(){
               biogps.usrMgr.maskForAnonymous({targetEl: panel_add.body,
                                               msg: "You must be logged in to add a plugin.",
                                               msg2: "Or you can go <a href='javascript:navHandler(\"home\");'>back to the Library</a>."});
           },this);
        }

        // Show the panel we want.
//        Ext.getCmp(item).show();
        //Above line does not display the cmp correctly in Google Chrome
        //Explicit call of setVisible fixes it.
        var cmp_item = Ext.getCmp(item);
        cmp_item.show();
        cmp_item.el.setVisible(true);

        // Bold the active breadcrumb button.
        var btnName = 'btn-' + item;
        Ext.getCmp(btnName).addClass('activeBreadcrumb');

        this.currentItem = item;
        this.hash_history();

        // Fix the height of the panel in case we've changed the visible state
        // of the bottom toolbar.
        this.setSize();
        this.ownerCt.doLayout(true);

        this.libDone();

        // Show that we have successfully finished.
        return true;
    },

    // Sets the library display to show a loading indicator only.
    // Gets overridden by later calls to setActiveItem.
    libLoading: function() { this.mask.show(); },

    libDone: function() { this.mask.hide(); },

    // hash_history
    // Creates a token representing the current state of the plugin library
    // and saves it to Ext's History to enable back-button navigation.
    hash_history: function() {
        // Craft a token string to pass into Ext.History. It should only
        // contain enough info to describe the currently open tab, not the
        // state of the entire library.
        var token = 'goto=pluginlibrary&t=' + this.currentItem;
        if ((this.currentItem == 'library-plugin' ||
             this.currentItem == 'library-edit') && this.plugin) {
            token = token + '&p=' + this.plugin.id;
        }
        else if (this.currentItem == 'library-browse') {
            // Below we create a params object to be passed through Ext.urlEncode().
            // While this is effectively the same as passing
            // biogps.pluginStore.lastOptions.params into urlEncode, we need to
            // ensure the parameter ordering is always the same, to keep the
            // history hash working correctly.  The ordering used here must be
            // kept the same as the ordering in dispatcher_by_params() below.
            var params = {
                sort: biogps.pluginStore.lastOptions.params.mysort,
                start: biogps.pluginStore.lastOptions.params.start,
                limit: biogps.pluginStore.lastOptions.params.limit,
                scope: biogps.pluginStore.lastOptions.params.scope,
                dir: biogps.pluginStore.lastOptions.params.dir
            };
            if (biogps.pluginStore.lastOptions.params.search) {
                params.search = biogps.pluginStore.lastOptions.params.search; }
            else if (biogps.pluginStore.lastOptions.params.tags) {
                params.tags = biogps.pluginStore.lastOptions.params.tags; }

            token = token + '&' + Ext.urlEncode(params);
        }

        // Avoid firing the "tabchange" or Ext.History "change" events.
        Ext.History.suspendEvents();
        biogps.centerTab.suspendEvents();

        // Add the token to the history.  The second param signals the History
        // to ensure it is not duplicating the history token.
        Ext.History.add(token, true);
        biogps.setTitle('pluginlibrary');   //This might be a temp solution to put setTitle here.
                                            //Later we should make title reflect the actual content in the plugin panel.

        // We need to delay the resuming of Ext.History's events for longer
        // than 50 msec, because Ext.History.startUp() creates an unnamed
        // method that is called on a setInterval that compares the current
        // hash with the one known in memory.  If they are different, which
        // they are, briefly, after we add the new token, then it calls
        // Ext.History.handleChangeState(hash), which fires the 'change' event.
        //
        // Our behavior here is a workaround that prevents the 'change' event
        // from propagating up the system, but only long enough for that check
        // to occur, resetting the hash known in memory.  Our expectation is
        // that the call to hash_history() happens after we have already made
        // the changes to the currentLibrary that we want to have reflected in
        // the hash, rather than using the hash change to drive the
        // currentLibrary change.
        setTimeout("Ext.History.resumeEvents()", 60);
        biogps.centerTab.resumeEvents();
    },

    // dispatcher_by_params
    // Handles the back-button navigation to restore the plugin library to
    // a previous state.
    //   Param params: Object passed by Ext.urlDecode(hash) from biogps_base.js
    //     Found in function biogps.dispatcher_by_hash().
    dispatcher_by_params: function(params) {
        // Route V1 deep links to V2 URLs
        // Process the 't' param for the high-level tab to show.

        if (params['t']) {
            // Plugin Library home
            if (params['t'] == 'library-home') {
                location.replace('/plugin/')
            }

            if (params['t'] == 'library-plugin' || params['t'] == 'library-edit') {
                // Individual plugin page
                if (params['p']) {
                    location.replace('/plugin/' + params['p'] + '/')
                }
            }
            else if (params['t'] == 'library-add') {
                // New plugin page
                location.replace('/plugin/new/')
            }
            else if (params['search']) {
                // Search term entered
                location.replace('/search/plugin/?q=' + params['search'])
            }
            else if (params['tags']) {
                // Searching based on tags
                location.replace('/plugin/tag/' + params['tags'] + '/')
            }
        }
        else {
            // No matches, re-direct to plugin library home
            location.replace('/plugin/')
        }
    },

    // setBrowseTitle
    // Changes the text of the breadcrumb button for the "browse" page.
    //   Param newTitle: string of the new title for the button.
    setBrowseTitle: function(newTitle) {
        var title = newTitle + " &nbsp; &raquo;";
        Ext.getCmp('btn-library-browse').setText(title);
        Ext.getCmp('library-browse').setTitle(newTitle);
    },

    // setPluginTitle
    // Changes the text of the breadcrumb button for the "plugin" page.
    //   Param newTitle: string of the new title for the button.
    setPluginTitle: function(newTitle) {
        var title = newTitle;
        Ext.getCmp('btn-library-plugin').setText(title);
    },

    // setPluginEditTitle
    // Changes the text of the breadcrumb button for the "plugin" page.
    //   Param newTitle: string of the new title for the button.
    setPluginEditTitle: function(newTitle) {
        var title = "&raquo; &nbsp; Edit " + newTitle;
        Ext.getCmp('btn-library-edit').setText(title);
    },





    /////////////////////////////////////////////
    // Plugin Loading and Rendering
    /////////////////////////////////////////////

    // queryPlugins
    // Loads a list of plugins that match the query params.
    queryPlugins: function(evt) {
        if (evt)
            evt.cancelBubble=true;

        // Retrieve the form values as an object.
        var form = Ext.getCmp('library-search').getForm().getValues();
        var query = form.query.trim();
        var scope = null;

        // Only move forward if a query was given.
        if (query && query != 'Search the Plugin Library') {
            // Figure out the scope of the search.
            // Commented out on 7/16/09.  Uncomment when we re-enable Advanced Search.
        /*    if (form.scope_my && form.scope_shared)
                scope = 'all';
            else if (form.scope_my)
                scope = 'my';
            else
                scope = 'shared';
        */

            // Hard code the scope until we re-enable the Advanced Search panel
            scope = 'all';

            // Set up the params object.
            var conf = { params: {
                search: query,
                scope: scope
            }};

            // Call the AJAX loading of the information & toggle the view.
            biogps.pluginStore.load(conf);
            this.setActiveItem('library-browse','library-home');
            _gaq.push(['_trackPageview', '/pluginlibrary/search/?query=' + query]);
        }

        return false;
    },

    // browsePluginsBy
    // Loads the browse page and a list of plugins sorted by the parameter.
    // This function is called from multiple links on the home page.
    //   Param sort_by: string of which parameter to sort by.
    //   Param from: string of the source of the function call.
    browsePluginsBy: function(sort_by, from) {
        if (sort_by) {
            // Set up the params object.
            var conf = { params: { mysort: sort_by }};

            // Call the AJAX loading of the information & toggle the view.
            biogps.pluginStore.load(conf);
            this.setActiveItem('library-browse',from);
            _gaq.push(['_trackPageview', '/pluginlibrary/browse/']);
        }
    },

    // browsePluginsByTag
    // Loads the browse page and a list of plugins tagged with the given string.
    // This function is called from multiple links on the home page.
    //   Param tag: string of which tag to filter by.
    //   Param from: string of the source of the function call.
    browsePluginsByTag: function(tag, from) {
        if (tag) {
            // Set up the params object.
            var conf = { params: { tags: tag }};

            // Call the AJAX loading of the information & toggle the view.
            biogps.pluginStore.load(conf);
            this.setActiveItem('library-browse',from);
            _gaq.push(['_trackPageview', '/pluginlibrary/search/?tag=' + query]);
        }
    },

    // sortPluginList
    // Assuming an already loaded list of plugins on the browse page, this
    // reuses the last conf sent to the pluginStore, but redoes the ordering.
    //   Param sort_by: string of which parameter to sort by.
    //   Param dir: direction of sorting (ASC or DESC).
    sortPluginList: function(sortby, dir) {
        if (sortby && dir) {
            var conf = biogps.pluginStore.lastOptions;
            conf.params.mysort = sortby;
            conf.params.dir = dir;
            biogps.pluginStore.load(conf);
        }
    },

    /**
    * renderPluginById
    * @method
    * @param {integer} plugin_id The integer ID of the plugin.
    * @param {string} from the source of the function call.
    * Loads a single, specific plugin by its ID (via JSON) and renders it into
    * the library-plugin panel.  Then it changes the breadcrumb link name and
    * toggles the view.
    */
    renderPluginById: function(plugin_id, from) {
        var p, postGeneLoad, postPluginLoad, postLoad, gene_loaded, plugin_loaded;
        gene_loaded = plugin_loaded = false;

        if (plugin_id) {

            postGeneLoad = function() {
                gene_loaded = true;
                postLoad.call(this);
            };

            postPluginLoad = function(p) {
                plugin_loaded = true;
                biogps.loadSampleGene({
                    species: p.species,
                    callback: postGeneLoad,
                    scope: this
                });
            };

            // If the plugin failed to load, it usually means restricted access.
            postPluginLoadFail = function(p) {
                this.libDone();
                Ext.MessageBox.show({
                    title:'Plugin Not Found',
                    msg: 'Oops! This plugin may not exist or you may not have permission to use it.',
                    buttons: Ext.Msg.OK,
                    icon: Ext.MessageBox.ERROR
                });
            };

            // Post-load function
            //  Handle all processing and display
            postLoad = function() {
                if (gene_loaded && plugin_loaded) {
                    // Set this object to a retrievable place for use with layouts.
                    this.plugin = p;

                    // Get the large template with this plugin's values inside.
                    markup = this.markupPluginTemplate(p,'large');

                    // Update the plugin page with the markup.
                    Ext.getCmp('library-plugin').el.update(markup);

                    // If the user is logged in, add a few extras.
                    if (!biogps.usrMgr.is_anonymoususer) {
                        // Create the 'Add to Layout' button.
                        var btn = new Ext.Button({
                            text:'&nbsp; Add to my Layout &nbsp;',
                            handler: this.showAddToLayoutMenu,
                            applyTo: 'plugin-add-to-layout',
                            scale: 'medium',
                            cls: 'add-to-layout-btn',
                            //iconCls: 'icon-add',
                            scope: this
                        });

                        // Create the 'Flag Inappropriate' button.
                        var flag_el = Ext.get('flag-button');
                        flag_el.on('click', function() {
                            p.showFlagAsInappropriateForm(this.el);
                        }, this);
                        flag_el.show();

                        // If the user is the owner of the plugin, add more extras.
                        // Right now we're using the 'is_shared' property, which really
                        // means 'is_not_mine'. This same name is used for layouts, so
                        // for now we're using it for consistency.
                        if (!p.is_shared) {
                            var edit_btn = new Ext.Button({
                                text: 'Edit this plugin',
                                handler: this.showPluginEditForm.createDelegate(this, [p]),
                                applyTo: 'plugin-add-to-layout',
                                scope: this
                            });
                        }
                    }
                    else {
                        note = Ext.get('plugin-add-to-layout');
                        note.insertHtml("beforeEnd","Login to use this plugin in a layout.");
                        note.addClass('login-note');
                    }

                    // In case this plugin is of type 'div' instead of 'iframe',
                    // we need to load the content via an AJAX call instead.
                    if (p.type == 'div') {
                        var _url = p.getPreviewUrl(),
                            scripts_enabled = false;
                        _url = _url+'&container=library-plugin-preview';

                        if (_url.startsWith('http://')) {
                            scripts_enabled = _url.startsWith('http://plugins.biogps.org/');
                            _url = '/utils/proxy?url='+_url.replace('&','%26');
                            if (this.plugin.options.securityAware)
                                _url += '&secure=1';
                        }
                        else {
                            scripts_enabled = true;
                        }

                        Ext.get('library-plugin-preview').load({url:_url, scripts:scripts_enabled});
                    }

                    // Rename the breadcrumb & toggle the view.
                    this.setPluginTitle(p.title);
                    this.setActiveItem('library-plugin',from);
                    _gaq.push(['_trackPageview', '/pluginlibrary/plugin/' + p.id]);
                }
            };


            // LOADING SEQUENCE
            // Change display & indicate loading
            this.libLoading();

            // Instantiate a new Plugin object with the given ID.
            p = new biogps.Plugin({id: plugin_id});
            p.on('load', postPluginLoad, this);
            p.on('loadfailed', postPluginLoadFail, this);
            p.load();
        }
    },

    // markupPluginTemplate
    // Applies the properties of a Plugin object to the given template.
    //   Param plugin: the biogps.Plugin object already loaded via JSON.
    //   Param template: string name of the template to use.
    //      Ex: small, medium, large
    //   Returns: string with plugin values substituted into template
    markupPluginTemplate: function(plugin, template) {
        if (plugin && template) {
            // Comma-delimit the species list.
            var species = plugin.getAllowedSpecies().join(', ');

            // Make the list of tags into links.
            var tag_links = '';
            if(plugin.tags){
                var links = new Array();
                plugin.tags.split(' ').each(function(tag) {
                    links.push('<a href="javascript:biogps.currentLibrary.browsePluginsByTag(\'' + tag + '\',\'library-plugin\')" title="click to view plugins with this tag">' + tag + '</a>');
                });
                tag_links = links.join(' | ');
            }
            else {
                tag_links = 'none';
            }

            var templateVars = {
                url: this.markHighlight(plugin.url),
                previewUrl: plugin.getPreviewUrl(),
                id: plugin.id,
                title: this.markHighlight(plugin.title),
                description: this.markHighlight(plugin.description),
                author: this.markHighlight(plugin.author),
                author_url: plugin.author_url,
                rolepermission: this.plugin.formatPermission(),
                lastmodified: plugin.lastmodified,
                created: plugin.created,
                tags: tag_links,
                allowedspecies: species,
                usage: plugin.usage_percent,
                layout_count: plugin.usage_layout_count,
                users: plugin.usage_users,
                related_plugins: plugin.related_plugins,
                mobile_url: false,
                certified_owner: false
            };
            if (plugin.options) {
                if (plugin.options.mobile_url) { templateVars.mobile_url = plugin.options.mobile_url; }
                if (plugin.options.certified_owner) { templateVars.certified_owner = plugin.options.certified_owner; }
            }

            // Apply the markup variables below to the template.
            var markup = biogps.pluginTpls[template].apply(templateVars);
            return markup;
        }
    },

    markHighlight: function(s) {
        var color_list = ['red', 'blue', 'green', 'aqua', 'purple', 'fuchsia', 'black', 'gray', 'lime', 'maroon', 'navy', 'olive', 'silver', 'teal'];
        if (this.highlight) {
            var color;
            for (var i=0;i<this.highlight.length;i++) {
                color = color_list[i % color_list.length];
                s = s.replace(new RegExp('('+this.highlight[i].trim()+')', 'gi'), '<span class="highlight" style="color:'+color+';">$1</span>');
            }
        }
        return s;
    },

    // showPluginEditForm
    // Passed a biogps.Plugin object, it instantiates a biogps.PluginEditPanel
    // and renders it into the library-edit panel.
    //   Param plugin: the biogps.Plugin object already loaded via JSON.
    showPluginEditForm: function(plugin) {
        if (!plugin)
            return false;

        // Instantiate the editing form.
        var edit_form = new biogps.PluginEditPanel({
            id: 'pluginmodify_' + plugin.id.toString(),
            modifyonly: true
        });

        // Remove any existing items from the edit panel.
        var panel = Ext.getCmp('library-edit');
        panel.items.each(function(item){panel.remove(item)});

        // Render the form and populate the fields.
        panel.add(edit_form);
        //edit_form.fillPluginForm(plugin);
        edit_form.on('afterlayout',
            edit_form.fillPluginForm.createDelegate(edit_form, [plugin])
        );
        panel.doLayout();

        // Rename the breadcrumb & toggle the view.
        this.setPluginEditTitle(plugin.title);
        this.setActiveItem('library-edit','library-plugin');
        _gaq.push(['_trackPageview', '/pluginlibrary/edit/' + plugin.id]);
    },





    /////////////////////////////////////////////
    // Adding Plugins to Layouts
    /////////////////////////////////////////////

    // showAddToLayoutMenu
    // Fired by the 'Add to my layout' button on the large plugin view.
    // Loads and displays a menu of available layouts.
    showAddToLayoutMenu: function(btn, evt){
        evt.stopEvent();
        this.layoutmenu = null;
        if(!this.layoutmenu){ // create context menu on first right click
            this.layoutmenu = new Ext.menu.Menu({
                items: [{
                    text:'New layout',
                    //checked: true,
                    layout: null,
                    plugindata: this.plugin,
                    group: 'selectedlayout',
                    handler: this.onAddToNewLayout,
                    scope: this
                },
                '-']
            });

            // Iterate through this user's layouts and create a menu item for each.
            for (var i=0;i<biogps.LayoutMgr.availableLayouts.length;i++){
                var layout = biogps.LayoutMgr.availableLayouts[i];
                if (layout.isMyLayout())
                    this.layoutmenu.add({
                        text: layout.layout_name,
                        layout: layout,
                        group: 'selectedlayout',
                        handler: this.onAddToLayout,
                        scope: this
                    });
            }
        }

        // Render the menu's top left corner where the user clicked.
        this.layoutmenu.showAt(evt.getXY());
    },

    onAddToLayout: function(item, e){
        e.stopEvent();
        if(this.plugin){
            if (item.layout && this.el){
                item.layout.on('pluginadded', function(){
                    this.el.mask(String.format('This plugin was added to layout "{0}".', item.layout.layout_name));
                    biogps.GeneReportMgr.refreshLayout(item.layout);
//                    if (item.layout.isDefault())
//                        this.LayoutMgr.loadLayout(item.layout.layout_id);
                    var _el = this.el;
                    setTimeout(function(){
                        _el.unmask();
                        }, 1000);
                    biogps.clearListeners(item.layout, 'pluginadded');
                },this);
                item.layout.on('pluginaddfailed', function(data){

                }, this);
                this.el.mask(String.format('Adding this plugin to layout "{0}"...', item.layout.layout_name));
                item.layout.addPlugin(this.plugin);
            }
        }
        return true;
    },

    onAddToNewLayout: function(item, e){
        e.stopEvent();
        if (this.plugin && this.el){
            if (!this.newlayoutwin){
                this.newlayoutwin = new Ext.Window({
                    title:'Create a new layout',
                    layout: 'fit',
                    width: 380,
                    labelWidth: 200,
                    //modal: true,
                    constrain: true,
                    constrainHeader: true,
                    renderTo: this.el,
                    autoHeight: true,
                    stateful: false,
                    plain: true,
                    ownerCmp: this,
                    listeners: {show:   {buffer : 0,
                        fn: function(win){
                            win.center();
                            setTimeout(function(){
                                win.items.get(0).items.get(0).focus();
                            },10);
                            //bind Enter hotkey
                            var kmap = new Ext.KeyMap(win.getEl(),[{
                                key: 13,   //Enter key
                                stopEvent: true,
                                fn: function(){this.ownerCmp.saveNewLayout()},
                                scope: win//this.ownerCmp
                            }]);
                        }}
                    },
                    items: new Ext.FormPanel({
                        id:'newlayoutform',
                        labelWidth: 120,
                        autoHeight: true,
                        bodyStyle:'padding:5px 5px 5px 5px',
                        border : false,
                        items:[{
                            xtype:'textfield',
                            anchor: "90%",
                            fieldLabel: "Name your layout",
                            id:this.id+'_field_name',
                            name: 'layout_name',
                            allowBlank:false
                        },{
                            fieldLabel: "Description",
                            xtype: 'textarea',
                            anchor: "90%",
                            id:this.id+'_field_description',
                            name: 'description',
                            //emptyText: "Type any instructive description for users here.",
                            value: '',
                            allowBlank:true
                        }],
                        buttons: [{
                            text:'Save',
                            handler: this.saveNewLayout,
                            scope:this
                        },{
                            text: 'Cancel',
                            handler: function(){
                                this.newlayoutwin.destroy();
                            },
                            scope: this
                        }]
                    })
                });
            }
            this.newlayoutwin.on('destroy', function(){this.newlayoutwin=null;},this);
            this.newlayoutwin.show();
        }
        return true;
    },

    saveNewLayout: function(){
        if (this.plugin && this.newlayoutwin && this.newlayoutwin.rendered){
            var newlayoutform = this.newlayoutwin.items.get(0);
            if (!(newlayoutform.form.isValid())){
                Ext.MessageBox.show({
                    title:'Error',
                    msg: 'Missing or wrong input layout name! Correct and try again.',
                    buttons: Ext.Msg.OK,
                    icon: Ext.MessageBox.ERROR
                });
                newlayoutform.form.reset();
                newlayoutform.items.get(0).focus();
            }
            else {
                var layout = new biogps.Layout(newlayoutform.form.getValues());
                layout.layout_data = [{id: this.plugin.id}];
                layout.on('saved', function(){
                    this.newlayoutwin.destroy();
                    this.el.mask(String.format('This plugin was added to layout "{0}".', layout.layout_name));
                    biogps.LayoutMgr.loadAvailableLayout();
                    biogps.GeneReportMgr.markLayoutChanged();
                    var _el = this.el;
                    setTimeout(function(){
                        _el.unmask();
                    }, 1000);
                    biogps.clearListeners(layout, 'saved');
                },this);
                layout.on('savefailed', function(data){
                    this.el.unmask();
                    this.newlayoutwin.center();
                    biogps.formfailure({result: data},
                          /*errmsg =*/ 'Saving Layout failed! Try again.',
                          /*onclose= */ function(){
                                            if (this.newlayoutwin.rendered){
                                                this.newlayoutwin.items.get(0).form.reset();
                                                this.newlayoutwin.items.get(0).items.get(0).focus();
                                            }
                                        },
                          /*scope = */  this
                    );
                },this);
                this.el.mask(String.format('Saving new layout "{0}"...', layout.layout_name));
                layout.saveas();
            }
        }
    }
});





///////////////////////////////////////////////////////////////////////////////
// PLUGIN STORE / READER OBJECTS
///////////////////////////////////////////////////////////////////////////////

// pluginJsonStore is a direct copy of Ext.data.JsonStore, but uses our custom
// Reader instead of Ext's JsonReader.
biogps.pluginJsonStore = function(c){
    Ext.data.JsonStore.superclass.constructor.call(this, Ext.apply(c, {
        proxy: c.proxy || (!c.data ? new Ext.data.HttpProxy({url: c.url, method: c.method}) : undefined),
        reader: new biogps.pluginJsonReader(c, c.fields)
    }));
};
Ext.extend(biogps.pluginJsonStore, Ext.data.Store);

// pluginJsonReader is an extension of Ext.data.JsonReader that overwrites
// certain functions to work with the biogps.Plugin class instead of Ext.data.Record.
biogps.pluginJsonReader = function(meta, recordType){
    meta = meta || {};
    biogps.pluginJsonReader.superclass.constructor.call(this, meta, recordType || meta.fields);
};
Ext.extend(biogps.pluginJsonReader, Ext.data.JsonReader, {
    readRecords : function(o){

        this.jsonData = o;
        if(o.metaData){
            this.onMetaChange(o.metadata);
        }
        var s = this.meta, Record = this.recordType,
            f = Record.prototype.fields, fi = f.items, fl = f.length, v;

        var root = this.getRoot(o), c = root.length, totalRecords = c, success = true;
        if(s.totalProperty){
            v = parseInt(this.getTotal(o), 10);
            if(!isNaN(v)){
                totalRecords = v;
            }
        }
        if(s.successProperty){
            v = this.getSuccess(o);
            if(v === false || v === 'false'){
                success = false;
            }
        }
        var records = [];
        for(var i = 0; i < c; i++){
            var n = root[i];
            var values = {};
            var id = this.getId(n);
//          for(var j = 0; j < fl; j++){
//              f = fi[j];
//              var v = this.ef[j](n);
//              values[f.name] = f.convert((v !== undefined) ? v : f.defaultValue, n);
//          }
//          var record = new Record(values, id);
            var record = new biogps.Plugin(n['_source']);
            record.id = n['_id'];
            record.json = n;
            record.data = n['_source'];
            records[i] = record;
        }
        return {
            success : success,
            records : records,
            totalRecords : totalRecords
        };
    }
});





///////////////////////////////////////////////////////////////////////////////
//   PLUGIN ADDING & EDITING
///////////////////////////////////////////////////////////////////////////////


// PluginEditPanel is adapted from the old implementation.
// An instance of it is created during initLibrary() and is reused both for
// creating new plugins and editing existing ones.
biogps.PluginEditPanel = function(config) {
    this.pluginbox = null;      //refer to the parent pluginbox
    Ext.apply(this, config);
    biogps.PluginEditPanel.superclass.constructor.call(this, {
        id: this.id+'_form',
        title: this.modifyonly?'Edit your own plugin':'Create your own plugin',
        cls: 'centerMargins',
        labelWidth: 110,
        stateful:false,
        defaultType: 'textfield',
        width: '90%',
        autoHeight: true,
        border : false,
        trackResetOnLoad: this.modifyonly,   //ref: http://extjs.com/forum/showthread.php?t=39745&highlight=setValues+dirty
        items:[{
            xtype:'fieldset',
            cls: 'roundBoxBlue',
            autoHeight: true,
            defaults: {anchor: '90%'},
            defaultType: 'textfield',
            items:[{
                fieldLabel: "Title*",
                id:this.id+'_field_title',
                name: 'title',
                maxLength: 100,
                allowBlank:false
            },{
                fieldLabel: "URL template*",
                id:this.id+'_field_url',
                name: 'url',
                maxLength: 500,
                value:'',
                allowBlank:false,
                validator: this.validateURLTemplate,
                listeners: {render: this.addURLHelp,
                            blur:function(obj){this.toggleSpeciesBasedOnKeyword(obj.getValue()); return false;},
                            scope: this
                }
            },{
                xtype: 'box',
                autoEl: {
                    tag: 'div',
                    cls: 'details',
                    html: '<h5>Template Syntax Explained</h5> \
                    <p>You need to supply the URL to the website you want to add \
                    as a plugin, including one (or more) keywords. When you then \
                    use your plugin in a layout, the appropriate identifier for \
                    your gene of interest will be substituted in.</p><br /> \
                    <p>For example, to make a simple Google search plugin, you would \
                    type in the URL below, then click \
                    the "Add Keyword" button and select whichever identifier you want.<br /> \
                    <b>http://www.google.com/search?q=</b></p><br /> \
                    <p>Once you have picked an identifier, the URL template \
                    will then look like this:<br /> \
                    <b>http://www.google.com/search?q={{Symbol}}</b></p><br /> \
                    <p>When the plugin is then used in a layout to look at a gene, \
                    BioGPS will automatically insert the correct value. For \
                    example, if you used the UniGene ID keyword and the user \
                    is looking at CDK2, the actual URL that will load would be \
                    this:<br /> \
                    <b>http://www.google.com/search?q=Hs.19192</b></p><br /> \
                    <p>If you want to test your URL template before saving, just hit \
                    the "Preview" button at the bottom of this page. \
                    </p>'
                }
            }]
        },{
            xtype:'fieldset',
            cls: 'roundBox',
            autoHeight: true,
            defaults: {anchor: '90%'},
            defaultType: 'textfield',
            items:[{
                fieldLabel: "Description",
                xtype: 'textarea',
                id:this.id+'_field_description',
                name: 'description',
                autoHeight: false,
                height: 75,
                //emptyText: "Type any instructive description for users here.",
                value: '',
                grow: false,
                //growMin: 22,
                //growMax: 200,
                allowBlank:true
            },{
                fieldLabel: "Tags (categories)",
                id:this.id+'_field_tags',
                name: 'tags',
                allowBlank:true
            },{
                xtype: 'box',
                autoEl: {
                    tag: 'div',
                    cls: 'details',
                    html: 'Enter words to help categorize your plugin. Separate them with a single space.<br /> \
                    Example: "<b>exon structure gene</b>" will make your plugin \
                    show up in each of those three categories.'
                }
            },{
                xtype:'checkboxgroup',
                name:'allowedspeciesGroup',
                fieldLabel:'Species allowed:',
                labelSeparator:'',
                listeners: {change: function(obj){
                                this.hideSpeciesMsgTip();
                                },
                            scope: this},
                columns: biogps.AVAILABLE_SPECIES.walk(function(x){return 80;}),
                items: biogps.AVAILABLE_SPECIES.walk(function(x){
                                                        return {
                                                            name:'allowedspecies',
                                                            inputValue:x,
                                                            //boxLabel:x.substring(0,1).toUpperCase()+x.substring(1),
                                                            boxLabel:x.capitalize(),
                                                            checked:true
                                                        };
                                                     })
                /*columns: [80, 80, 80],
                items:[{
                    name:'allowedspecies',
                    inputValue:'human',
                    boxLabel:'Human',
                    checked:true
                },{
                    name:'allowedspecies',
                    inputValue:'mouse',
                    boxLabel:'Mouse',
                    checked:true
                },{
                    name:'allowedspecies',
                    inputValue:'rat',
                    boxLabel:'Rat',
                    checked:true
                }]*/
            },{
                xtype:'radiogroup',
                name:'rolepermission',
                fieldLabel:'Visible to:',
                allowBlank: false,
                labelSeparator:'',
                hidden: false,
                disabled: false,
                columns: biogps.usrMgr.is_gnf_user?[100, 120, 70, 125, 100]:[100, 100, 10, 10, 100],
                height: 30,
                listeners: {render: function(cmp){
                    if (! biogps.usrMgr.can_share && !biogps.usrMgr.is_anonymoususer)
                        biogps.whydisabled(cmp,'You need to provide us your full name and affiliation information before you can share your plugin with others. Click <b><a href="/auth/account/edit" target="_blank">here</a></b> to edit your account information.');
                    }
                },
                items:[{
                    inputValue:'biogpsusers',
                    name:'rolepermission',
                    boxLabel:'Everyone',
                    checked: biogps.usrMgr.can_share
                },{
                    inputValue:'friendusers',
                    name:'rolepermission',
                    boxLabel:'Only Friends'
                },{
                    inputValue:'gnfusers',
                    hidden: !biogps.usrMgr.is_gnf_user,
                    disabled: !biogps.usrMgr.is_gnf_user,
                    hideParent: true,
                    name:'rolepermission',
                    boxLabel:'GNF'
                },{
                    inputValue:'novartisusers',
                    hidden: !biogps.usrMgr.is_gnf_user,
                    disabled: !biogps.usrMgr.is_gnf_user,
                    hideParent: true,
                    name:'rolepermission',
                    boxLabel:'Novartis & GNF'
                },{
                    inputValue:'myself',
                    boxLabel:'Only Me',
                    name:'rolepermission',
                    checked: !biogps.usrMgr.can_share
                }]

            }]
        }],

        buttons: [{
            text:this.modifyonly?'Save Edits':'Save New',
            handler: this.doSavePlugin,
            style: 'font-weight: bold',
            scope:this
        },{
            text:'Cancel',
            handler: this.cancelEdit,
            hidden: !this.modifyonly,
            scope:this
        },{
            text:'Preview',
            handler: this.previewPlugin,
            scope:this
        },{
            text:'Clear',
            handler: this.doClearForm,
            hidden: this.modifyonly,
            scope: this
        },{
            text: 'Delete',
            hidden: !this.modifyonly,
            handler: this.deletePlugin,
            scope: this
        }]
    });

    this.on('afterlayout', function(){
        //this.addURLHelp();
        this.addScreencastLink();
    }, this);

};
Ext.extend(biogps.PluginEditPanel, Ext.FormPanel, {
    addURLHelp: function(targetfield){
        if (!this.urlhelp){
            //var parentcontainer = this.items.get(0).items.get(1).container;
            var parentcontainer = targetfield.container;
            var container = parentcontainer.createChild({tag:'div', cls:'keyword-btn'});

            this.keywordmenu = new Ext.menu.Menu({cls:"no-icon-menu"});
            this.keywordmenu.add('<b class="menu-title">Available keywords:</b>');
            for (var i=0;i<biogps.PLUGINKEYWORDS_common.length;i++){
                this.keywordmenu.add({
                    text: biogps.PLUGINKEYWORDS_common[i].text,
                    //cls: 'x-btn-text',
                    keyword:biogps.PLUGINKEYWORDS_common[i].key,
                    handler: this.appendKeyword,
                    scope: this
                });
            }
            this.subkeywordmenu = new Ext.menu.Menu({cls:"no-icon-menu"});
            for (var i=0;i<biogps.PLUGINKEYWORDS_other.length;i++){
                this.subkeywordmenu.add({
                    text: biogps.PLUGINKEYWORDS_other[i].text,
                    keyword:biogps.PLUGINKEYWORDS_other[i].key,
                    handler: this.appendKeyword,
                    scope: this
                });
            }
            this.keywordmenu.add('-');
            this.keywordmenu.add({
                text: "more keywords",
                menu: this.subkeywordmenu,
                handler: function(){return false;}
            });


            this.urlhelp = new Ext.Toolbar.Button({
                renderTo: container,
                iconCls:'icon-help',
                text: 'Add Keyword',
                handler: function() {this.showMenu();}, //optionsHandler, // handle a click on the button itself
                menu: this.keywordmenu
            });
        }
    },

    addScreencastLink: function(){
        if (!this.screencast){
            var link = '<a class="roundButton right" href="http://plugins.biogps.org/screencasts/plugin_registration/">Watch the Screencast</a>';
            this.screencast = this.header.insertHtml('afterBegin',link,true);
        }
    },

    appendKeyword: function(item, evt){
        if (item.keyword){
            var newurl = this.form.getValues().url+item.keyword;
            this.form.setValues({url: newurl});
            this.toggleSpeciesBasedOnKeyword(newurl);
        }
    },

    validateURLTemplate: function(url){
        var _url = url.trim();
        var p = new biogps.Plugin();
        p.url = _url;
        var is_valid = p.validateUrl();
        return is_valid;
    },

    toggleSpeciesBasedOnKeyword: function(url){
        var _url = url.trim();
        var p = new biogps.Plugin();
        p.url = _url;
        var allowed_species = p.getAllowedSpeciesOnKeyword();
        if (Ext.isArray(allowed_species)){
            var current_species_selected = this.form.findField('allowedspeciesGroup').getRawValue();
            if ( !current_species_selected.sort().equals(allowed_species.sort()) ){
                this.setSpeciesGroup(allowed_species);
                this.showSpeciesMsgTip('<img style="vertical-align:text-top;" src="/assets/img/information.png" />&nbsp;"Allowed species" has been changed based on the keyword used in URL template.')
                return true;
            }
        }
        this.hideSpeciesMsgTip();
        return false;
    },

    showSpeciesMsgTip: function(msg){
       var species_group = this.form.findField('allowedspeciesGroup');
       var target_el = species_group.items.get(species_group.items.length-1).getEl().parent();
       if (!this.species_msgtip){
           this.species_msgtip = new Ext.ToolTip({
                //target: target_el,
                //defaultAlign: 'l-r',
                anchor: 'left',
                anchorOffset: 0,
                renderTo: species_group.getEl(),
                html: msg,
                maxWidth: 230,
                anchorToTarget: true,
                dismissDelay: 0,
                autoHide: false
            });
            this.species_msgtip.showAt(this.species_msgtip.el.getAlignToXY(target_el, 'l-tr', [20, -5]));
            //this.species_msgtip.show();
       }
       else {
           if (this.species_msgtip.hidden) {
               this.species_msgtip.show();
           }
           this.species_msgtip.body.update(msg);
           this.species_msgtip.doAutoWidth();
       }
    },

    hideSpeciesMsgTip: function(){
        if (this.species_msgtip){
            this.species_msgtip.hide();
            delete this.species_msgtip;
        }
    },

    cancelEdit: function(item, evt){
       if (this.modifyonly && this.form.isDirty()) {
            Ext.MessageBox.confirm('Confirm', 'Cancel modification? Unsaved changes will be discarded.',
                                   function(ans){
                                        if (ans == 'yes'){
                                            biogps.currentLibrary.setActiveItem('library-plugin','library-edit');
                                            _gaq.push(['_trackPageview', '/pluginlibrary/edit/cancel/']);
                                        }
                                   },
                                   this);
       }
       else {
          biogps.currentLibrary.setActiveItem('library-plugin','library-edit');
       }
    },

    previewPlugin: function(){
        var p = new biogps.Plugin(this.form.getValues());
        if (p.allowedspecies){
            if (isArray(p.allowedspecies))
                p.species = p.allowedspecies;
            else
                p.species = [p.allowedspecies];
        }

        biogps.loadSampleGene({
            species: p.species.length > 0 ? p.species[0] : null,
            callback: function(){
                if (!p.geturl(biogps.sample_gene)){
                     Ext.MessageBox.show({
                        title:'Error',
                        msg: 'Can not interpret the URL template. Please make sure the substitutable keyword is correct.',
                        buttons: Ext.Msg.OK,
                        icon: Ext.MessageBox.ERROR
                    });
                }
                else{
                    //p.preview(Ext.get('pluginboxcontainer'));
                    p.render_preview(biogps.sample_gene, Ext.get('pluginboxcontainer'));
                }
            },
            scope: this
        });

        /*
        //get proper sample gene id based on first allowed species
        var sample_gene_id = 1017;  //default, CDK2
        if (p.options.allowedSpecies.length>0 && biogps.SAMPLE_GENE &&
            biogps.SAMPLE_GENE[p.options.allowedSpecies[0]]){
                //if available, set species_specific sample gene
                sample_gene_id = biogps.SAMPLE_GENE[p.options.allowedSpecies[0]];
        }

        //now load sample_gene object if not loaded before
        if (biogps.sample_gene && biogps.sample_gene.id == sample_gene_id){
            if (!p.geturl(biogps.sample_gene)){
                 Ext.MessageBox.show({
                    title:'Error',
                    msg: 'Can not interpret the URL template. Please make sure the substitutable keyword is correct.',
                    buttons: Ext.Msg.OK,
                    icon: Ext.MessageBox.ERROR
                });
            }
            else{
                //p.preview(Ext.get('pluginboxcontainer'));
                p.render_preview(biogps.sample_gene, Ext.get('pluginboxcontainer'));
            }
        }
        else {
            biogps.sample_gene = new biogps.Gene({id: sample_gene_id});
            biogps.sample_gene.on('load', function(gene){
                this.previewPlugin();
                _gaq.push(['_trackPageview', '/pluginlibrary/edit/preview/']);
            }, this);
            biogps.sample_gene.load();
        }*/
    },

    doSavePlugin: function(){
        if (this.modifyonly)
            Ext.MessageBox.confirm('Confirm', String.format('Update plugin "{0}"?', this.form.getValues().title),
                function(ans){
                    if (ans == 'yes')
                        this.submitPluginForm();
                },
                this);
        else
            this.submitPluginForm();
    },

    handleDupPluginAtSave: function(dup_plugins){
        if (dup_plugins && dup_plugins.length>0){
            var title, msg;
            var existing_links = '<p><br />';
            dup_plugins.each(function(p){existing_links+='<a href="#goto=pluginlibrary&t=library-plugin&p='+p.id.toString()+'" onclick="javascript:Ext.Msg.hide();">'+p.text+'</a><br />';});
            existing_links += '</p>';

            if (dup_plugins.length==1){
                title = 'Duplicated plugin found';
                msg = 'We detected that there is an existing plugin with exactly the same URL template as you provided. You can click the link below to view this existing plugin: ' + existing_links + '<p><br />Click "Yes" to save it anyway, or "No" to cancel the saving.</p>';
            }
            else {
                title = 'Duplicated plugins found';
                msg = 'We detected that there are '+dup_plugins.length.toString()+' existing plugins with exactly the same URL template as you provided. You can click the links below to view the existing plugins: ' + existing_links + '<p><br />Click "Yes" to save it anyway, or "No" to cancel the saving.</p>';
            }

            Ext.Msg.confirm(
                title,
                msg,
                function(ans){
                    if (ans == 'yes'){
                        this.submitPluginForm({allowdup:true});
                    }
                },
                this);
        }
    },

    /**
     * Do the actual plugin saving
     * @param {} cfg  allowed "cfg" parameter is "allowdup". this.submitPluginForm({allowdup:true}) will bypass duplication check and save plugin anyway.
     */
    submitPluginForm: function(cfg){
       var form = this.form;
       if (! form.isValid()){
             Ext.MessageBox.show({
                title:'Error',
                msg: 'Wrong input! Correct and try again.',
                buttons: Ext.Msg.OK,
                icon: Ext.MessageBox.ERROR
            });
            form.reset();
       }
       else if (this.modifyonly && !this.current_pluginid){
             Ext.MessageBox.show({
                title:'Error',
                msg: 'Missing plugin id for updating this plugin! Reload this plugin and try again.',
                buttons: Ext.Msg.OK,
                icon: Ext.MessageBox.ERROR
            });
       }
       else {
            var p = new biogps.Plugin(form.getValues());
            var valid = p.validateUrl();
            if (valid == true){
                this.toggleSpeciesBasedOnKeyword(p.url);
                form.getEl().mask(this.modifyonly?'Save your modification...':'Submit your new plugin...');
                var extra_params = {};
                if (this.modifyonly) Ext.apply(extra_params, {plugin_id:this.current_pluginid});
                if (cfg && cfg.allowdup) Ext.apply(extra_params, {allowdup:'1'});
                form.submit({
                    url: this.modifyonly?'/plugin_v1/update/':'/plugin_v1/add/',
                    method:'POST',
                    //params: this.modifyonly?{plugin_id:this.current_pluginid}:{},
                    params: extra_params,
                    success: function(form, action){
                        form.getEl().unmask();
                        form.getEl().mask(this.modifyonly?'Your plugin was updated!':'Your plugin was saved!');
                        _gaq.push(['_trackPageview', '/pluginlibrary/edit/save/']);
                        setTimeout(function(){
                            form.getEl().unmask();
                            //renderPluginById(action.result.plugin_id);
                            }, 1000);

                        // Reset the form if this was for a new plugin
                        if (!this.modifyonly && !this.current_pluginid) {
                            this.current_pluginid = action.result.plugin_id;
                            form.reset();
                        }

                        // Display the final plugin view.
                        var from_panel = this.modifyonly ? 'library-edit' : 'library-add';
                        biogps.currentLibrary.renderPluginById(this.current_pluginid,from_panel);
                    },
                    failure: function(form, action){
                        form.getEl().unmask();
                        if (action.result.dup_plugins){
                            this.handleDupPluginAtSave(action.result.dup_plugins);
                        }
                        else{
                            biogps.formfailure(action,
                                               this.modifyonly?'"updatePlugin" service failed!':'"addPlugin" service failed!');
                        }
                    },
                    scope: this
                });
            }
            else{ /* p.validateUrl() => false or errmsg */
                var errmsg = 'Invalid URL template. ';
                if (Ext.isString(valid))  //in this case valid is actually a string of errmsg.
                    errmsg += valid;
                else
                    errmsg +=  'Please make sure the substitutable keyword is correct.';
                Ext.MessageBox.show({
                    title:'Error',
                    msg: errmsg,
                    buttons: Ext.Msg.OK,
                    icon: Ext.MessageBox.ERROR
                });
            }
        }
    },

    doClearForm: function(){
        if (this.modifyonly)
            Ext.MessageBox.confirm('Confirm', String.format('Clear all values for plugin "{0}"?', this.form.getValues().title),
                function(ans){
                    if (ans == 'yes')
                        this.form.reset();
                },
            this);
        else
            this.form.reset();
    },

    setSpeciesGroup: function(species_list){
/*        var form = this.form;
        form.findField('allowedspeciesGroup').items.each(function(item){
            for (var i=0;i<biogps.AVAILABLE_SPECIES.length;i++){
                if (item.inputValue == biogps.AVAILABLE_SPECIES[i]){
                    item.setValue(species_list.indexOf(biogps.AVAILABLE_SPECIES[i]) != -1);
                }
            }
        });*/

        var cb_grp = this.form.findField('allowedspeciesGroup');
        var cb_values = [];
        cb_grp.eachItem(function(item){
            cb_values.push(species_list.indexOf(item.inputValue) != -1);
        });
        cb_grp.setValue(cb_values);
    },

    fillPluginForm: function(plugin){
        var form = this.form;
        form.setValues({
            url: plugin.url,
            title: plugin.title,
            description: plugin.description,
            tags: plugin.tags,
            rolepermission: plugin.formatPermission()
        });

        var species = plugin.getAllowedSpecies();
        this.setSpeciesGroup(species);
        this.current_pluginid = plugin.id;
    },

    deletePlugin: function(){
        if (!this.modifyonly)
            return false;

        var _plugin_id = this.current_pluginid;
        var _plugin_title = this.form.getValues().title;

		biogps.callRemoteService({
			url: '/plugin_v1/'+_plugin_id+'/usage/',
			scope: this,
			fn: function(st){
				var usage_cnt = st.reader.jsonData;
				var msg = String.format('Are you SURE you want to delete the "{0}" plugin?<br />This action CANNOT be undone!', _plugin_title);
				if (usage_cnt[0]>0 || usage_cnt[1] > 0){
					msg += String.format('<br /><br />Usage info: this plugin is currently used in [<b>{0}</b>] of your own layouts and [<b>{1}</b>] of others\'.', usage_cnt[0], usage_cnt[1])
				}
				else{
					msg += '<br /><br />Usage info: this plugin is currently not used in any layout.';
				}
		        Ext.MessageBox.confirm('Confirm',
		            msg,
		            function(ans){
		                if (ans == 'yes')
		                    doDelete(this);
		            },
		            this);
			}
		});

        function doDelete(_this){
            var st = new Ext.data.JsonStore({
                url: '/plugin_v1/delete/',
                baseParams: {'plugin_id': _plugin_id},
                method: 'POST',
                fields:[],
                autoLoad: true
            });
            _this.body.mask(String.format('Delete plugin "{0}"...', _plugin_title));
            st.on('load', function(st){
                var data = st.reader.jsonData;
                if (data.success){
                    _this.body.unmask();
                    _this.body.mask('You plugin was deleted!');
                    _gaq.push(['_trackPageview', '/pluginlibrary/edit/delete/']);
                    setTimeout(function(){
                        _this.body.unmask();
                        // Take the user back home.
                        biogps.currentLibrary.setActiveItem('library-home','delete');
                    }, 1500);

                }
                else {
                     _this.body.unmask();
                     Ext.MessageBox.show({
                        title:'Error',
                        msg: data.error?data.error:'',
                        buttons: Ext.Msg.OK,
                        icon: Ext.MessageBox.ERROR
                    });
                }
            },_this);
            st.on('loadexception', biogps.ajaxfailure, _this);
        }
    }

});





///////////////////////////////////////////////////////////////////////////////
//   STANDALONE FUNCTIONS
///////////////////////////////////////////////////////////////////////////////

// Called after '/plugin_v1/browse' has been loaded.
// Initializes the Ext layouts and panels for the Library.
//   Param historyParams: (optional) used for back button & deep linking.
function initLibrary(historyParams) {
    // Retrieve the parent panel, in which the Library will live.
    var tab_container = Ext.getCmp('pluginbrowse_panel');

    // Local Store for Browsing / Searching
    biogps.pluginStore = new biogps.pluginJsonStore({
        url: '/plugin_v1/',
        method: 'GET',
        root: 'items',
        totalProperty: 'totalCount',
        id: 'pk',
        fields: [],
        listeners: {
            'beforeload': {
                scope: this,
                fn: function(pS, conf) {
                    biogps.currentLibrary.body.mask('Loading...');
                    biogps.currentLibrary.setBrowseTitle('Loading');

                    // NOTE: The code below is a set of ugly hack work-arounds for
                    // a number of issues with ExtJS. It should be ditched entirely
                    // on the next rewrite of the plugin library.
                    //  - Marc on 6/28/10

                    // Ensure basic parameters are in place.
                    // We use this way of doing it, because when using the
                    // pluginStore's baseParams, they are not changeable.
                    if (!conf.params.start) { conf.params.start = 0; }
                    if (!conf.params.limit) { conf.params.limit = 50; }
                    if (!conf.params.scope) { conf.params.scope = 'all'; }
                    if (!conf.params.dir) { conf.params.dir = 'DESC'; }

                    // Supply a default sorting method if none was chosen.
                    // We retrieve the value of the combo box to work around Ext's PagingToolbar
                    // forgetting the values of mysort and dir.
                    if (!conf.params.mysort) {
                        if (biogps.currentLibrary.sortCombo &&
                            biogps.currentLibrary.sortCombo.getValue()) {
                            conf.params.mysort = biogps.currentLibrary.sortCombo.getValue();
                            var res = biogps.currentLibrary.sortCombo.store.query('sortby',conf.params.mysort);
                            conf.params.dir = res.items[0].data.direction;
                        }
                        else { conf.params.mysort = 'popularity'; }
                    }
                }
            },
            'load': {
                scope: this,
                fn: function(pS) {
                    biogps.currentLibrary.body.unmask();

                    // Catch the case of a search returning 1 answer, in which case we jump
                    // straight to that plugin's page.
                    if (pS.getTotalCount() === 1) {
                        var plugin = pS.getAt(0);
                        // We supply 'library-home' as the 'from' parameter to hide the
                        // browse view from the breadcrumb.
                        biogps.currentLibrary.renderPluginById(plugin.id,'library-home');
                    }
                    else {
                        var params = pS.lastOptions.params;
                        var title = '';

                        // Set the browse title
                        if (params.tags) {
                            title = "plugins tagged with '" + params.tags + "'"; }
                        else if (params.search) {
                            title = "results for '" + params.search + "'"; }
                        else {
                            title = "Plugins"; }

                        if (params.mysort == 'created') {
                            title = 'Newest ' + title; }
                        else if (params.mysort == 'lastmodified') {
                            title = 'Recently Updated ' + title; }
                        else if (params.mysort == 'popularity') {
                            title = 'Most Popular ' + title; }
                        else if (params.mysort == 'title') {
                            title = 'Alphabetical ' + title; }
                        else if (params.mysort == 'author') {
                            title = 'By Author ' + title; }

                        biogps.currentLibrary.setBrowseTitle(title);

                        // Make the sorting drop-down list reflect the sorting used.
                        Ext.getCmp('library-browse-sort').setValue(params.mysort);

                        // The call to hash_history will be a duplicate in some
                        // cases, which won't hurt anything.  This will, however,
                        // catch the case where the user takes action to change
                        // the browse page somehow (i.e. change sorting order).
                        biogps.currentLibrary.hash_history();
                    }
                }
            }
        }
    });



    // Plugin Templates
    // Called from various render functions to display a plugin in any of
    // these three styles: small, medium, and large.
    biogps.pluginTpls = new Array();
    var smallTpl = new Ext.XTemplate(
        '<tpl for=".">',
        '<a class="pluginbox {[("permission" in values) ? this.isGNF(values.permission) : "myself"]}',
        '" href="javascript:biogps.currentLibrary.renderPluginById({id},\'library-browse\')">',
            '<span class="name">{title}</span><br />',
            '<span class="url">{[shortUrl(values.url)]}</span>',
        '</a></tpl>', {
            isGNF: function(perm) {
                return (perm.R[0] === 'GNF Users') ? 'gnfusers' : '';
            }
        }
    );
    biogps.pluginTpls['small'] = smallTpl.compile();

    var mediumTpl = new Ext.XTemplate(
        '<tpl for=".">',
        '<a class="roundBoxBlue pluginbox-medium {rolepermission}" ',
        'href="javascript:biogps.currentLibrary.renderPluginById({id},\'library-browse\')">',
            '<span class="author">Registered by {author}</span>',
            '<span class="name">{title}</span><br />',
            '<tpl if="1 <= values.usage_percent.layouts">',
                '<span class="usage">Layout Popularity: {values.usage_percent.layouts:round(0)}</span>',
            '</tpl>',
            '<p class="description">{description}</p>',
            '<p class="url">{[colorShortUrl(values.url)]}</p>',
        '</a></tpl>', {
            isGNF: function(perm) {
                return (perm.R[0] === 'GNF Users') ? 'gnfusers' : '';
            }
        }
    );
    biogps.pluginTpls['medium'] = mediumTpl.compile();

    var largeTpl = new Ext.XTemplate(
        '<div class="roundBoxBlue basics {rolepermission}">',
            '<div class="preview">',
                '<div id="library-plugin-preview">',
                    '<iframe src="{previewUrl}"></iframe>',
                '</div>',
                '<p>Preview of CDK2 gene data</p>',
            '</div>',

            '<tpl if="certified_owner">',
                '<a class="certified_owner_badge" title="Certified Owners also maintain the plugin website. Click to read more."',
                ' href="http://biogps.blogspot.com/2010/06/taking-ownership-of-your-plugin.html" target="_blank"></a>',
            '</tpl>',

            '<h1>{title}</h1>',

            '<tpl if="certified_owner">',
                '<p class="author">Maintained by <a href="{author_url}">{author}</a>, Certified Owner</p>',
            '</tpl>',
            '<tpl if="!certified_owner">',
                '<p class="author">Registered by <a href="{author_url}">{author}</a></p>',
            '</tpl>',

            '<tpl if="1 <= values.layout_count">',
                '<br /><b><u>Usage Statistics</u></b>',
                '<p>Layouts using plugin: <b>{values.layout_count}</b>',
                '<br />Users using plugin: <b>{values.users}</b></p>',
            '</tpl>',

            '<br /><p class="attribute"><span class="attribute-name"><u>Tags</u>:</span> ',
            ' {tags}</p>',

            '<br /><b><u>Details</u></b>',
            //'<p class="url attribute">{[colorShortUrl(values.url)]}',
            //'<tpl if="mobile_url">',
            //    '<p class="url attribute"><span class="attribute-name">Mobile:</span> {[colorShortUrl(values.mobile_url)]}</p>',
            //'</tpl>',
            '<br /><p class="url attribute"><b>Template:</b> {[colorShortUrl(values.url)]}',
            '<tpl if="mobile_url">',
                '<br /><b>Mobile Template:</b> {[colorShortUrl(values.mobile_url)]}</p>',
            '</tpl>',

            '<p class="attribute"><span class="attribute-name">Allowed species:</span>',
            ' {allowedspecies}</p>',
            '<tpl if="!Ext.isEmpty(related_plugins)">',
            '  <p class="attribute"><span class="attribute-name">Commonly used with:</span>',
            '    <tpl for="related_plugins">',
            '      <a href={url}>{[values.title.length > 18 ? values.title.substring(0,15) + \'...\' : values.title]}</a>&nbsp;&nbsp;&nbsp;',
            '    </tpl>',
            '  </p>',
            '</tpl>',
            '<div><div id="plugin-add-to-layout"></div></div>',
            '<div class="permission"></div>',
            '<div class="clear"></div>',
        '</div>',
        '<div class="roundBox details">',
            '<h4>Long Description</h4>',
            '<p class="description">{description}</p>',
            '<p class="timestamp">Updated {lastmodified}<br />Created {created}</p>',
            '<div class="clear"></div>',
        '</div>',
        '<div class="details noBorder">',
            '<a id="flag-button" class="roundButton" style="visibility: hidden;">',
                '<img src="/assets/img/flag_red.png"/>',
                'Flag as Broken or Inappropriate',
            '</a>',
        '</div>'
    );
    biogps.pluginTpls['large'] = largeTpl.compile();



    // Create the Library's primary panel
    var libraryCard = new biogps.PluginLibrary({
        id: 'pluginlibrary_card',
        layout:'anchor',
        autoScroll: true,
        bodyStyle: 'padding:5px',
        border: false,
        autoWidth: true,
        defaults: {
            // applied to each contained panel
            border: false
        },

        // Breadcrumb navigation, built using Ext buttons
        tbar: [{
            id: 'btn-library-home',
            text: 'Library &nbsp; &raquo;',
            cls: 'activeBreadcrumb',
            handler: navHandler.createDelegate(this, ['home'])
        },
        {
            id: 'btn-library-browse',
            text: 'Browse &raquo;',
            handler: navHandler.createDelegate(this, ['browse']),
            hidden: true
        },
        {
            id: 'btn-library-plugin',
            text: 'Plugin',
            handler: navHandler.createDelegate(this, ['plugin']),
            hidden: true
        },
        {
            id: 'btn-library-edit',
            text: 'Edit Plugin',
            handler: navHandler.createDelegate(this, ['edit']),
            hidden: true
        },
        '->', // greedy spacer so that the buttons are aligned to each side
        {
            id: 'btn-library-add',
            text: 'Add a Plugin',
            handler: navHandler.createDelegate(this, ['add'])
        }],

        // the panels (or "cards") within the layout
        items: [{
            id: 'library-header',
            contentEl: 'pluginheader'
        },{
            id: 'library-search',
            xtype: 'form',
            baseCls: 'x-window',
            cls: 'x-window-plain x-window-dlg',
            autoWidth: true,
            frame: true,
            title: '   ',
            onSubmit: Ext.emptyFn,
            keys: {
                // Handles the Enter key getting pressed instead of the button.
                // Mainly present for IE6, which otherwise won't work correctly.
                key: 13, // Enter key
                stopEvent: true,
                fn: function() {
                    biogps.currentLibrary.queryPlugins();
                }
            },
            items: [{
                xtype: 'panel',
                layout: 'column',
                border: false,
                items: [{
                    xtype: 'textfield',
                    name: 'query',
                    cls: 'search_field',
                    id: 'plugin_query',
                    emptyText: 'Search the Plugin Library',
                    columnWidth: 1 // Specified as a percentage
                },{
                    xtype: 'panel',
                    border: false,
                    width: 75,
                    items: [{
                        xtype: 'button',
                        type: 'submit',
                        text: 'SEARCH',
                        cls: 'right',
                        handler: function() {
                            biogps.currentLibrary.queryPlugins();
                        }
                    }]
                }]
            },{
                id: 'library-search-advanced',
                xtype: 'panel',
                title: 'Advanced',
                collapsed: true,
                collapsible: true,
                titleCollapse: true,
                hideCollapseTool: true,
                baseCls: 'form-group',
                items: [{
                    xtype: 'checkbox',
                    id: 'scope_my',
                    boxLabel: 'My Plugins',
                    checked: true
                },{
                    xtype: 'checkbox',
                    id: 'scope_shared',
                    boxLabel: 'Shared Plugins',
                    checked: true
                }]
            }]
        },{
            id: 'library-add',
            //contentEl: 'pluginadd',
            hidden: true,
            height: 650,
            items: new biogps.PluginEditPanel({
                id:'pluginadd',
                pluginbox: this,
                modifyonly: false
            })
        },{
            id: 'library-home',
            contentEl: 'pluginhome'
        },{
            id: 'library-browse',
            title: 'Browse',
            hidden: true,
            items: new Ext.DataView({
                tpl: biogps.pluginTpls['medium'],
                store: biogps.pluginStore,
                itemSelector: 'div.plugindetails'
            })
        },{
            id: 'library-plugin',
            contentEl: 'pluginpage',
            hidden: true
        },{
            id: 'library-edit',
            hidden: true,
            items: [{html:''}]
        }],

        // The toolbar used to paginate the browse page.
        bbar: new Ext.PagingToolbar({
            id: 'library-browse-nav',
            store: biogps.pluginStore,
            autoHeight: true,
            pageSize: 50,
            displayInfo: true,
            displayMsg: 'Plugins {0} - {1} of {2}',
            emptyMsg: 'No plugins to display',
            hidden: true
        })
    });

    // Add the Library to the parent panel and force it to render.
    tab_container.add(libraryCard);
    tab_container.doLayout();

    // Hide the initial loading mask, created in biogps_base.js' renderPluginBrowsePanel
    biogps.centerTab.body.unmask();

    // Create and add the sorting drop-down list for browsing.
    var sortStore = new Ext.data.ArrayStore({
        fields: ['sortby','direction','sortbyName'],
        data: [
            ['popularity','DESC','Most Popular'],
            ['created','DESC','Newest first'],
            ['lastmodified','DESC','Recently Updated'],
            ['title','ASC','Plugin Name'],
            ['author','ASC','Author']
        ]
    });
    var sortCombo = new Ext.form.ComboBox({
        id: 'library-browse-sort',
        store: sortStore,
        valueField: 'sortby',
        displayField: 'sortbyName',
        mode: 'local',
        editable: false,
        triggerAction: 'all',
        width: 125,
        listWidth: 125,
        listeners: {
            // 'select' will be fired as soon as an item in the ComboBox is selected
            select: function(combo, newValue, oldValue) {
                biogps.currentLibrary.sortPluginList(
                    newValue.data.sortby,
                    newValue.data.direction
                );
            }
        }
    });
    Ext.getCmp('library-browse-nav').add(sortCombo);
    biogps.currentLibrary.sortCombo = sortCombo;

    // If the user is not logged in...
    // Commented out the if statement on 2/23/09 to always hide the Advanced bar.
    //if (biogps.usrMgr.is_anonymoususer) {
        // Hide the Advanced search section
        Ext.getCmp('library-search-advanced').hide();
    //}

    // Handle a history event if one exists
	if (historyParams) {
		biogps.currentLibrary.dispatcher_by_params(historyParams);
	}
	else {
	    // No history was passed through, so we need to stick the newly
	    // initialized library into the hash.
	    biogps.currentLibrary.hash_history();
	    biogps.currentLibrary.mask.hide();
        _gaq.push(['_trackPageview', '/pluginlibrary/']);
	}

    // if (Ext.isIE6) { pngfix(); }
};



// Passes on calls from the breadcrumb buttons to change the display.
var navHandler = function(direction) {
    var item = 'library-' + direction;
    biogps.currentLibrary.setActiveItem(item, 'breadcrumb');
};



// Extracts only the domain from a URL.  Used when displaying the 'small'
// plugin template.  It works by doing 2 RegEx substitutions to:
//   1. Strip out everything up to and including ://
//   2. Strip out everything after and including the next /
var shortUrl = function(url) {
    var str = url.replace(/.*\:\/\//,'').replace(/\/.*/,'');
    if (str == '') { str = 'biogps.gnf.org' };
    return str;
}

// Highlights only the domain from a URL, by wrapping it in a span element.
// Used when displaying the 'medium' plugin template.
var colorShortUrl = function(url) {
    // Split up the URL on either side of the '://'
    var str = url.split('://');
    // In case there was no split, we add default text
    if (str.length == 1) {
        str[1] = 'biogps.gnf.org' + str[0];
        str[0] = 'http';
    }

    // Split the second part again to add in the closing tag
    var str2 = str[1].split('/');
    str2[0] = str2[0] + '</span>';

    return str[0] + '://<span class="domain">' + str2.join('/');
}











///////////////////////////////////////////////////////////////////////////////
//   OLD CODE BELOW HERE
///////////////////////////////////////////////////////////////////////////////


// Not sure why this is used yet.
function disableEnterKey(e){
     var key;
     if(window.event)
          key = window.event.keyCode;     //IE
     else
          key = e.which;     //firefox
     if(key == 13)
          return false;
     else
          return true;
}
