// Our custom Window Manager object for grouping portlets separately from the
// standard Ext.WindowMgr.  The primary goal is to drop the z-index of the
// portlets below the global 9000 seed.
biogps.portletGroup = Ext.WindowGroup();
biogps.portletGroup.zseed = 1000;

/**
 * @class biogps.Portlet
 * @namespace biogps
 * @extends Ext.ux.ManagedIFrame.Window
 * @cfg{String} id The unique id of this component
 * @cfg{biogps.Plugin} plugin the plugin rendered in this portlet window
 * @cfg{biogps.Gene} gene the gene instance used by plugin to render content
 * @cfg{Mixed} renderTo the container element this portlet will render to
 * @constructor
 * @param {object} configObj
 * An object containing the required configuration options for this class
 */
biogps.Portlet = function(config) {

    //The following parameters need to be specifized by each portlet instance

    /**
     * @cfg{String} id The unique id of this component
     */
    this.id;

    /**
     * @cfg{biogps.Plugin} plugin the plugin rendered in this portlet window
     */
    this.plugin;

    /**
     * @cfg{biogps.Gene} gene the gene instance used by plugin to render content
     */
    this.gene;
    /**
     * @cfg{Mixed} renderTo the container element this portlet will render to
     */
    this.renderTo;

    var default_cfg = {
        manager       : biogps.portletGroup,
        xtype         : 'biogpsportlet',
        maximizable   : true,
        //minimizable   : true,
        collapsible   : false,
        //constrain     : true,
        constrainHeader    : true,
        shadow        : Ext.isIE,
        animCollapse  : false,
        autoScroll    : true,
        bodyCssClass  : 'portlet-body',
        hideCollapseTool: true,
        hideMode      : 'display',  //'nosize',

                    //iconCls     : 'icon-loading',
                    //loadMask    : {msg: 'Loading...'},
        renderTo: this.container,

        defaultSrc    : '/assets/img/s.gif',   //need to set a dummy value so that the "documentloaded" event will be fired after the first time loading
                                               //This is a bug in Ext.ux.ManagedIFrame.Window

        tools: [{
/*            id: 'left',
            handler: function(evt, btn){this.showInfo(btn);},
            scope:this,
            qtip: 'More tools'
        },{

            id: 'info',
            handler: function(evt, btn){this.showInfo(btn);},
            scope:this,
            qtip: 'Info'
        },{
            id: 'flag',
            handler: function(){this.flagit();},
            scope:this,
            hidden: true,
            qtip: 'Flag as broken or inappropriate'
        },{
            id: 'help',
            handler: function(evt, btn){this.showInfo(btn);},
            scope:this,
            hidden: true,
            qtip: 'Help'
        },{*/
            id: 'gear',
            handler: function(evt, btn){this.showOptionMenu(btn);},
            scope:this,
            qtip: 'More options'
/*        },{
            id: 'refresh',
            handler: function(evt, btn){this.refresh();},
            scope:this,
            qtip: 'Refresh'
        },{
            id: 'pin',
            handler: biogps.evtEmptyFn,
            scope:this,
            qtip: 'Pin'
        },{
            id: 'search',
            handler: biogps.evtEmptyFn,
            scope:this,
            qtip: 'Search'
        },{
            id: 'save',
            handler: biogps.evtEmptyFn,
            scope:this,
            qtip: 'Save'
        },{
            id: 'print',
            handler: biogps.evtEmptyFn,
            scope:this,
            qtip: 'Print'*/
        }]
    };
    Ext.apply(this, config, default_cfg);

    //set default dimenstion parameters is any is missing.
    this.x = this.x || 0;
    this.y = this.y || 0;
    this.width = this.width || (350*2);
    this.height = this.height || 250;

    biogps.Portlet.superclass.constructor.call(this);

    //a flag to bypass calling of this.syncSize and syncLocation after resizing and moving.
    this.flag_bypasspluginsync = false;

    //this will be fired whenever the content is loaded completely, regardless the type of content
    this.addEvents({'contentload': true});

    this.addEvents({'speciesswitch': true});

    this.on({
        'contentload': function(){this.onContentLoad();},
        'documentloaded': function(){this.fireEvent('contentload');},
        'resize': function(){if (!this.flag_bypasspluginsync) this.syncSize(); this.fixHeaderText(); this.toFront();},
        'move': function(){if (!this.flag_bypasspluginsync) this.syncLocation();},
        'maximize': function(){biogps.utils.toggleScrollbar(biogps.centerTab.get('report_panel').body, true);},
        'restore': function(){biogps.utils.toggleScrollbar(biogps.centerTab.get('report_panel').body, false);},
        'show':  function(){
            this.renderSpeciesSelector();
            this.syncLocation();
            this.syncSize();

            if (Ext.isIE) {
                //Oddly enough, IE requires this even with delay of "0".
                //Otherwise, a myterious "Object required" js error.
                var ddd_task = new Ext.util.DelayedTask(function(){
                    this.loadContent();
                }, this);
                ddd_task.delay(0);
            }
            else{
                this.loadContent();
            }
        },
        scope: this
    });

};
Ext.extend(biogps.Portlet, Ext.ux.ManagedIFrame.Window, {

    //override the original maximize method to
    maximize : function(){
        if(!this.maximized){
            this.expand(false);
            this.restoreSize = this.getSize();
            this.restorePos = this.getPosition(true);
            if (this.maximizable){
                this.tools.maximize.hide();
                this.tools.restore.show();
            }
            this.maximized = true;
            this.el.disableShadow();

            if(this.dd){
                this.dd.lock();
            }
            if(this.collapsible){
                this.tools.toggle.hide();
            }
            //this.el.addClass('x-window-maximized');
            //this.container.addClass('x-window-maximized-ct');


            /*****some adjustment for maximizing windows in a genereport panel*****/
//            this.setPosition(0, 0);         //this is the original statement
//            this.fitContainer();            //this is the original statement

            //var vs = this.container.getViewSize();
/*            var grp_tab = biogps.centerTab.get('report_panel');
            var bx = this.container.getBox();
            var tab_bx = grp_tab.getPositionEl().getBox();

            var width = bx.width - 15;
            var y = (tab_bx.y>bx.y)?tab_bx.y-bx.y:0;
            //var height = Math.min(Math.max((tab_bx.height-bx.y+25), bx.height), biogps.centerTab.el.getHeight()-(y+bx.y));
            var height = Math.min(bx.height, biogps.centerTab.el.getHeight()-(y+bx.y));*/

            var grp_tab = biogps.centerTab.get('report_panel');
            var bx = this.container.getBox();
            var tab_bx = grp_tab.body.getBox();

            var width = bx.width;
            var y = Math.max(tab_bx.y, bx.y);
            var height = tab_bx.y + tab_bx.height -y;

            this.flag_bypasspluginsync = true;
            this.setPagePosition(bx.x, y);
            this.setSize(width, height);
            this.flag_bypasspluginsync = false;
            //set maximized flag in this.plugin.useroptions
            if (this.plugin){
                if (!this.plugin.useroptions) this.plugin.useroptions = {};
                this.plugin.useroptions.maximized = true;
            }

            /*****end of adjustment*****/
            this.fireEvent('maximize', this);
        }
        return this;
    },

    restore: function(){
        this.flag_bypasspluginsync = true;
        this.constructor.superclass.restore.call(this);
        this.flag_bypasspluginsync = false;
        //clean up maximized flag in this.plugin.useroptions
        if (this.plugin && this.plugin.useroptions){
            delete this.plugin.useroptions.maximized;
            if (biogps.isEmptyObject(this.plugin.useroptions)) this.plugin.useroptions=null;
        }
    },

    //override original close method for asking confirmation
    close: function(options){
        if (options && options.bypass_confirmation){
            if (options.suspend_events) this.suspendEvents();
            this.constructor.superclass.close.call(this);
            if (options.suspend_events) this.resumeEvents();
        }
        else {
            var x = Ext.MessageBox.confirm('Remove Plugin?',
                           String.format('Are you sure that you want to remove <br />this plugin "{0}" from your layout? <br /><br /> Remember to click "options-->Save" to make it PERMANENT.', this.title),
                           function(btn){
                                if (btn == 'yes'){
                                    if (options && options.suspend_events) this.suspendEvents();
                                    this.constructor.superclass.close.call(this);
                                    if (options && options.suspend_events) this.resumeEvents();
                                }
                           },this);
        }
    },

    //override original focus method to avoid extra scrollbar movement.
    //Ref: http://www.extjs.com/forum/showthread.php?t=87053
    focus: Ext.emptyFn,

    /**
     * Hide overflowed text (and register a qtip with full text) if the title is too long
     */
    fixHeaderText: function(){
        var title_el = this.header.down('span.x-window-header-text');
        var actual_text_width = title_el.getTextWidth();
        var right_el = this.species_button? this.species_button.el:this.tools.gear;

        var available_width = right_el.getX() - 2 - title_el.getX() - 5;
        if (actual_text_width > available_width){
            //title is too long, so need a fix
            title_el.setStyle({'display':'block',
                               'overflow': 'hidden'});
            title_el.setWidth(available_width);
            Ext.QuickTips.register({target: title_el,
                                    text:this.title,
                                    dismissDelay: 0});
        }
        else {
            title_el.setStyle({'display':'inline',
                               'overflow': 'visible'});
            title_el.setWidth(actual_text_width);
            Ext.QuickTips.unregister(title_el);
        }
    },

    /**
     * Show an error msg in current portlet window
     * @param {} errmsg
     */
    showError: function(errmsg){
        this.items.clear();
        this.body.update(errmsg);
    },

    _loadContent: function(){
            switch(this.plugin.type){
                case 'div':
                        //var loader = this.frameEl.getUpdater();
                        var loader = this.body.getUpdater();
                        //var loader = this.mifChild.getEl().getUpdater();
                        loader.on({beforeupdate: this.showLoading,
                                   update: function(){this.fireEvent('contentload');},
                                   options: {single: true},
                                   scope: this});

                        //This is to remove MIF.Component in this.items since we don't need iframe anymore for div type.
                        this.items.clear();

                        if (this.html){
                            loader.update(this.html)
                        }
                        else if (this.url) {
                            var _url,
                                scripts_enabled;
                            _url = this.url+'&container='+this.body.id;
                            if (_url.startsWith('http://')) {
                                //url is from different host
                                scripts_enabled = _url.startsWith('http://plugins.biogps.org/');
                                if (this.plugin.options.securityAware)
                                    _url += '&host='+location.host;
                                _url = '/utils/proxy?url='+_url.replace(/&/g,'%26');
                                if (this.plugin.options.securityAware)
                                    _url += '&secure=1';
                            }
                            else {
                                scripts_enabled = true;
                            }
                            //this.frameEl.update(_url, scripts_enabled);
                            loader.update({url:_url, scripts:scripts_enabled});
                        }
                        else{
                            loader.update("HTML content is not available!")
                        }
                        break;
                case 'iframe':
                    this.setSrc(this.url);
                    break;
            }
    },

    loadContent: function(){
        if (this.plugin.url){
            this.showLoading();
            this.url = this.plugin.geturl(this.gene);
            this.updateCurrentSpecies();
            if (this.url){
                if (this.plugin.type=='iframe' && this.plugin.options.securityAware && !this.plugin.is_secure_cookie_set()){
                    //set_scecure_cookie first and then call _loadContent.
                    this.plugin.on('secure_cookie_set', function(){this._loadContent();}, this, {single:true});
                    this.plugin.set_secure_cookie();
                }
                else {
                    this._loadContent();
                }
            }
            else{
                var _gene = this.gene.getEntryGene();
                var err_msg = String.format('This plugin is not available for this gene: {0}({1}, {2})', _gene.Symbol,
                                                                                                              this.gene.EntrySpecies,
                                                                                                              this.gene.EntryGeneID);
                this.showError(err_msg);
                this.fireEvent('contentload');
            }
        }
        else {
            //This plugin is not loaded correctly (likely deleted.)
            var err_msg = "This plugin {0}(id: {1}) is not loaded correctly. \
                           Either you have deleted it already or you don't have the privilege to access it.\
                           <br /><br />If this is your own layout, you might want to remove it from this layout by closing this plugin window.</p>";
            this.showError(String.format(err_msg, this.plugin.title?'"'+this.plugin.title+'"': '', this.plugin.id));

        }

        if (this.plugin.title){
            this.setTitle(this.plugin.title);
            this.fixHeaderText();
        }
    },

    showLoading: function(){
        //this.setIconClass('loading-indicator');
        this.setIconClass('icon-loading');
    },

    onContentLoad: function(){
        this.setIconClass('icon-home');
    },

    refresh:function(){
        this.loadContent();
    },

    syncSize: function(){
        if (this.plugin && !this.maximized && !this.collapsed) {
            Ext.apply(this.plugin, this.getSize());
        }
    },

    syncLocation:function(){
        if (this.plugin && !this.maximized && !this.collapsed) {
            var pos = this.getPosition(local=true);
            Ext.apply(this.plugin, {left: pos[0], top: pos[1]});
        }
    },

    update: function(cfg){
        //update win based on cfg.height, cfg.width, cfg.top, cfg.left and cfg.minimized

        if (cfg.width != null && cfg.height != null)
            this.setSize(parseInt(cfg.width), parseInt(cfg.height));   //setSize fires "resize" event to call syncSize

        if (cfg.top != null && cfg.left != null){
            var container_xy = this.container.getAnchorXY();
            var _x = container_xy[0] + parseInt(cfg.left);
            var _y = container_xy[1] + parseInt(cfg.top);
            this.getPositionEl().moveTo(_x, _y, cfg.animate);
            if (!cfg.animate) this.fireEvent('move', this, _x, _y); // if cfg.animate, callback is defined in cfg.animate.
        }
        if (cfg.minimized && !this.collapsed)
            this.collapse();
        if (cfg.maximized && !this.maximized)
            this.maximize();

    },

    /**
     * return current layoutdata object
     * @return {object} an object with "id", "left", "top", "height", "width" and optional "useroptions".
     */
    getLayoutData: function(){
        //var box = this.getBox(local=true);
        var box = this.plugin.getPositioning();
        var p = {id: this.plugin.id,
                 left: box.left,
                 top: box.top,
                 height: box.height,
                 width: box.width
        };

        if (this.plugin.useroptions){
            p.useroptions = this.plugin.useroptions
        }

        //store currentSpecies in useroptions
        if (this.plugin && this.plugin.runtimeoptions && this.plugin.runtimeoptions.currentSpecies){
            if (!p.useroptions) p.useroptions = {};
            p.useroptions.currentSpecies = this.plugin.runtimeoptions.currentSpecies;
        }

//        if (this.collapsed){
//            if (! p.useroptions) p.useroptions = {};
//            p.useroptions.minimized = this.collapsed;
//        }
//        else if (p.useroptions){
//            delete p.useroptions.minimized;
//        }

//        if (this.maximized){
//            if (! p.useroptions) p.useroptions = {};
//            p.useroptions.maximized = this.maximized;
//        }
//        else if (p.useroptions){
//            delete p.useroptions.maximized;
//        }
        return p;
    },

    toggleFrame: function(){
/*        var win = this.win;
        win.options.showframe = ! win.options.showframe;
        win.options.draggable = win.options.showframe;
        win.options.resizable = win.options.showframe;
        if (win.options.showframe){
            this.setFrameCls();
            win.setTitle(this.plugin.title);
        }
        else {
            this.setClearCls();
            win.setTitle('');
        }*/
    },


    showOptionMenu: function(btn){
        if (!btn.menu){
            //Add qtip to menuitem
            //Ref: https://extjs.com/forum/showthread.php?t=77312 , with minor modifications.
            var reg_tip = function( thisMenu ) {
                thisMenu.tip = new Ext.ToolTip({
                    target: thisMenu.getEl().getAttribute("id"),
                    delegate: ".x-menu-item",
                    trackMouse: true,
                    renderTo: document.body,
                    text: "text",
                    //title: "title",
                    listeners: {
                        beforeshow: function updateTip( tip ) {
                            var menuItem = thisMenu.ownerCt.findById( tip.triggerElement.id );
                            //var menuItem = Ext.getCmp( tip.triggerElement.id );
                            if( !menuItem.initialConfig.qtip ) return false;

                            //tip.header.dom.firstChild.innerHTML = menuItem.initialConfig.qtitle;
                            tip.body.dom.innerHTML = menuItem.initialConfig.qtip;
                        }
                    }
                });
            };

            var om = new Ext.menu.Menu();
            om.add({text: 'Open in browser',
                    qtip: 'Open this plugin in a new browser window',
                    iconCls: 'icon-pagego',
                    handler: function(){window.open(this.url);},
                    scope:this,
                    listeners: {afterrender: reg_tip}
                    });
            om.add({text: 'Plugin details',
                    qtip: 'Show plugin details',
                    iconCls: 'icon-info',
                    handler: function(){this.showInfo(btn);},
                    scope:this,
                    listeners: {afterrender: reg_tip}
                    });
            om.add({text: 'Refresh',
                    iconCls: 'icon-refresh',
                    qtip: 'Refresh this plugin',
                    handler: function(evt, btn){this.refresh();},
                    scope:this,
                    listeners: {afterrender: reg_tip}
                    });
            om.add({text: 'Flag plugin',
                    qtip: 'Flag as broken or inappropriate',
                    iconCls: 'icon-flag',
                    handler: function(){this.flagit();},
                    scope:this,
                    listeners: {afterrender: reg_tip}
                    });
            btn.menu = om;
        }
        btn.menu.show(btn);
    },

    showInfo: function(info_btn){
        var infotpl = new Ext.Template(
        '<table width="100%">',
            '<tr><td class="genesummary_head" colspan="2">Plugin details:<br></td></tr>',
            '<tr><td class="genesummary_name">Title:</td><td class="genesummary_text"><a href="/plugin/{id}/">{title}</a></td></tr>',
            '<tr><td class="genesummary_name">ID:</td><td class="genesummary_text">{id}</td></tr>',
            '<tr><td class="genesummary_name">URL:</td><td class="genesummary_text"><div style="width:100%; overflow:auto;">{realurl}</div></td></tr>',
            '<tr><td class="genesummary_name">URL tpl:</td><td class="genesummary_text"><div style="width:100%; overflow:auto;">[<a href="{url}" target="_blank">mouse over to see</a>]</div></td></tr>',
            '<tr><td class="genesummary_name">Type:</td><td class="genesummary_text">{type}</td></tr>',
            '<tr><td class="genesummary_name">Registered by:</td><td class="genesummary_text"><a href="{author_url}">{author}</a></td></tr>',
            '<tr><td class="genesummary_name">Description:</td><td class="genesummary_text">{description}</td></tr>',
        '</table>'
        ).compile();

        if (this.infopanel){
            this.infopanel.destroy();
            this.infopanel = null;
            return;
        }

        info_btn = info_btn || this.tools.help;

        this.infopanel =    new Ext.Panel({
                            id:this.id+'_infopanel',
                            layout:'fit',
                            floating: true,
                            renderTo: this.el,
                            width: 250,
                            html: infotpl.apply(Ext.apply({realurl: this.url?'[<a href="'+this.url+'" target="_blank">open in a new window</a>]':'NA'}, this.plugin)),
                            frame: true,
                            buttonAlign: 'center',
                            buttons: [{
                                text:'OK',
                                handler: function(){
                                    this.infopanel.destroy();
                                    this.infopanel = null;
                                },
                                scope: this
                            }]
                        });
        this.infopanel.on('show', function(){this.infopanel.el.alignTo(info_btn, 'tr-br', [0, 7]);}, this)
        this.infopanel.show();
    },

//    remove: close,    //aliase to this.close for back-compatibility, should not need after replace remove with close at all other places.
/*    remove2: function(){
        this.close()
        this.removed = true;
    },*/

    sameAs: function(otherp){
        //compare if otherp is the same plugin as self.
        //return ((this.plugin.id == otherp.id) && (this.plugin.options == otherp.options));
        return ((this.plugin.id == otherp.id));
    },

    flagit: function(){
        //flag a plug as inapprapriate content.
        if (this.plugin) {
            this.plugin.showFlagAsInappropriateForm(this.el);
        }
    },

    isOverlapWith: function(portlet_b, d){
        //return true if this portlet is overlap with another portlet_b
        var b1 = this.getBox(local=true);
        var b2 = portlet_b.getBox(local=true);

        if(d) console.log(b1.x+b1.width, b2.x, b1.x+b1.width>b2.x,
                    b2.x+b2.width,b1.x, b2.x+b2.width>b1.x,
                    b1.y+b1.height,b2.y, b1.y+b1.height>b2.y,
                    b2.y+b2.height,b1.y, b2.y+b2.height>b1.y);

        if (((b1.x+b1.width>b2.x && b2.x+b2.width>b1.x) &&
             (b1.y+b1.height>b2.y && b2.y+b2.height>b1.y))){
//        if ( ((b1.x+b1.width>b2.x) && (b1.y+b1.height>b2.y)) ||
//             ((b2.x+b2.width>b1.x) && (b2.y+b2.height>b1.y)) ){
            return true;
        }
        else{
            return false;
        }
    },

    getPositionNextTo: function(portlet_b, width_constrain) {
        //return x,y location next to given portlet, but subject to width_contrain
        var this_box = this.getBox(local=true);
        var last_box = portlet_b.getBox(local=true);

        var _x = last_box.x + last_box.width + 5;
        var _y = last_box.y;
        if (_x + this_box.width>width_constrain){
            _x = 0;
            _y = last_box.y + last_box.height + 5;
        }
        return {x:_x, y:_y};
    },

    renderSpeciesSelector: function(){
        var species_list, species_menu, species_button;
        if (this.plugin){
            species_list = this.plugin.getAvailableSpecies(this.gene, applyuseroptions=true);//  getAllowedSpecies();
            if (species_list.length>0){
                species_menu = new Ext.menu.Menu();
                var _this = this;
                var _id = Math.round(Math.random()*100,0).toString();  //generate a unique id for "group" below.

                var species_menu_labels = {'human': 'H. sapiens (human)',
                                           'mouse': 'M. musculus (mouse)',
                                           'rat': 'R. norvegicus (rat)',
                                           'fruitfly': 'D. melanogaster (fruitfly)',
                                           'nematode': 'C. elegans (nematode)',
                                           'zebrafish': 'D. rerio (zebrafish)',
                                           'thale-cress': 'A. thaliana (thale cress)',
                                           'frog': 'X. tropicalis (frog)',
                                           'pig': 'S. scrofa (pig)'
                                           }

                biogps.AVAILABLE_SPECIES.each(function(s){species_menu.add({
                                                                 text: species_menu_labels[s], // s.capitalize(),
                                                                 value: s,
                                                                 checked: false, //(s == _this.plugin.currentspecies),
                                                                 disabled: species_list.indexOf(s) == -1,
                                                                 group: _id+'_selectedspecies',
                                                                 handler: _this.onSpeciesSwitch,
                                                                 scope: _this
                                                                });});


                species_button = new Ext.Button({text: '', //'&nbsp;&nbsp;&nbsp;&nbsp;',
                                                 menu:species_menu,
                                                 cls: 'x-tool-species'
                                                 });
                species_button.on('click', function(btn){btn.showMenu();});
                species_button.on('mouseover', function(btn){
                    var label_el = Ext.fly(Ext.DomQuery.selectNode('span.x-tool-species-label', btn.getEl().dom));
                    if (label_el){
                        label_el.addClass('x-tool-species-label-over');
                    }
                }, this);
                species_button.on('mouseout', function(btn){
                    var label_el = Ext.fly(Ext.DomQuery.selectNode('span.x-tool-species-label', btn.getEl().dom))
                    if (label_el){
                        label_el.removeClass('x-tool-species-label-over');
                    }
                }, this);
                species_button.render(this.header);
                this.species_menu = species_menu;
                this.species_button = species_button;


            }

        }
    },

    onSpeciesSwitch: function(item, evt){
        if (!item.checked) {
            //no action, if checked species is selected again.
            var current_species = item.value; //item.text.toLowerCase();
            if (this.plugin){
                this.plugin.runtimeoptions = this.plugin.runtimeoptions || {};
                this.plugin.runtimeoptions.currentSpecies = current_species;
                this.loadContent();
                this.fireEvent('speciesswitch', this);
            }
        }
    },

    updateCurrentSpecies: function(){
        if (this.species_button && this.species_menu) {
            var current_species = this.plugin.current_species;
            var species_labels = {'human': '<span class="x-tool-species-label">Species:&nbsp;Hs&nbsp;</span>',
                                  'mouse': '<span class="x-tool-species-label">Species:&nbsp;Mm</span>',
                                  'rat': '<span class="x-tool-species-label">Species:&nbsp;Rn</span>',
                                  'fruitfly': '<span class="x-tool-species-label">Species:&nbsp;Dm</span>',
                                  'nematode': '<span class="x-tool-species-label">Species:&nbsp;Ce</span>',
                                  'zebrafish': '<span class="x-tool-species-label">Species:&nbsp;Dr</span>',
                                  'thale-cress': '<span class="x-tool-species-label">Species:&nbsp;At</span>',
                                  'frog': '<span class="x-tool-species-label">Species:&nbsp;Xt</span>',
                                  'pig': '<span class="x-tool-species-label">Species:&nbsp;Ss</span>'
                                  }

            this.species_button.setText(species_labels[current_species]);
            for (var i=0;i<this.species_menu.items.length;i++){
                var o = this.species_menu.items.get(i);
                o.setChecked(o.value==current_species);
            }
        }
    }

});

Ext.reg('biogpsportlet', biogps.Portlet);


/**
 * @class biogps.GeneReportMgr
 * @extends Ext.util.MixedCollection
 * @singleton
 * This is a singletons manager for all genereport pages rendered on "genereport_panel".<br/>
 * @author Chunlei Wu, Marc Leglise
 */
biogps.GeneReportMgr = Ext.apply(new Ext.util.MixedCollection(), {
    rendered: false,
	populateGeneListPanel: false,

    register : function(){
        for(var i = 0, s; s = arguments[i]; i++){
            this.add(s);
        }
    },

    unregister : function(){
        for(var i = 0, s; s = arguments[i]; i++){
            this.remove(this.lookup(s));
        }
    },

    lookup : function(id){
        return typeof id == "object" ? id : this.get(id);
    },

    getGeneidList: function(){
		var gidlist = [];
		this.each(function(item){gidlist.push(item.geneid);});
		return (gidlist);
    },

    makeTitle: function(){
        //make a title string based on rendered gene report page(s)
        var title = '';
        if (this.length == 1){
            //if only one genereport, use the its title string
            title = this.getReport(0).title;
        }
        else if (this.length > 1){
            //if more than one genereport pages, use concatenated gene symbols
            var gene_list = [];
            this.each(function(item){
//                gene_list.push(item.gene.getEntryGene().Symbol);
                var g = item.gene.getEntryGene();
                if (g)
                    gene_list.push(g.Symbol);
                });
            title = gene_list.join(' , ');
        }
        return (title);
    },

    getReport: function(i){
    	return this.get(i);
    },

    /**
     * @method
     * Collapse all of the PluginQuickAdd widgets to prevent the lists from
     * displaying on top of other elements (like the plugin library).
     */
    collapseQuickLists: function(){
        this.each(function(o){
            o.grp_tbar.quickPluginBox.collapse();
        })
    },

    /**
     * @method
     * Update each biogps.GeneReportPage, passing the 'true' parameter, causing
     * any new plugins in the in-memory layout_data to get rendered, but
     * leaving existing plugins intact.
     */
    updateAll: function(){
        this.each(function(o){
            o.updatePage(true);
        })
    },

    refreshAll: function(){
        if (biogps.centerTab.activeTab.id != 'report_panel'){
            biogps.centerTab.setActiveTab('report_panel');
        }
    	this.each(function(o){
			o.grp_tbar.createLayoutMenu();
		    o.renderPage();
    	});
    },

    /**
     * Refresh genereport page if the current layout is the input layout.
     * @param {Object} layout biogps.Layout object
     */
    refreshLayout: function(layout){
        this.each(function(grp){
            if (grp){
                if (grp.grlayout.layout_id == layout.layout_id){
                    if (biogps.centerTab.activeTab.id == 'report_panel'){
                        //if report_panel is currently active, do the refresh right the way
                        grp.refresh(updateonly=true);
                    }
                    else {
                        //otherwise, set need_refresh flag to do the refresh next time the report_panel tab is activated.
                        grp.need_refresh = true;
                    }
                }
            }
        });
    },

    /**
     * Refresh genereport page if need_refresh flag is set to true and reset the flag.
     */
    refreshMarked: function(){
        this.each(function(grp){
            if (grp && grp.need_refresh){
                grp.refresh(updateonly=true);
                grp.need_refresh = false;
                delete grp.need_refresh;
            }
        });
    },

    removeAll: function(){
        biogps.portletGroup.each(function(p){
            p.close({bypass_confirmation: true, suspend_events: true});
        });
        this.each(function(o){
            o.destroy();
        });
    	this.clear();
    	this.populateGeneListPanel = false;
    },

    markLayoutChanged: function(){
    	this.each(function(o){
    		if(o.grp_tbar)
    			o.grp_tbar.layoutmenu_need_sync = true;
    	});
    },

    bindLayoutMgr: function(){
    	//bind refreshAll to 'layoutloaded' event of biogps.LayoutMgr
    	biogps.clearListeners(biogps.LayoutMgr, 'layoutloaded');
		biogps.LayoutMgr.on('layoutloaded', function(){

			biogps.GeneReportMgr.refreshAll();
		});
    },

    render: function(geneid_list, targetEl){
        if (biogps.LayoutMgr.layoutloading){
			var dt = new Ext.util.DelayedTask();
			dt.delay(100, function(){
			    this.render(geneid_list, targetEl);
			},this);
        }
        else{
            //do the actual rendering of genereport pages for input geneid_list
            this.removeAll();
            this.rendered = false;
    	    if (biogps.genelist_panel.genelist_node && biogps.genelist_panel.genelist_node.childNodes.length==0)
    	        this.populateGeneListPanel = true;
            Ext.fly(targetEl).dom.innerHTML = '';
    	    for (var i=0;i<geneid_list.length;i++){
    	        var page = new biogps.GeneReportPage({geneid: geneid_list[i]});
                page.render(Ext.fly(targetEl).dom);
                this.register(page);
    	    }
    	    this.bindLayoutMgr();

            //check if all genereport pages are rendered.
    		var runner = new Ext.util.TaskRunner();
            var task = {
    		    run: function(cnt){
                    var _all_rendered = true;
                    for (var i=0;i<this.length;i++){
                        var grp = this.getReport(i);
                        if (!(grp && grp.reportRendered)){
                            _all_rendered = false;
                            break;
                        }
                    }
                    if (_all_rendered) {
    			        this.rendered = true;
    			        biogps.Messenger.fireEvent('genereportrendered');
                        runner.stop(task);
                    }
    		    },
                scope: this,
    		    interval: 50
    		}
    		runner.start(task);
		}
    },

    /*
     * add specified plugin to the current layouts on all genereort panels.
     */
    quickAddPlugin_byID: function(plugin_id){
        this.each(function(grp){
            if (grp && grp.grlayout){
            	grp.grlayout.quickAddPlugin_byID(plugin_id);
            }
        });
    },

    /*
     * display given dataset in datachart plugin, add this plugin to each
     * layout page if not rendered yet.
     */
    showDataset: function(dataset_id){
        this.each(function(grp){
            if (grp){
                grp.showDataset(dataset_id);
            }
        });
    }

});

biogps.renderGeneReport = function(containerid, parentid, geneid_list){
    var container = Ext.getCmp(containerid);
    var containerEl = container.getEl();
    var parentcontainer = Ext.getCmp(parentid);

    if (!container){
    	container = Ext.getBody().createChild({tag: 'div', id: containerid});

    	parentcontainer.add({
                    contentEl:containerid,
                    title: 'Gene Report',
                    layout: 'fit',
					closable:true,
                    autoScroll:true
    	});
    	parentcontainer.doLayout();
    	biogps.centerTab.suspendEvents();
    	parentcontainer.setActiveTab(parentcontainer.items.getCount()-1);
    	biogps.centerTab.resumeEvents();
    }
    else{
    	container.enable();
    }

    biogps.centerTab.suspendEvents();    //avoid to fire "tabchange" event
	parentcontainer.setActiveTab(containerid);
	biogps.centerTab.resumeEvents();

    var loadmask = new Ext.LoadMask(parentcontainer.getEl(), {msg: 'Rendering...'});
    loadmask.show();

//    biogps.GeneReportMgr.removeAll();
//    if (biogps.genelist_panel.genelist && biogps.genelist_panel.genelist.childNodes.length==0)
//    	biogps.GeneReportMgr.populateGeneListPanel = true;
//	Ext.fly('reportpanel').dom.innerHTML = '';
//    for (var i=0;i<geneid_list.length;i++){
//
//		var tabs = new biogps.GeneReportTab({geneid: geneid_list[i]});
//		//tabs.render(containerEl.dom);
//		tabs.render(Ext.fly('reportpanel').dom);
//		biogps.GeneReportMgr.register(tabs);
//    }
//    biogps.GeneReportMgr.bindLayoutMgr();

    biogps.GeneReportMgr.render(geneid_list, 'reportpanel');
	loadmask.hide();
	loadmask.destroy();
};

biogps.renderGeneReport2 = function(geneid, calledfromurl){
	//a shortcut for biogps.renderGeneReport
	//calledfromurl set to true when it is called from a deeplinking url.
	calledfromurl = calledfromurl?calledfromurl:false;
	if (isArray(geneid))
		var geneid_list = geneid
	else
	    var geneid_list = [geneid]

	if (!calledfromurl){
		var token = 'goto=genereport&id='+geneid_list.join(',');
		//if (token == biogps.getHash()){
        if (token == Ext.History.getToken()){
			//if token is the same, re-render the genereport without changing the history
			biogps.renderGeneReport('report_panel', 'center_panel', geneid_list);
		}
		else{
			//add token to the history stack, renderGeneReport will be triggered by history "change" event.
			Ext.History.add(token);
		}
	}
	else{
		biogps.renderGeneReport('report_panel', 'center_panel', geneid_list);
	}
}




biogps.GeneReportToolbar = function(config) {
	this.grp = null;
	Ext.apply(this, config);
	//this.layouttext = new Ext.Toolbar.TextItem({text: 'current layout:'});
	this.initLayoutMenu();
	this.initOptionMenu();
	this.geneTitle = new Ext.Toolbar.TextItem({text:' ',cls:'gene-report-title'});
	this.notification = new Ext.Toolbar.TextItem({text:' '});
    this.layout_icon = new Ext.Toolbar.TextItem({text:' '});
	this.quickPluginBox = new biogps.PluginQuickAdd({grp: this.grp});
	biogps.GeneReportToolbar.superclass.constructor.call(this,{
	    cls: 'gene-report-header',
		items: [this.geneTitle,
		        '->',
		        this.notification,
                this.layout_icon,
		        'current layout:', ' ',
		        this.layoutbutton,
		        '|',' ',
		        {text: 'options', menu: this.optionmenu},
		        this.quickPluginBox
		       ]
	});
	this.layoutmenu_need_sync = false;
};
Ext.extend(biogps.GeneReportToolbar, Ext.Toolbar, {

	initLayoutMenu: function(){
		this.layoutmenu = new Ext.menu.Menu();
		this.layoutmenu.on('beforeshow', function(){
			if (this.layoutmenu_need_sync){
				this.createLayoutMenu();
				this.layoutmenu_need_sync = false;
			}
		}, this);

		if (this.grp && this.grp.grlayout && this.grp.grlayout.layout_name){
			var current_layoutname = this.grp.grlayout.layout_name;
		}
		else{
			var current_layoutname = "click to select";
		}

		this.layoutbutton = new Ext.Toolbar.Button({text: String.format('<b>{0}</b>', current_layoutname),
													 menu:this.layoutmenu});
		this.createLayoutMenu();
	},

	initOptionMenu: function(){
//		this.layoutmenu = new Ext.menu.Menu();
//		this.layoutmenu.on('beforeshow', function(){
//			if (biogps.LayoutMgr.layoutmenu_need_sync){
//				this.createLayoutMenu();
//				biogps.LayoutMgr.layoutmenu_need_sync = false;
//			}
//			}, this);
		this.optionmenu = new Ext.menu.Menu({
	        items: [
                {text: 'Tile windows', handler: function(){this.grp.tilePluginWindows('area');}, scope: this},
//                {text: 'Tile windows (index)', handler: function(){this.grp.tilePluginWindows();}, scope: this},
                {text: 'Tile windows (compact)', handler: function(){this.grp.tilePluginWindows_compact();}, scope: this},
//	        	{text:this.grp.showframe?'Hide frame':'Show frame', handler: this.toggleFrame, scope:this},
                {text: 'Open all in browser', handler: function(){this.grp.openAllInBrowser();}, scope: this},
		    	{text: 'Refresh/Revert', handler: function(){this.grp.refresh();}, scope: this},
		        {text: 'Save', id:'lmenu_save', handler: function(){this.grp.saveCurrentLayout();}, scope: this},
		        {text: 'Save as new...', id:'lmenu_saveas', handler: function(){this.grp.saveAsNewLayout();}, scope: this}
//		        '-',
//		        {text: 'Switch', id:'lmenu_switch', menu: this.layoutmenu,
//		         //This a fix for preventing submenu to close when it is clicked
//		         // ref  http://extjs.com/forum/showthread.php?t=14113
//		         handler: function(obj, evt){return false;}
//		        }
	    		]
		});

		this.optionmenu.on('beforeshow', function(){
			if(biogps.usrMgr.is_anonymoususer){
				this.optionmenu.items.get('lmenu_saveas').disable();
			}
			else {
				this.optionmenu.items.get('lmenu_saveas').enable();
			}
            if(biogps.usrMgr.is_anonymoususer || (this.grp && this.grp.grlayout.isSharedLayout())){
                this.optionmenu.items.get('lmenu_save').disable();
            }
            else {
                this.optionmenu.items.get('lmenu_save').enable();
            }

		},this);

//		this.createLayoutMenu();

	},

	createLayoutMenu: function(){
		if (!this.layoutmenu)
			return;

		this.layoutmenu.removeAll();
		this.layoutmenu.add('<b class="menu-title">My layouts:</b>');
		var shared_layouts = []
		var cnt_my_layouts = 0;
        var layout;
		for (var i=0;i<biogps.LayoutMgr.availableLayouts.length;i++){
			layout = biogps.LayoutMgr.availableLayouts[i];
			if (layout.is_shared){
				shared_layouts.push(layout);
			}
			else{
				this.layoutmenu.add({
		                            text: layout.layout_name,
		                            //checked: layout.layout_name==biogps.usrMgr.currentLayout.layout_name,
		                            checked: (biogps.LayoutMgr.currentLayout != null && (layout.id==biogps.LayoutMgr.currentLayout.id)),
		                            value: layout.id,
		                            group: 'selectedlayout',
		                            checkHandler: this.onLayoutSwitch,
		                            scope: this
		                        	});
		        cnt_my_layouts += 1;
			}
		}
		if (cnt_my_layouts == 0){
			this.layoutmenu.add({text: 'you don\'t have any yet', disabled:true});
		}
		if (shared_layouts.length > 0){
			this.layoutmenu.add('<b class="menu-title">Shared layouts:</b>');
			for (var i=0;i<shared_layouts.length;i++){
				layout = shared_layouts[i];
				this.layoutmenu.add({
		                            text: layout.layout_name,
		                            //checked: layout.layout_name==biogps.usrMgr.currentLayout.layout_name,
		                            checked: (biogps.LayoutMgr.currentLayout !=null && layout.id==biogps.LayoutMgr.currentLayout.id),
		                            value: layout.id,
		                            group: 'selectedlayout',
		                            checkHandler: this.onLayoutSwitch,
		                            scope: this
		                        	});
			}
		}
	},

	updateLayoutMenu: function(){
		//refresh biogps.usrMgr.availableLayouts and re-create layoutmenu
		//biogps.usrMgr.loadAllLayout();
        biogps.LayoutMgr.reloadAvailableLayout();
//		biogps.LayoutMgr.on('availablelayoutupdated', function(){
//			biogps.GeneReportMgr.markLayoutChanged();
//		},this);
//		biogps.LayoutMgr.loadAvailableLayout();
	},

	setLayoutName: function(layout_name){
		this.layoutbutton.setText(String.format('<b>{0}</b>', layout_name));
	},

	setGeneTitle: function(title){
	    if (title.length > 60) { title = title.substring(0, 55) + '...' }
	    if (this.geneTitle.rendered){
		  this.geneTitle.setText(title);
        }
        else {
            this.geneTitle.on('render', function(){this.setGeneTitle(title);}, this, {single: true})
        }
	},

	notify: function(text){
        if (text.startsWith('Error')){
            text = '<font color="red">'+text+"</font>";
        }
        if (this.notification.rendered){
		  this.notification.setText(text);
        }
        else {
            this.notification.on('render', function(){this.notify(text);}, this, {single: true})
        }
	},

    setLayoutIcon: function(cls, msg){
        if (this.layout_icon.rendered){
            this.layout_icon.el.addClass(cls);
            Ext.QuickTips.register({target: this.layout_icon.el,
                                    text:msg,
                                    dismissDelay: 0});
        }
        else {
            this.layout_icon.on('render', function(){this.setLayoutIcon(cls, msg);}, this, {single: true})
        }
    },

    removeLayoutIcon: function(cls){
        if (this.layout_icon.rendered){
            this.layout_icon.setText('');
            this.layout_icon.el.removeClass(cls);
            Ext.QuickTips.unregister(this.layout_icon.el);
        }
    },

	onLayoutSwitch: function(item, checked){
		if (checked){
			this.grp.switchLayout(item.value);
		}
	}

});



biogps.GeneReportPage = function(config) {
    this.title='';
	this.gene = null;
	this.geneid = null;
	this.grlayout = biogps.LayoutMgr.currentLayout;
	this.showframe = true;
	Ext.apply(this, config);
	this.id = 'grp_' + this.geneid,
	this.globalPortletIndex = 0;  //used for create unique id for windows class
	this.addEvents({load: true});
	this.portlets = new Array();
    this.reportRendered = false;   //a flag to indicate if a gene report content is rendered.
    this.layout_modified_icon = 'icon-layout-alert';
    this.flag_donotsynclayout = false;
    this.flag_bypassclosecallback = false;

    this.gene = new biogps.Gene({id: this.geneid});

	this.grp_tbar = new biogps.GeneReportToolbar({
		grp: this,
		id: this.id+'_tbar'
	});

	biogps.GeneReportPage.superclass.constructor.call(this, {
        border: true,
        cls: 'gene-report-page',
        autoWidth: true,
        //anchor:"100% 100%",
        //height: "100%",
        height: 100,   //initial value, will be updated later
        deferredRender:true,
        //autoHeight: true,
        //layoutOnTabChange: true,
        //autoScroll:true,
        autoScroll:this.showframe,
        autoEl: true,
        tbar: this.grp_tbar

        //contentEl: "reportpage",
        //layout: 'absolute'
    });

    this.on('render', this.renderPage,this);



    this.store = new Ext.data.JsonStore({
//		url: '/service/getgeneidentifiers/?geneid='+this.geneid+'&format=json',
        url: '/boc/getgeneidentifiers/?geneid='+this.geneid+'&format=json',
		fields: [],
		autoLoad: true
	});

	this.store.on('beforeload', this.showLoading,this);
	this.store.on('load', function(st){
		this.gene = Ext.apply(this.gene, st.reader.jsonData);
		store.set('lastused-gene', this.gene);
		this.addTabs();
		if (biogps.GeneReportMgr.populateGeneListPanel){
			//var _gene = this.gene[this.gene.EntrySpecies];
            var _gene = this.gene.getEntryGene();
			if (_gene){
				var g = {};
				g.id = _gene.EntrezGene || _gene.EnsemblGene
				if (g.id){
				    g.name = _gene.Description || ''
				    g.symbol = _gene.Symbol || ''
				    biogps.genelist_panel.addGene({id: g.id,
   						  						   symbol:g.symbol,
   						                           name:g.name,
        				                           text: g.symbol
    					  						   }, true, true);
				}
			}
		}
	}, this);
	this.store.on('loadexception', biogps.ajaxfailure, this);
};

Ext.extend(biogps.GeneReportPage, Ext.Panel, {
    showLoading: function(){
		this.add({title:'Please wait...', id:'tmp_loading', height:100});
	    this.loadmask = new Ext.LoadMask(this.getEl(), {msg: 'Loading...'});
	    this.loadmask.show()
	},

	removeLoading: function(){
		if (this.loadmask){
			this.loadmask.hide();
	    	this.loadmask.disable();
	    	this.remove('tmp_loading', true);
		}
	},

	addTabs: function(){
		if (this.gene){

		    if (biogps.LayoutMgr.layoutloading){
    			var dt = new Ext.util.DelayedTask();
    			dt.delay(100, function(){
    			    this.addTabs();
    			},this);
            }
            else{
    		    this.removeLoading();
    		    var _gene = this.gene.getEntryGene();
    			var symbol = _gene.Symbol;
    			var description = _gene.Description || 'no description';
    			if (description.length > 100){
    				description = description.substring(0, 96) + '...'
    			}
                var title = String.format("{0} ({1})", (symbol || this.geneid), description);
                this.setTitle(title);
                this.grp_tbar.setGeneTitle(title);
    			this.doLayout();
    		}
		}
    },

    checkLayout: function(){
        //Check layout_data
        if (!this.grlayout){
            this.grp_tbar.notify('Error: This layout is not available! Please select another one using the layout menu on the right side.');
            return false;
        }
        else if (!this.grlayout.layout_data || this.grlayout.layout_data.length == 0){
            this.grp_tbar.notify('Error: This layout does not contain any plugin. Please select another one using the layout menu on the right side.');
            return false;
        }
        return true;

    },

    //private
    setInitialCanvasHeight: function(){
        var plugin;
        var measured_height = 0;
        for (var i=0;i<this.grlayout.layout_data.length;i++){
            plugin = new biogps.Plugin(this.grlayout.layout_data[i]);
            if (plugin.hasPositioning()){
                var _y = parseInt(plugin.top);
                measured_height = Math.max(measured_height, _y + plugin.height);
            }
        }
        this.height =  measured_height + 120;
        this.setCanvasHeight(this.height);
    },

    createNewPortlet: function(plugin) {
        var portlet;
        var firsttime_plugin = !plugin.hasPositioning();
        var winid = 'win_'+this.geneid+'_'+this.globalPortletIndex.toString();
        this.globalPortletIndex++;
        portlet = new biogps.Portlet({id: winid,
                                      plugin: plugin,
                                      gene: this.gene,
                                      x: plugin.left,
                                      y: plugin.top,
                                      width: plugin.width,
                                      height: plugin.height,
                                      renderTo: this.body.id});
        portlet.show();
        portlet.on('resize', this.onPortletResize, this);
        portlet.on('move', this.onPortletMove, this);
        portlet.on('close', this.onPortletRemove, this);
        portlet.on('maximize', this.onPortletToggleMaximize, this);
        portlet.on('restore', this.onPortletToggleMaximize, this);
        portlet.on('speciesswitch', function(p){this.syncLayout();}, this);

        portlet.firsttime = firsttime_plugin;
        return portlet;
    },

    postPageRendered: function(){
        this.updateSize();
        this.grp_tbar.setLayoutName(this.grlayout.layout_name);
        if (this.portlets.length == 0){
            this.grp_tbar.notify('Error: This layout does not contain any plugin.');
            return;
        }
        else {
            this.grp_tbar.notify('');
        }

        //set notification for retired gene id if needed, only applicable for NCBI gene.
        if (this.gene && (!isNaN(parseInt(this.gene.id))) && (this.gene.id != this.gene.EntryGeneID)){
            var msg = String.format('NOTE: you requested a retired gene (ID:{0}), showing the updated record for Gene ID {1}.', this.gene.id, this.gene.EntryGeneID);
            this.body.insertHtml('beforeBegin', '<div class="x-panel-body" style="background:red;color:white;padding: 3px 0 3px 5px;border-bottom-style:none;font-size:11px;font-weight:bold;">'+msg+'</div>')
        }

        this.placeFirstTimePlugin();
        this.reportRendered = true;
        this.flag_donotsynclayout = false;

        if (this.grlayout.layout_modified){
            this.markLayoutModified();
        }
        else {
            this.markLayoutSaved();
        }

        //maximize any portlets marked with "maximized" as true in its options.
        var maximize_task = new Ext.util.DelayedTask(function(){
            this.flag_donotsynclayout = true;
            this.portlets.each(function(p){
                if (p.plugin.useroptions && p.plugin.useroptions.maximized){
                    p.maximize();
                }
            });
            this.flag_donotsynclayout = false;
        }, this);
        maximize_task.delay(500);

        //scroll to top of genereport page.
//        biogps.centerTab.getItem('report_panel').body.scrollChildIntoView(this.body);

        //tracking by Google Analytics
        _gaq.push(['_trackPageview', '/gene/'+this.geneid.toString()]);
        _gaq.push(['_trackEvent', 'BioGPS', 'GeneReport', this.geneid.toString()]);
    },

	renderPage: function(){
	    if (!this.gene.getEntryGene()){
			var dt = new Ext.util.DelayedTask();
			dt.delay(100, function(){
			    this.renderPage();
			},this);
        }
        else{
    		this.cleanPage();
    		this.grlayout = biogps.LayoutMgr.currentLayout;
            if (this.checkLayout() == false) return;

    		this.globalPortletIndex = 0;  //reset it.
    		var plugin;
    		var portlet;
    		var winid;
            this.setInitialCanvasHeight();
    		this.portlets = [];
            var firsttime_plugin = false;  //use to flag a plugin has no positioning parameters yet.
    		for (var i=0;i<this.grlayout.layout_data.length;i++){
    			plugin = new biogps.Plugin(this.grlayout.layout_data[i]);
                portlet = this.createNewPortlet(plugin);
    			this.portlets.push(portlet);
    		}

            this.postPageRendered();
        }
	},

	updatePage:function(fixexist){
        //update portlets with current this.grlayout
        //reuse existing portlets if possible
        //and create new portlets if not existing.
        // if "fixexist" is true, do not move/resize existing portlets based on the new layout_data.

        //if (this.checkLayout() == false) return;
        this.reportRendered = false;
        this.flag_donotsynclayout = true;
		var new_portlets = new Array(),
		    p, j, i,
		    portlet,
		    new_p,
		    winid;
        this.setInitialCanvasHeight();
		for (j=0;j<this.portlets.length;j++){
			delete this.portlets[j].keep_flag;    //clear any possible remaining keep_flag carried from previous layout.
		}

		for (i=0;i<this.grlayout.layout_data.length;i++){
			new_p = new biogps.Plugin(this.grlayout.layout_data[i]);
			new_p.existed_flag = false;
			for (j=0;j<this.portlets.length;j++){
				p = this.portlets[j];
				if (!p.removed && p.sameAs(new_p) && !p.keep_flag){
                    if (!fixexist) {
						//new_p.animate = true;
                        if (!Ext.isIE6){
                            new_p.animate = {duration: 0.35,
                                             callback: function(el){
                                                     this.updateSize();
                                                     var p = Ext.getCmp(el.id);
                                                     p.syncSize();
                                                     p.syncLocation();
                                                 },
                                             scope: this
                                            };
                        }
						p.update(new_p);   //update move/resize the existing portlet, also minimize it if specified.
                        p.loadContent();   //refresh content
                    }
					p.keep_flag = true;  //mark the p, so that it won't be removed
					new_portlets.push(p);
					new_p.existed_flag = true;
					break;

				}
			}
			if (!new_p.existed_flag){
				//then create new porlet
                portlet = this.createNewPortlet(new_p);
				new_portlets.push(portlet);
			}
		}

		//Now cleaning all old portlets don't need any more
		for (j=0;j<this.portlets.length;j++){
			p = this.portlets[j];
			if (!p.keep_flag){
                p.close({bypass_confirmation: true, suspend_events: true});
				p = null;
				delete p;
			}
		}
		this.portlets = new_portlets;

        this.postPageRendered();
	},

	cleanPage: function(){
		for (var j=0;j<this.portlets.length;j++){
            this.portlets[j].close({bypass_confirmation: true, suspend_events: true});
		}
		this.portlets = [];
		this.body.dom.innerHTML = '';
        this.reportRendered = false;
	},


    setCanvasHeight: function(height){
        this.setHeight(height);
        //this.body.setHeight(height);
        //this.ownerCt.body.setHeight(height);
    },

	updateSize: function(){
		//update the size of the portlet container
        var p;
		this.doLayout();
		var measured_height = 0;
		for (var i=0;i<this.portlets.length;i++){
			p = this.portlets[i];
            if (p.removed) continue;
            var bx = p.getBox(local=true);
            if (bx.y==0 && bx.height==0){
                bx = p.plugin.getPositioning();
                bx.y = bx.top;
            }
            measured_height = Math.max(measured_height, bx.y + bx.height);
		}
		measured_height = measured_height + 100;
        this.setCanvasHeight(measured_height);
	},

	onPortletResize: function(portlet){
	    //"Ext.ux.ManagedIFrame.Window" (from miframe.js, which biogps.Portlet
	    // is based on) has a bug to fire "resize event" in IE. When portlet is
	    // initializing, the iframe element will fire multiple "resize" events as well.
	    if (Ext.isIE && portlet.xtype != 'biogpsportlet'){ return; }

	    this.updateSize();
	    this.syncLayout();
	},

	onPortletMove: function(portlet){
	    this.updateSize();
	    this.syncLayout();
	},

    /**
     * This is the callback function triggered after a porlet window is toggled for maximizing,
     * so that the state of maiximizing is remembered.
     * @param {} portlet
     */
    onPortletToggleMaximize: function(portlet){
        this.syncLayout();
    },

    /**
     * This is the callback function triggered after a portlet window is removed.
     * @param {object} portlet
     */
    onPortletRemove: function(portlet){
        if (!this.flag_bypassclosecallback){
            var idx = this.portlets.indexOf(portlet);
            this.portlets.remove(portlet);
            if (this.grlayout.layout_data[idx].id == portlet.plugin.id){
                this.grlayout.layout_data.remove(this.grlayout.layout_data[idx])
            }
            this.updateSize();
            this.syncLayout();
        }
    },


//	customizeLayout: function(){
//		this.portlets.each(function(p) {p.setCustomizable()});
//		this.toggleScrollbar(false);
//		this.showframe = true;
//	},
//
//	fixLayout: function(){
//		this.portlets.each(function(p) {p.setFixed()});
//		this.toggleScrollbar(true);
//		this.showframe = false;
//	},

    /**
     * Refresh current layout.
     * @param {boolean} updateonly  if updateonly is true, use "updatePage" instead of "renderPage" for refreshing.
     */
	refresh: function(updateonly){
		this.reloadLayoutData({refreshRender: true, updateonly: updateonly});
	},

    /**
     * Return a biogps.Layout object with updated layout_data
     * @param {object} cfg: if cfg.positionOnly is true, the layout_data of returned layout
     *                       object contains only position data (ready for layout-saving).
     *                       Otherwise, the layout_data contains full plugin data.
     * @return {biogps.Layout}
     */
	getBiogpsLayout: function(cfg){
	    if (cfg && cfg.positionOnly){
	        this.grlayout.layout_data = this.getLayoutData();
	    }
	    else {
            var layout_data = [];
            for (var i=0;i<this.portlets.length;i++){
                if (!this.portlets[i].removed){
                    layout_data.push(this.portlets[i].plugin);
                }
            }
            this.grlayout.layout_data = layout_data;
        }
        return this.grlayout;
	},

    /**
     * Return layout_data as an array of position data collected from each portlet.
     * @return {array} layout_data
     */
	getLayoutData: function(){
		var layout_data = [];
		for (var i=0;i<this.portlets.length;i++){
			if (!this.portlets[i].removed){
				layout_data.push(this.portlets[i].getLayoutData());
			}
		}
		return layout_data;
	},

    /**
     * Sync biogps.LayoutMgr.currentLayout with the layout_data from the current genereport page
     */
    syncLayout: function(){
        if (!this.flag_donotsynclayout && this.grlayout.id == biogps.LayoutMgr.currentLayout.id){
            biogps.LayoutMgr.currentLayout = this.getBiogpsLayout();
            this.markLayoutModified();
        }
    },

    markLayoutModified: function(){
        var layout_modified_text = 'Layout has been modified.<br /> ';
        if (biogps.usrMgr.is_anonymoususer){
            layout_modified_text += 'You need to login to save the changes.';
        }
        else if (biogps.LayoutMgr.currentLayout.isMyLayout()){
            layout_modified_text += 'To save changes, click "options"-&gt;"Save".'
        }
        else {
            layout_modified_text += 'To save changes, click "options"-&gt;"Save as new..."';
        }
        layout_modified_text += '<br />To revert the changes, click "options"-&gt;"Refresh/Revert".';
        biogps.LayoutMgr.currentLayout.layout_modified = true;
        this.grp_tbar.setLayoutIcon(this.layout_modified_icon, layout_modified_text);
    },

    markLayoutSaved: function(){
        biogps.LayoutMgr.currentLayout.layout_modified = false;
        this.grp_tbar.removeLayoutIcon(this.layout_modified_icon);
    },

	//reloadLayoutData: function(refreshRender, updateonly){
    reloadLayoutData: function(options){
		//reload current this.grLayoutdata and biogps.usrMgr.currentLayout
        //options.updateonly
        //options.refreshRender
		biogps.LayoutMgr.on('currentlayoutloaded', function(){
			biogps.clearListeners(biogps.LayoutMgr, 'currentlayoutloaded');
			this.grlayout = biogps.LayoutMgr.currentLayout;
			if (options && options.refreshRender){
                if (options.updateonly)
                    this.updatePage();
                else
				    this.renderPage();
            }
		}, this);
		biogps.LayoutMgr.loadLayout(this.grlayout.id);

        //reload layout object if exists in biogps.usrMgr.availableLayouts
        var available_layouts = new Ext.util.MixedCollection();
        available_layouts.addAll(biogps.LayoutMgr.availableLayouts);
        var layout = available_layouts.get(this.grlayout.id);
        if (layout) layout.load();
        delete available_layouts;
	},

	saveCurrentLayout: function(cfg){
        //parameters:
        //cfg.saveEmptyLayout:   if true, save empty layout_data without confirmation.
        //cfg.quiet:             if true, no mask msg, no warning/error msg
        cfg = cfg || {};
		if (!this.grlayout || biogps.require_user_logged_in() == false){
			return;
		}
		//var layout_data = this.getLayoutData();
		var layout = this.getBiogpsLayout({positionOnly: true});

        //warn if layout_data are empty
        if (layout.layout_data.length == 0 && !cfg.saveEmptyLayout && !cfg.quiet){
	        var cancel_saving = false;
	        Ext.MessageBox.confirm('Save an empty Layout?',
	                               String.format('The layout "{0}" you are trying to save does not contain any plugin. Click "Yes" to save it anyway?', layout.layout_name),
	                               function(btn){
	                                    if (btn == 'yes'){
	                                        this.saveCurrentLayout({saveEmptyLayout: true});
	                                    }
	                               },
	                               this
	        );
            return;
        }

		layout.on('saved', function(data){
			this.reloadLayoutData();
            this.markLayoutSaved();
            if (!cfg.quiet){
            	this.body.unmask();
            	this.body.mask(String.format('Layout "{0}" saved!', biogps.LayoutMgr.currentLayout.layout_name));

    			var _body = this.body;
            	setTimeout(function(){
            		_body.unmask();
            		}, 1000);
            }

		},this);
		layout.on('savefailed', function(data){
            if (cfg.quiet) return;
			if (data.error == "Layout does not exist."){
				var x = Ext.MessageBox.confirm('Save as a new Layout?',
		                       String.format('The layout "{0}" you are trying to save does not exist (likely this is a shared layout from others), but you can save a copy of this layout to your profile. Continue?', biogps.LayoutMgr.currentLayout.layout_name),
		                       function(btn){
									if (btn == 'yes'){
										this.saveAsNewLayout();
									}
		                       },
		                       this
				);
			}
			else{
        		Ext.MessageBox.alert('Error', String.format('Saving Layout failed with the error message: <br><br>"{0}"', (data.error || '[None]')));
			}
        	this.body.unmask();
		}, this);

		layout.save();

	},

	saveAsNewLayout: function(asnew){
		if (!this.grlayout || biogps.require_user_logged_in() == false){
			return;
		}
		var layout_data = this.getLayoutData();

		biogps.layoutsavewin = new Ext.Window({
				title:'Save current layout',
				layout: 'fit',
				width: 320,
				labelWidth: 200,
				modal: true,
				autoHeight: true,
				stateful: false,
				plain: true,
				grp: this,
				listeners: {show:   {buffer : 10,
									 fn: function(win){
									 	win.items.get(0).items.get(0).focus();
			            				//bind Enter hotkey
										var kmap = new Ext.KeyMap(win.getEl(),[{
											key: 13,   //Enter key
											stopEvent: true,
											fn: doLayoutSave,
											scope: this.grp
										},{
											key: 27,   //ESC key
											stopEvent: true,
											fn:function(){
					            				biogps.layoutsavewin.close();
					            				delete biogps.layoutsavewin;
					            			}
										}]
										);
									}}
							},
				items: new Ext.FormPanel({
				    id:'layoutsaveform',
					labelWidth: 120,
					autoHeight: true,
					bodyStyle:'padding:5px 5px 5px 5px',
					border : false,
					items:[{xtype:'textfield',
							anchor: "90%",
		                	fieldLabel: "Name your layout",
		                	id:'layoutsaveform_name',
		                	name: 'layout_name',
		                	allowBlank:false}],
					buttons: [{
					            text:'Save',
					            handler: doLayoutSave,
					            scope:this
					          },{
					            text: 'Cancel',
					            handler: function(){
					            			biogps.layoutsavewin.close();
				            				delete biogps.layoutsavewin;
					            		 }
					          }]
					})
		});
		biogps.layoutsavewin.show(this.grp_tbar.optionmenu.el);
		biogps.layoutsavewin.focus();

		function doLayoutSave(){
		   if (!(Ext.getCmp('layoutsaveform_name').isValid())){
	             Ext.MessageBox.show({
	                title:'Error',
	                msg: 'Missing or wrong input layout name! Correct and try again.',
	                buttons: Ext.Msg.OK,
	                icon: Ext.MessageBox.ERROR
	            });
	            Ext.getCmp('layoutsaveform').form.reset();
		   }
		   else {

		   	   biogps.layoutsavewin.body.mask('Saving layout...');
		       Ext.getCmp('layoutsaveform').getForm().submit({
		        url:'/layout/add/',
		        params: {layout_data: Ext.util.JSON.encode(layout_data),
		        		 //permission: this.grlayout.permission,
		        		 description: this.grlayout.description},
		        method:'POST',
		        scope: this,
		        success: function(form, action){
		        	if(action.result.success){
		        		var layoutname = Ext.getCmp('layoutsaveform_name').getValue()
			        	biogps.layoutsavewin.body.unmask();
			        	biogps.layoutsavewin.body.mask(String.format('Layout "{0}" saved!', layoutname));
			        	this.grp_tbar.updateLayoutMenu();
			        	var layout_id = action.result.layout_id;
			        	this.switchLayout(layout_id);

			        	setTimeout(function(){
			        		biogps.layoutsavewin.body.unmask();
			        		biogps.layoutsavewin.close();
			        		}, 1000);
		        	}
		        	else{
			        	 biogps.layoutsavewin.body.unmask();
			        	 biogps.formfailure(action,
			        	                    'Saving Layout failed! Try again.',  //errmsg
			        	                    function(){                         //onclose
	        	                    			if (biogps.layoutsavewin)
	                								biogps.layoutsavewin.items.get(0).form.reset();
	                								biogps.layoutsavewin.items.get(0).items.get(0).focus();
			                			     });
		        	}
		        },
		        failure: function(form, action){
		        	 biogps.layoutsavewin.body.unmask();
		        	 biogps.formfailure(action,
		        	                    'Saving Layout failed! Try again.',      //errmsg
		        	                    function(){                             //onclose
                							Ext.getCmp('layoutsaveform').form.reset();
                							Ext.getCmp('layoutsaveform').items.get(0).focus();
                						});

		        }
		 	  });
		   }
		};

	},

	onLayoutSwitch: function(item, checked){
		if (checked){
			this.switchLayout(item.value);
		}
	},

	switchLayout: function(layoutid){
		biogps.LayoutMgr.on('currentlayoutloaded', function(){
			biogps.clearListeners(biogps.LayoutMgr, 'currentlayoutloaded');
			this.grlayout = biogps.LayoutMgr.currentLayout;
			this.updatePage();
		}, this);
		biogps.LayoutMgr.loadLayout(layoutid);
		//Now save current selected layout as the default one in user profile.
		biogps.usrMgr.profile.defaultlayout = layoutid;
		if (biogps.usrMgr.is_anonymoususer){
		    store.set('defaultlayoutid', layoutid);
		}
		else {
			biogps.usrMgr.saveUserProfile();
		}
	},

    placeFirstTimePlugin: function(){
        //place first time plugins (missing positioning parameters) into proper position
        var max_height = this.body.getHeight();
        var cnt_firsttime = 0;
        for (var i=0;i<this.portlets.length;i++){
            if(this.portlets[i].firsttime){
                max_height += this.portlets[i].getBox(true).height;
                cnt_firsttime += 1;
            }
        }
        if (cnt_firsttime == this.portlets.length){
            this.tilePluginWindows();
            //clean up firsttime flag
            for (var i=0;i<this.portlets.length;i++){
                this.portlets[i].firsttime = false;
            }
        }
        else {
            this.setCanvasHeight(max_height);
	        var body_width = this.body.getWidth();
	        for (var i=0;i<this.portlets.length;i++){
	            if (this.portlets[i].firsttime){
		            for (var j=0;j<this.portlets.length;j++){
	                    if(!this.portlets[j].firsttime){
	                        var pos = this.portlets[i].getPositionNextTo(this.portlets[j], body_width);
	                        this.portlets[i].update({top:pos.y, left:pos.x});
	                        //now check if this new pos overlapping with existing ones.
	                        var flag_overlapped = false;
	                        for (var k=0;k<this.portlets.length;k++){
	                            if(j!=k && !this.portlets[k].firsttime && this.portlets[i].isOverlapWith(this.portlets[k])){
	                                flag_overlapped = true;
                                    break;
	                            }
	                        }
	                        if (!flag_overlapped) {
	                            //if no overlapping, we are done now.
                                this.portlets[i].firsttime = false;
	                            break;
	                        }
	                    }
		            }
	            }
	        }
	        this.updateSize();
        }
        if (cnt_firsttime>0){
            //save current layout quietly
            //This really should be called after all Portlet movements are done.
            //But it is hard to track all portlets, so we just save the layout ("quietly") after
            //2s automatically, which should give enough time for all movement to finish.
            var save_task = new Ext.util.DelayedTask(function(){
                this.saveCurrentLayout({quiet: true});
            }, this);
            save_task.delay(2000);
        }
    },

    tilePluginWindows_compact: function(order){
        //Try to move overlapping plugin windows to empty area of the canvas.
        //   "order": the order of windows is based on
        //                  "area"
        //                 "index"
        var w = 350;
        var h = 250;
        for (var i=0;i<this.portlets.length;i++){
            this.portlets[i].update({width:w, height:h});
        }

        this.setCanvasHeight(h*this.portlets.length);


        this.portlets[0].update({top:0, left:0});
        var body_width = this.body.getWidth();
        var pos;
        for (var i=1;i<this.portlets.length;i++){
            pos = this.portlets[i].getPositionNextTo(this.portlets[i-1], body_width);
            this.portlets[i].update({top:pos.y, left:pos.x});
        }
        this.updateSize();
    },


    tilePluginWindows: function(order){
        //Try to move overlapping plugin windows to empty area of the canvas.
        //   "order": the order of windows is based on
        //                  "area"
        //                 "index"

        var max_height = 0;
        for (var i=0;i<this.portlets.length;i++){
            max_height += this.portlets[i].getBox().height;
        }
        this.setCanvasHeight(max_height);

        var order_list = [];    //a list of portlet index in order.
        if (order == 'area'){
            var x = [];
            var b;
	        for (var i=0;i<this.portlets.length;i++){
	            b = this.portlets[i].getBox();
                x.push([-1*b.width*b.height, i, this.portlets[i].plugin.title]);

	        }
            x=x.sort(function(a, b){ return (a[0]-b[0]); });

            for (var i=0;i<x.length;i++){
                order_list.push(x[i][1]);
            }
        }
        else {
            for (var i=0;i<this.portlets.length;i++){
                order_list.push(i);
            }
        }

        this.portlets[order_list[0]].update({top:0, left:0});
        var body_width = this.body.getWidth();
        var pos;
        var j;
        for (var i=1;i<order_list.length;i++){
            j = order_list[i];
            pos = this.portlets[order_list[i]].getPositionNextTo(this.portlets[order_list[i-1]], body_width);
            this.portlets[order_list[i]].update({top:pos.y, left:pos.x});
        }
        this.updateSize();
    },

    /**
     * Open all plugins in seperate browser windows/tabs.
     */
    openAllInBrowser: function(noconfirm){
        var p;
        if (!noconfirm && this.portlets.length>=3){
            Ext.MessageBox.confirm('Confirmation',
                   String.format('You are about to open {0} plugins in separate browser windows or tabs. Click "Yes" to continue.', this.portlets.length),
                   function(btn){
                        if (btn == 'yes'){
                            this.openAllInBrowser(true)
                        }
                   },
                   this);
        }
        else{
            for (var i=0;i<this.portlets.length;i++){
                p = this.portlets[i];
                if (p.url) window.open(p.url);
            }
        }
    },


    /**
     * Display specific dataset in datachart plugin, add the plugin to the current layout
     * if it's not included.
     */
    showDataset: function(dataset_id){
        if (dataset_id){
            var DATACHART_PLUGIN_ID = 9;  // hard-coded datachart plugin id
            //Check if datachart plugin is in this layout already.
            var datachart_portlet = null;
            this.portlets.forEach(function(portlet){
                if (portlet.plugin.id == DATACHART_PLUGIN_ID) {
                    datachart_portlet = portlet;
                }
            });
            if (datachart_portlet == null){
                //Need to add datachart plugin to current layout
                var p = new biogps.Plugin({id: DATACHART_PLUGIN_ID});
                p.on('load', function(p){
                    p.url += '&show_dataset='+dataset_id;
                    //setting default position/dimension
                    Ext.apply(p, {top: Math.round(Math.random()*225),
                                  left: Math.round(Math.random()*400),
                                  width: 350*2,
                                  height: 750});
                    this.grlayout.layout_data.push(p);
                    this.updatePage(true);
                }, this);
                p.on('loadfailed', function(pid){
                    biogps.error(String.format('Failed to load plugin by id "{0}".', pid));
                }, this);
                p.load();
            }else{
                //reload datachart plugin with given dataset_id passed.
                var orig_url = datachart_portlet.orig_url;
                if (!orig_url) {
                    orig_url = datachart_portlet.plugin.url;
                    datachart_portlet.orig_url = orig_url;
                }
                datachart_portlet.plugin.url = orig_url + '&show_dataset='+dataset_id;
                datachart_portlet.loadContent();
            }
        }
    }



});

Ext.reg('grpage', biogps.GeneReportPage);

/*
biogps.ChartPanel = function(geneid, species, showtitle) {
	this.geneid = geneid;
	this.species = species;
	this.showTitle = showtitle;
	this.chartlist = new Ext.data.JsonStore({
			//url: '/service/getchartlist?sessionid='+biogps.sessionid+'&geneid='+this.geneid+'&format=json',
			url: '/service/getchartlist?geneid='+this.geneid+'&format=json',
			id: "datasetid",
			fields: [//{name: 'name', type: "string"},
				 	 {name: 'datasetdesc', type: "string"},
					 {name: 'datasetname', type: "string"},
					 {name: 'datasetid', type: "string"},
					 {name: 'datatypeid', type: "string"},
					 {name: 'rootnodeid', type: "string"}],
			autoLoad: true
		});
	this.chartlist.on('load', this.initSelector, this)
	this.chartlist.on('loadexception', biogps.ajaxfailure, this)

	this.selector = new Ext.form.ComboBox({
			id: 'chartselector_' + this.geneid,
            fieldLabel: 'Select data set',
            labelAlign: 'top', //'left',
            store: this.chartlist,
            //autoWidth: true,
            width: 200,
            listWidth:200,
            resizable: true,
            displayField:'datasetdesc',
            valueField: 'datasetid',
            name:'chartdata',
            //listeners: {change: this.updateChart},
            //value: 'Mb',
            typeAhead: false,
            //emptyText: 'Loading chart data...',
            mode: 'local',
            triggerAction: 'all',
            editable: false,
            //allowBlank: false,
            forceSelection: true,
            selectOnFocus:true
	});
	this.selector.on('select', this.onChartSelected, this);

	this.chart = new Ext.Panel({
			id: 'chart_' + this.geneid,
            //html: '<img src="/assets/js/ext-2.0.1/resources/images/default/shared/loading-balls.gif">',
            hideLabel: true
	});


	biogps.ChartPanel.superclass.constructor.call(this, {
		title: this.showTitle? 'DataChart':'',
		id:'chartpanel_'+this.geneid,
		collapsible: true,
		border: false,
		layout: 'form',
		items: [this.selector,
				this.chart]

	});
};
Ext.extend(biogps.ChartPanel, Ext.Panel, {
	initSelector: function(){
		if (this.chartlist.getCount() == 0){
			this.selector.setValue("No data available");
			this.selector.disable();
		}
		else {
			//set the initial chart to GeneAtlas, the first one otherwise.
			if ((this.species.toLowerCase() == 'human') && (this.chartlist.find('datasetdesc', 'GeneAtlas U133A, gcRMA') != -1)) {
				this.selector.setValue(this.chartlist.getAt(this.chartlist.find('datasetdesc', 'GeneAtlas U133A, gcRMA')).data.datasetid);
			}
			else if ((this.species.toLowerCase() == 'mouse') && (this.chartlist.find('datasetdesc', 'GeneAtlas MOE430, gcRMA') != -1)) {
				this.selector.setValue(this.chartlist.getAt(this.chartlist.find('datasetdesc', 'GeneAtlas MOE430, gcRMA')).data.datasetid);
			}
			else{
				this.selector.setValue(this.chartlist.getAt(0).data.datasetid);
			}
			this.onChartSelected();
		}
		//this.selector.doLayout();
	},

	onChartSelected: function(){
		//console.log('data selected!' + this.selector.value);
		Ext.get('chart_'+this.geneid).dom.innerHTML = '<img src="/assets/js/ext/resources/images/default/shared/loading-balls.gif"><span class="labelsmall">Loading chart...</span>';
		var chartdata = this.chartlist.getById(this.selector.value);
		if (chartdata)
			chartdata = chartdata.data;
		this.charturl_store = new Ext.data.JsonStore({
				//url: '/service/getcharturl?sessionid='+biogps.sessionid+'&index='+this.selector.value+'&format=json',
				//url: '/service/getcharturl?index='+this.selector.value+'&format=json',
				//url: String.format('/service/getcharturl?dataset={0}&datatypeid={1}&rootnodeid={2}&format=json', chartdata.datasetname, chartdata.datatypeid, chartdata.rootnodeid),
				url: String.format('/service/getcharturl?dataset={0}&datatypeid={1}&geneid={2}&format=json', chartdata.datasetname, chartdata.datatypeid, this.geneid),
				fields: [{name: 'thumbnail', type: "string"},
	                     {name: 'fullsizechart', type: "string"}],
				autoLoad: true
			});
		this.charturl_store.on('load', this.updateChart, this);
		this.charturl_store.on('loadexception', biogps.ajaxfailure, this);
	},

	updateChart: function(store){
		var charthtml = '';
		var r = Math.ceil(Math.random()*1000);
		for (var i=0; i<store.getCount(); i++){
			//charthtml += '<a href="' + store.getAt(i).data.fullsizechart + '" onmouseover="window.CB_Init();window.status=\'\';return true" rel="clearbox[chartset' + r.toString() + ']" title="Chart">' +
//			charthtml += '<a href="' + store.getAt(i).data.fullsizechart + '" rel="clearbox[chartset' + r.toString() + ']" title="Chart">' +
//					 	 '<img src="' + store.getAt(i).data.thumbnail + '"></a>';

//			charthtml += '<a href="http://biogps-dev.gnf.org/assets/img/test.html"' + '" rel="clearbox(" title="Chart">' +
//					 	 '<img src="' + store.getAt(i).data.thumbnail + '"></a>';

			charthtml += String.format('<a href="/utils/showchart?url={0}" rel="clearbox(580,750,click)" title="Chart"><img src="{1}"></a>',
									   store.getAt(i).data.fullsizechart,
									   store.getAt(i).data.thumbnail);
		}
		if (Ext.fly('chart_'+this.geneid))
			Ext.fly('chart_'+this.geneid).dom.innerHTML = charthtml;

		initLightbox();
		//Lightbox.init.bind(Lightbox)
	}

});

*/
