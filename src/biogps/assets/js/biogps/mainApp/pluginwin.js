biogps.pluginwin = null;

biogps.initPluginWin = function(){

	var plugin_link = Ext.get('myplugins');
	plugin_link.on('click', function(evt){
		evt.stopEvent();
		if (biogps.require_user_logged_in() == false){
			biogps.pluginwin = null;
			return;
		}
		else if (!biogps.pluginwin){
			var win = {
				id:'pluginwin',
				//title: 'Customize your BioGPS experience',
				title: 'Layout Manager',
				stateful: true,
				closable:true,
				//collapsible:true,
				maximizable:true,
				//minimizable:true,
				width:750,
				height:600,
				//plain:true,
				//closeAction: 'hide',
				modal: true,
				resizable: true,
				border: false,
				layout: 'fit',
				items : [new biogps.LayoutPanel()]
//				items: [ new Ext.TabPanel({
//					id: 'plugintab',
//					activeTab: 0,
//					border: false,
//					deferredRender: true,
//					layoutOnTabChange: true,
//					//plain: true,
////					autoHeight: true,
//					border: false,
//					listeners: {tabchange: function(tab, panel){
//										var tree;
//										if (panel.id == 'layoutpanel'){
//											tree = Ext.getCmp('layouttree2');
//										}
//										else if (panel.id == 'pluginpanel'){
//											tree = Ext.getCmp('layouttree');
//										}
//										if (tree && tree.treeneedreload){
//											tree.root.reload();
//											tree.treeneedreload = false;
//										}
//									},
//								scope: this},
//					items: [
//						//new biogps.PluginPanel(),
//						new biogps.LayoutPanel()
//					]})
//					]
				};

			biogps.pluginwin = new Ext.Window(win);
		}
//		biogps.pluginwin.on('render', function(){Ext.getCmp('plugingrid').loadData();}, this);
		biogps.pluginwin.on('destroy', function(){
			biogps.pluginwin=null;
			var win;
			for (var i=0;i<Windows.windows.length;i++){
				win = Windows.windows[i];
				if (win.getId().startsWith('preview')){
					win.close();
				}
			}
			if (biogps.LayoutMgr.layoutchanged)
				biogps.LayoutMgr.loadAllLayout();		//update biogps.usrMgr.availableLayouts

			}, this);

		biogps.pluginwin.show(Ext.get(plugin_link))
		biogps.pluginwin.focus();
	},this);
};

/*
biogps.initPluginWin1 = function(){
	var plugin_link = Ext.get('myplugins');
	plugin_link.on('click', function(){
			var tab_container = Ext.getCmp('center_panel');
			var plugintab_id = 'myplugintab';
			var plugintab = tab_container.getItem(plugintab_id);
			if (!plugintab) {
				plugintab = tab_container.add(new biogps.PluginPanel({
											   title: 'Plugin Library',
							                   id:plugintab_id,
							                   closable: true,
							                   autoScroll:true
											  }));
			};
			tab_container.setActiveTab(plugintab);
	},this);
}*/
