biogps.renderMainUI = function(){

	Ext.form.Field.prototype.msgTarget = 'side';

   biogps.mainUI_init();

   biogps.genelist_panel = new biogps.GeneListPanel();
   biogps.genelist_panel.on('geneclicked', function(gene){
												biogps.renderGeneReport2([gene.id]);
    										});
   biogps.geneset_panel = new biogps.GeneSetPanel();

   var viewport = new Ext.Viewport({
        layout:'border',
        items:[
            new Ext.BoxComponent({
                region:'north',
                el: 'header',
                height:32
            }),{
                region:'south',
                contentEl: 'south',
                id:'log_panel',
                split:true,
                height: 21,
                minSize: 5,
                maxSize: 200,
                collapsible: true,
                collapsed : false,
                frame:false,
                header: false,
                collapseMode:'mini',
                title:'South',
                margins:'0 0 0 0'
            },{
                region:'west',
                id:'west-panel',
                title:'Current Gene List',
                split:true,
                width: 185,
                minSize: 100,
                maxSize: 400,
                collapsible: true,
                collapseMode:'mini',
                margins:'0 0 0 5',
                //layout:'accordion',
                layout:'border',
                layoutConfig:{
                    animate:true
                },
                items: [biogps.genelist_panel,biogps.geneset_panel]
            },
            new Ext.TabPanel({
                region:'center',
                id: 'center_panel',
                deferredRender:false,
                enableTabScroll:true,
                activeTab:0,
                defaults: {autoScroll:true},
                items:[{
                //     contentEl:'searchpanel',
                //     id: 'search_panel',
                //     title: 'Search',
                //     autoScroll:true
                // },{
                    contentEl:'resultpanel',
                    name: 'result_panel',
                    id: 'result_panel',
                    title: 'Search Result',
                    layout: 'fit',
                    disabled: true,
					//closable:true,
                    autoScroll:true
                    /*
                    tbar: new Ext.PagingToolbar({
					            pageSize: 25,
					            style: 'float: right',
					            store: biogps.store,
					            displayInfo: true,
					            displayMsg: 'Displaying topics {0} - {1} of {2}',
					            emptyMsg: "No topics to display",
					            items:[
					                '-', {
					                pressed: true,
					                enableToggle:true,
					                text: 'Test Button',
					                cls: 'x-btn-text-icon details',
					                toggleHandler: Ext.emptyFn
					            }]
  				          })*/
                },{
                    contentEl:'reportpanel',
                    id: 'report_panel',
                    bodyCssClass: 'report_panel_back',
                    layout:'fit',
                    disabled: true,
                    title: 'Gene Report',
					//closable:true,
					//autoHeight: true,
                    autoScroll:true
                    //tbar: new biogps.genereportToolbar()
                }]
            })
         ]
    });

    biogps.centerTab = Ext.getCmp('center_panel');
    biogps.centerTab.on('tabchange', function(tp, tab){
    	switch(tab.id){
    		case 'search_panel':
				Ext.History.add('goto=search');
				break;
			case 'result_panel':
				Ext.History.add('goto=searchresult');
				break;
			case 'report_panel':
				var geneid_list = biogps.GeneReportMgr.getGeneidList();
				if (geneid_list.length>0){
					Ext.History.add('goto=genereport&id=' + geneid_list.join(','));
				}
                biogps.GeneReportMgr.refreshMarked();
                biogps.chrome_bug_fix();
				break;
			case 'infotab_help':
				Ext.History.add('goto=help');
				break;
		    case 'infotab_faq':
				Ext.History.add('goto=faq');
				break;
		    case 'infotab_downloads':
				Ext.History.add('goto=downloads');
				break;
			case 'infotab_about':
				Ext.History.add('goto=about');
				break;
			case 'infotab_terms':
				Ext.History.add('goto=terms');
				break;
			case 'pluginbrowse_panel':
			    if (biogps.currentLibrary) {
			        biogps.currentLibrary.hash_history(); }
			    else {
				    Ext.History.add('goto=pluginlibrary'); }
				break;
			case 'mystuff_panel':
				Ext.History.add('goto=mystuff');
				break;
			case 'infotab_iphone':
				Ext.History.add('goto=iphone');
				break;
		}
    },this);

//    biogps.renderSearchForm('searchpanel');

//    biogps.renderFeedBox(Ext.getCmp('col_info').body);
//    biogps.renderTipBox(Ext.getCmp('col_info').body);

    biogps.mainUI_postinit();

};

Ext.onReady(function(){
    // Check for the presence of the hidden history form to determine whether
    // or not to run all of our init scripts.  This is a hackish but great way
    // to ensure that we don't try to start the full UI on pages that aren't
    // supposed to.
    if(Ext.get('history-form')) {
		if (window.coreDispatcher && !coreDispatcher.showWelcome){
			Ext.get('welcome').hide();
		}
        biogps.init();
		biogps.renderMainUI();
	}
});
