biogps.renderMyStuffPanel = function(forcerefresh){
	var tab_container = Ext.getCmp('center_panel');
	var container_id = 'mystuff_panel';
	var container = tab_container.getItem(container_id);
	var is_new_container = false;
	if (!container) {
		container = tab_container.add({ title:'My Stuff',
					                   id:container_id,
					                   //iconCls: 'icon-home',
					                   closable: true,
					                   layout: 'fit',
					                   autoScroll:true});
		var fn = function(){if (Ext.get(container_id)) biogps.renderMyStuffPanel(forcerefresh=true);};
		biogps.usrMgr.linkWithAuthentication(fn);
		container.on('destroy', function(){
			biogps.usrMgr.unlinkWithAuthentication(fn);
		});
		is_new_container = true;
	}

	tab_container.setActiveTab(container);
    if (is_new_container || forcerefresh) {
		container.load({url:'/mystuff/',
		                scripts:true,
						nocache: true,
		                callback: function(el, success, response, options){
		                	if (success){
		                		if (onPanelLoad){
		                			onPanelLoad();
		                		}
		                	}
		                	else{
		                		biogps.ajaxfailure(null, response);
		                	}

		                }
		                });
    }
};

