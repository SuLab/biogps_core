biogps.Layout = function(config) {
	this.id = '';
	this.layout_name = '';
	this.author ='';
	this.description = '';
	this.created = '';
	this.lastmodified = '';
	this.layout_data = [];

	Ext.apply(this, config);
	biogps.Layout.superclass.constructor.call(this);
	this.addEvents({beforeload: true,
					load: true,
					loadfailed: true,
					saved: true,
					savefailed: true,
					'delete':  true,
				    deletefailed: true,
				    pluginadded: true,
				    pluginaddfailed: true
					});

    this.layout_modified = false;         // a flag to indicate layout_data is modified and un-saved.

};
Ext.extend(biogps.Layout, Ext.util.Observable, {
	load: function(id, loadplugin){
		//load layout object from remote service
		id = id || this.id;
		loadplugin = loadplugin?1:0;
		if (id){
			this.fireEvent('beforeload');
			biogps.callRemoteService({url: String.format('/layout/{0}/?loadplugin={1}', id, loadplugin),
			                         fn: function(st){
											if (st.reader.jsonData.totalCount != 1){
				                         		this.fireEvent('loadfailed', id);
				                         	}
				                         	else{
												var layout = st.reader.jsonData.items[0].fields;
												layout.id = st.reader.jsonData.items[0].pk;
												if (isString(layout.layout_data))
													layout.layout_data = Ext.util.JSON.decode(layout.layout_data);

					                         	Ext.apply(this, layout);
					                         	this.fireEvent('load', this);
				                         	}
			                         	},
			                         scope:this});
		}
	},



	isMyLayout: function(){
		return !this.isSharedLayout();
	},

	isSharedLayout: function(){
		return (this.is_shared == true);
	},

	isDefault: function(){
		return (this.layout_id == biogps.usrMgr.profile.defaultlayout);
	},

	save: function(){
		var params = {layout_id: this.id,
				  layout_name: this.layout_name,
				  description: this.description,
		          layout_data: Ext.util.JSON.encode(this.layout_data)};
		var st = new Ext.data.JsonStore({
				url: '/layout/update/',
				baseParams: params,
				method: 'POST',
				fields:[],
				autoLoad: true
			});
		st.on('load', function(){
			var data = st.reader.jsonData;
			if (data.success){
				this.fireEvent('saved', data);
			}
			else{
				this.fireEvent('savefailed', data);
			}

		}, this);
		st.on('loadexception', biogps.ajaxfailure, this);
	},

	saveas:function(newname){
		var params = {layout_name: newname || this.layout_name,
				  description: this.description,
		          layout_data: Ext.util.JSON.encode(this.layout_data)};
		var st = new Ext.data.JsonStore({
				url: '/layout/add/',
				baseParams: params,
				method: 'POST',
				fields:[],
				autoLoad: true
			});
		st.on('load', function(){
			var data = st.reader.jsonData;
			if (data.success){
				this.fireEvent('saved', data);
			}
			else{
				this.fireEvent('savefailed', data);
			}

		}, this);
		st.on('loadexception', biogps.ajaxfailure, this);
	},

	'delete': function(){
		var st = new Ext.data.JsonStore({
				url: '/layout/delete/',
				baseParams: {'layout_id': this.id},
				method: 'POST',
				fields:[],
				autoLoad: true
			});
		st.on('load', function(st){
				var data = st.reader.jsonData;
				if (data.success){
					this.fireEvent('deleted', this);
				}
				else{
					this.fireEvent('deletefailed', data);
				}
			},this);
		st.on('loadexception', biogps.ajaxfailure, this);
	},

	addPlugin: function(plugin){
		if(isArray(this.layout_data)){
			this.layout_data.push({id: plugin.id});
		}
		this.on('saved', function(){
			this.fireEvent('pluginadded');
		},this);
		this.on('savefailed', function(){
			this.fireEvent('pluginaddfailed');
		},this);
		this.save();
	},

	/**
	 * Adds the given plugin to the in-memory copy of this layout, and tells
	 * the GeneReportMgr to update the rendered version.
	 * @method
	 * @param {object} plugin biogps.Plugin object to add to this layout
	 */
	quickAddPlugin: function(plugin){
        // Pick some default coordinates appropriate for 1024x768 or larger screens
	    var top = Math.round(Math.random()*225),
	        left = Math.round(Math.random()*400),
    	    // Extract only the plugin properties we need for the layout_data.
	        new_plugin = {
    	        id: plugin.id,
    	        author: plugin.author,
    	        author_url: plugin.author_url,
    	        title: plugin.title,
    	        url: plugin.url,
    	        type: plugin.type,
    	        species: plugin.species,
    	        options: plugin.options,
    	        description: plugin.description,
    	        lastmodified: plugin.lastmodified,
    	        top: top,
    	        left: left,
    	        // Assign the default H/W or else the coords above will be ignored
    	        width: 350*2,
    	        height: 250
    	    };

	    if(isArray(this.layout_data)){
	        // Push the new object onto the layout
	        this.layout_data.push(new_plugin);
	    }
        this.layout_modified = true;
	    biogps.GeneReportMgr.updateAll();
	},
    /**
     * Similar to quickAddPlugin, but input parameter is just a plugin id, then an ajax call will get plugin
     * object and then call quickAddPlugin to add it to genereport layout.
     * @method
     * @param {integer} plugin_id
     */
    quickAddPlugin_byID: function(plugin_id){
        var p = new biogps.Plugin({id: plugin_id});
        p.on('load', function(p){
            this.quickAddPlugin(p)
        }, this);
        p.on('loadfailed', function(pid){
            biogps.error(String.format('Failed to load plugin by id "{0}".', pid));
        }, this);
        p.load();
    }

});

biogps.LayoutMgr = function(config) {
	this.currentLayout = null;
	this.availableLayouts = null;
	this.currentLayoutLoaded = false;
	this.availableLayoutsLoaded = false;
	this.layoutloading = false          //use to indicate the layout is currently loading

	this.layoutchanged = false;         //use to mark layout data are changed externally, so that loadAllLayout need to be called.
	//this.layoutmenu_need_sync = false;  //move this to genereportpage
	this.defaultlayout_for_anonymoususer = 83;

	this.addEvents({currentlayoutloaded: true});
	this.addEvents({currentlayoutloadingfailed: true});
	this.addEvents({availablelayoutupdated:true});
	this.addEvents({layoutloaded:true});    //fire when both currentLayout and availableLayouts are loaded

	//this.on('layoutloaded', function(){biogps.GeneReportMgr.refreshAll();});

};
Ext.extend(biogps.LayoutMgr, Ext.util.Observable, {
	loadLayout: function(layoutid){
		var layout = new biogps.Layout({id:layoutid});
		layout.on('load', function(){
			this.currentLayout=layout;
			this.currentLayoutLoaded = true;
			this.fireEvent('currentlayoutloaded');
		},this);
		layout.on('loadfailed', function(layout_id){
		/*
        	Ext.MessageBox.show({ title: 'Layout loading failed',
				  msg: String.format('The layout you are loading (ID: {0}) is not available for you, either you have deleted it already or you don\'t have the privilege to access it.<br /><br />Click "OK" to use the first available Layout instead.', layout_id),
//				  msg: String.format('The default layout you are loading (ID: {0}) is not available for you, either you have deleted it already or you don\'t have the privilege to access it.', layout_id),
				  buttons: Ext.Msg.OK,
				  icon: Ext.MessageBox.ERROR,
				  fn: function(){
        			  layout.load('first', loadplugin=true);
        			}
        	}); */
			//Bypassing the error-handling here, it will be handled by biogps.GeneReportPage later
			this.currentLayoutLoaded = true;
			this.fireEvent('currentlayoutloaded');
        	//this.fireEvent('currentlayoutloadingfailed', layoutid);

		}, this);
		this.currentLayoutLoaded = false;
		//layout.load(layoutid, loadplugin=true);
        layout.load(layoutid, true);
	},

	loadAvailableLayout: function(){
		//load available layouts for current user
	    var st = new Ext.data.Store({
	        proxy: new Ext.data.HttpProxy({
				//url: '/layout/all/',
				url: '/layoutlist/all/?userselected=1',
	            method: 'GET'
	        }),
			autoload: true,
	        reader: new Ext.data.JsonReader({
				id: 'pk',
				root: 'items',   //needed for '/layoutlist/all'
				fields: [{name: 'layout_name', mapping: 'fields.layout_name', type: "string"},
						 {name: 'layout_data', mapping: 'fields.layout_data'},
	                     {name: 'author', mapping: 'fields.author', type: "string"},
	                     {name: 'author_url', mapping: 'fields.author_url', type: "string"},
	                     {name: 'description', mapping: 'fields.description', type: "string"},
	                     {name: 'is_shared', mapping: 'fields.is_shared', type: "boolean"},
	                     {name: 'lastmodified', mapping: 'fields.lastmodified', type: "date", dateFormat: 'Y-m-d H:i:s'},
	                     {name: 'created', mapping: 'fields.created', type: "date", dateFormat: 'Y-m-d H:i:s'}]
	        })
	    });

		st.setDefaultSort('layout_name', 'desc')
		st.on('load', function(st){
			var availableLayouts = [];
			var _layout;
			for (var i=0; i<st.getCount();i++){
				_layout = new biogps.Layout(st.getAt(i).data);
				if(isString(_layout.layout_data))
					_layout.layout_data = Ext.decode(_layout.layout_data);
				availableLayouts.push(_layout);
				availableLayouts[i].id = st.getAt(i).id;
			}
			this.availableLayouts = availableLayouts;
			this.availableLayoutsLoaded = true;
			//this.layoutmenu_need_sync = true;
			//biogps.GeneReportMgr.refreshAll();
			this.fireEvent('availablelayoutupdated');


//			if ((this.availableLayouts != null) && (this.currentLayout != null))
//				this.fireEvent('layoutloaded');
			}, this);
		st.on('loadexception', biogps.ajaxfailure, this);
		this.availableLayoutsLoaded = false;
		st.load();
	},

	//loadAllLayout: function(current_layout_id, noEventFired){
	loadAllLayout: function(args){
	   //args supports layout_id and noEventFired
	   if (args && args.layout_id)
			var current_layout_id = args.layout_id
	   else
	        var current_layout_id = biogps.usrMgr.profile.defaultlayout;
	   this.layoutloading = true;
		this.on('currentlayoutloaded', function(){
			if (this.availableLayoutsLoaded){
				this.layoutchanged = false;
				this.layoutloading = false;
				if (!(args && args.noEventFired))
					this.fireEvent('layoutloaded');
			}
			biogps.clearListeners(this, 'currentlayoutloaded');
		},this)
		this.on('availablelayoutupdated', function(){
			if (this.currentLayoutLoaded){
				this.layoutchanged = false;
				this.layoutloading = false;
				if (!(args && args.noEventFired))
					this.fireEvent('layoutloaded');
			}
			biogps.clearListeners(this, 'availablelayoutupdated');
		},this)

		this.loadLayout(current_layout_id);
		this.loadAvailableLayout();
	},

    reloadAvailableLayout: function(){
        var fn = function(){
            biogps.GeneReportMgr.markLayoutChanged();
            this.un('availablelayoutupdated', fn);
        };
        this.on('availablelayoutupdated', fn, this);
        this.loadAvailableLayout();
    },

	createNewLayout: function(){

	}
});
biogps.LayoutMgr = new biogps.LayoutMgr();
