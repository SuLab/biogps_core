biogps.renderSearchForm = function(containerid){
	var container = Ext.get(containerid);
    container.createChild({tag: 'h2', html: 'Search genes by:'});

    var sequnit_store = new Ext.data.SimpleStore({
        fields: ['unit', 'factor'],
        data : [['bp', 1],
                ['Kb', 1000],
                ['Mb', 1000000]]
    });

    biogps.searchform = new Ext.FormPanel({
    	id: 'searchform',
        border:false,
        width: 475,
        labelWidth: 120,
        style: 'padding:15px 0 5px 15px',
        //url: './',
        items: [{
            xtype:'tabpanel',
            id: 'searchformtab',
            activeTab: 0,
            plain: true,
            border:true,
            deferredRender: false,
            defaults:{autoHeight:true, bodyStyle:'padding:10px', border:Ext.isIE6?true:false},
            listeners: {tabchange: {fn: onTabChange, scope:this},
                        render: function(fm){
            				//bind Ctrl-Enter hotkey
							var kmap = new Ext.KeyMap(fm.getEl(),{
								key: 13,   //Enter key
								ctrl:true,
								stopEvent: true,
								fn: function(){
									biogps.doSearch();
								},
								scope: this
							});
			            }
            },
            items:[{
                title:'Annotation',
                layout:'form',
                id:'searchbyanno',
                //defaults: {width: 300},
                defaultType: 'textfield',
                items: [
//                        {xtype: 'radiogroup',
//                        fieldLabel: 'Type',
//                        columns: 1,
//                        items: [
//                            {boxLabel: 'Symbol Or Accession', name: 'qtype',  checked: true, inputValue:'symbolanno'},
//                            {boxLabel: 'Keyword', name: 'qtype', inputValue: 'keyword'}
//                        ]},

                {
                	xtype:'radio',
		            boxLabel: 'Symbol Or Accession',
		            checked: true,
		            //id: 'type1',
		            name: 'qtype',
		            inputValue:'symbolanno',
		            fieldLabel: 'Type'
                },{
                	xtype:'radio',
		            boxLabel: 'Keyword',
		            name: 'qtype',
		            inputValue: 'keyword',
		            labelSeparator:''
                },{
                	xtype: 'textarea',
                	height: 187,
                	width: 300,
                	fieldLabel: "Query",
                	name: 'query',
                    style: 'overflow:auto',
                    //maxLength: biogps.MAX_QUERY_LENGTH,
                	id: 'query',
                	value: ''
                }, {
                	xtype: 'label',
                	//style: 'color:red;font: 10pt Arial,sans-serif;',
                	html: 'Try some sample queries? Click these links: <p><div style="padding-left: 125px"><table style="font-size: 0.8em">' +
								'<tr><td><a tabindex=1000 href="javascript:biogps.setSampleQuery({qtype:\'symbolanno\', query:\'CDK2\\nCDK3\'});">Gene Symbol(s)</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>' +
								'<td><a  tabindex=1001 href="javascript:biogps.setSampleQuery({qtype:\'keyword\', query:\'BTK\'});">Keyword queries</a></td></tr>' +
								'<tr><td><a  tabindex=1002 href="javascript:biogps.setSampleQuery({qtype:\'symbolanno\', query:\'CDK?\'});">Wildcard queries</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>' +
								'<td><a  tabindex=1003 href="javascript:biogps.setSampleQuery({qtype:\'symbolanno\', query:\'1007_s_at\\n1053_at\\n117_at\\n121_at\\n1255_g_at\\n1294_at\\n1316_at\\n1320_at\\n1405_i_at\\n1431_at\'});">Affymetrix IDs</a></td></tr>' +
								'<tr><td><a  tabindex=1004 href="javascript:biogps.setSampleQuery({qtype:\'symbolanno\', query:\'GO:0006275\'});">Gene Ontology</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>' +
								'<td><a  tabindex=1005 href="javascript:biogps.setSampleQuery({qtype:\'symbolanno\', query:\'IPR008351\'});">Interpro</a></td></tr>' +
			               '</table></div></p>'
                }

//                },{
//                    xtype: 'combo',
//                    fieldLabel: 'Results per page',
//                    labelAlign: 'left',
//                    store: new Ext.data.SimpleStore({
//					        fields: ['name', 'value'],
//					        data : [['5', 5],
//					        		['10', 10],
//					                ['20', 20],
//					                ['30', 30],
//					                ['50', 50],
//					                ['100', 100]]
//					    }),
//                    width:50,
//                    displayField:'name',
//                    name:'resultperpage',
//                    value: '20',
//                    typeAhead: false,
//                    mode: 'local',
//                    triggerAction: 'all',
//                    editable: false,
//                    forceSelection: true,
//                    selectOnFocus:true
//                },{
//                    xtype: 'combo',
//                    fieldLabel: 'Select page',
//                    labelAlign: 'left',
//                    store: new Ext.data.SimpleStore({
//					        fields: ['name', 'value'],
//					        data : [['1', 1],
//					        		['2', 2],
//					                ['3', 3],
//					                ['4', 4],
//					                ['5', 5]]
//					    }),
//                    width:50,
//                    displayField:'name',
//                    name:'currentpage',
//                    value: '1',
//                    typeAhead: false,
//                    mode: 'local',
//                    triggerAction: 'all',
//                    editable: false,
//                    forceSelection: true,
//                    selectOnFocus:true
            	]
            },{
                title:'Genome Interval',
                layout:'form',
                id: 'searchbyinterval',
                items: [{
                	xtype: 'textfield',
                	layout:'form',
                	fieldLabel: "Enter a string",
                	id: 'genomeinterval_string',
                	name: 'genomeinterval_string',
                	listeners: {render: function(obj){if (obj.container){
                	                                     obj.container.createChild({tag:'p', html:'example: <a href="javascript:biogps.setSampleQuery({genomeassembly:\'mouse\', genomeinterval_string:\'chrX:151,073,054-151,383,976\'});">chrX:151,073,054-151,383,976</a>'});
                	                                   }
                	                                  }},
                	width: 300,
                    //regex: new RegExp('^\s*(chr[xyXY0-9]+)\s*:\s*([0-9,]+)\s*-\s*([0-9,]+)\s*$', 'i'),
                    regex: new RegExp('^\s*(chr.+)\s*:\s*([0-9,]+)\s*-\s*([0-9,]+)\s*$', 'i'),
                	regexText: 'Invalid format! Should be something like "chrX:151,073,054-151,383,976" (case-insensitive).'
                },{
                    html: '<p><label class="x-form-item label">or</label></p><p><label class="x-form-item label">Enter numbers:</label></p>',
                    border: false,
                    labelSeparator:''
                },{
                    xtype: 'textfield',
                    fieldLabel: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;chr",
                    name:'genomeinterval_chr',
                    width: 50,
                    maxLength: 10
                    //regex: new RegExp('^[xyXY0-9]+$'),
                    //regexText: 'Invalid format! Should be "xyXY0-9" only.'
                },{
                    xtype: 'textfield',
                    fieldLabel: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;start",
                    name:'genomeinterval_start',
                    width: 100,
                    regex: new RegExp('^[,0-9]+$'),
                    regexText: 'Invalid format! Should be number only.'
                },{
                    xtype: 'textfield',
                    fieldLabel: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;end",
                    name:'genomeinterval_end',
                    width: 100,
                    regex: new RegExp('^[,0-9]+$'),
                    regexText: 'Invalid format! Should be number only.'
                },{
                    xtype: 'combo',
                    fieldLabel: '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;unit',
                    labelAlign: 'left',
                    store: sequnit_store,
                    width:50,
                    displayField:'unit',
                    name:'genomeinterval_unit',
                    value: 'Mb',
                    typeAhead: false,
                    mode: 'local',
                    triggerAction: 'all',
                    editable: false,
                    forceSelection: true,
                    selectOnFocus:true
                },{
                	xtype:'radio',
		            boxLabel: 'Human (hg19)',
		            id: 'genome1',
		            name: 'genomeassembly',
		            inputValue:'human',
		            fieldLabel: 'Genome Assembly'
                },{
                	xtype:'radio',
		            boxLabel: 'Mouse (mm9)',
		            checked: true,
		            id: 'genome2',
		            name: 'genomeassembly',
		            inputValue:'mouse',
		            labelSeparator:''
                },{
                	xtype:'radio',
		            boxLabel: 'Rat (rn4)',
		            id: 'genome3',
		            name: 'genomeassembly',
		            inputValue:'rat',
		            labelSeparator:''
              },{
                    xtype:'radio',
                    boxLabel: 'Fruitfly (dm3)',
                    id: 'genome4',
                    name: 'genomeassembly',
                    inputValue:'fruitfly',
                    labelSeparator:''
                }]
            }]
        }],

        buttons: [{
            text: 'Search',
            type: 'submit',
            handler: function(){biogps.doSearch();}
        },{
            text: 'Reset',
            type: 'reset',
            //handler: resetSearch
            handler: function(){biogps.searchform.getForm().reset();}

        }]
    });

    biogps.searchform.getForm().on('beforeaction', function(){
    	//tracking by Google Analytics
    	_gaq.push(['_trackPageview', '/search']);
        _gaq.push(['_trackEvent', 'BioGPS', 'Search']);
    })

    //tabs.render(container.dom);
//    tabs.on('render', function(){
//    	console.info(Ext.get('query'));
//    Ext.QuickTips.register({target: Ext.get('query'),
//                            //text: 'Your query can be seperated by anything like space, new line, comma, "+" or "|".<br>You can also use wildchar like "?" or "*".',
//                            text: 'For Symbol or accession searches, query terms can be separated by a space or a newline.<br>For Keyword searches, query terms on a single line are interpreted as a phrase.<br>Wildcards: "?" substitutes for a single character, "*" substitutes for any number of characters.',
//                            title: 'Hint'});
//    Ext.QuickTips.enable();
//    });

    var column_container = new Ext.Panel({
    	layout:'column',
    	height: '100%',
    	border: false,
    	renderTo: container,
    	items: [biogps.searchform,
    			{
    				id: 'col_info',
    				plain: true,
    				border: false,
    				bodyStyle: 'padding:35px 0 25px 35px'
    			}
    		   ]
    })



	function onTabChange(tp, tab){
		if (tab.title == 'Genome Interval'){
			if (!tab.hintenabled_2){
			    Ext.QuickTips.register({target: Ext.get('genomeinternal_string'),
			                            text: 'example "chrX:151,073,054-151,383,976"',
			                            title: 'Hint'});
			    Ext.QuickTips.enable();
			    tab.hintenabled_2 = true;
			}
		    Ext.getCmp('genomeinternal_string').focus()
		}
		else {
			if (!tab.hintenabled_1){
			    Ext.QuickTips.register({target: Ext.get('query'),
			                            //text: 'Your query can be seperated by anything like space, new line, comma, "+" or "|".<br>You can also use wildchar like "?" or "*".',
			                            text: 'For Symbol or accession searches, query terms can be separated by a space or a newline.<br>For Keyword searches, query terms on a single line are interpreted as a phrase.<br>Wildcards: "?" substitutes for a single character, "*" substitutes for any number of characters.',
			                            title: 'Hint'});
			    Ext.QuickTips.enable();
			    tab.hintenabled_1 = true;
			}
			if (!coreDispatcher.showWelcome)
				Ext.getCmp('query').focus();
		}

	};

	/*function doSearch(){
		   if (! tabs.getForm().isValid()){
	             Ext.MessageBox.show({
	                title:'Error',
	                msg: 'Wrong input! Correct and try again.',
	                buttons: Ext.Msg.OK,
	                icon: Ext.MessageBox.ERROR
	            });
		   }
		   else{
			   var searchby = Ext.getCmp('searchformtab').getActiveTab().id;
			   //ignoring empty query
			   if ((searchby == 'searchbyanno') && (tabs.getForm().getValues().query.trim() =='')){
			   	   tabs.getForm().setValues({query: ''});
			   	   return;
			   }

		       tabs.getForm().submit({
		        url:'/',
		        waitMsg:'Searching database...',
		        method:'POST',
		        timeout:60,
		        params: {searchby: searchby},
		        success: function(form, action){
		            Ext.MessageBox.hide();
		            if (action.result.data.geneList && action.result.data.geneList.length==0){
		            	Ext.MessageBox.show({ title: 'Not found',
		            	 					  msg: 'Your query does not return any record. Try again.',
		            	 					  buttons: Ext.Msg.OK,
		            	 					  icon: Ext.MessageBox.WARNING});
		            }
		            else{
			            biogps.genelist_panel.loadGeneList(action.result.data);
			            biogps.renderSearchResult('resultpanel', 'center_panel', action.result.data)
		            }
		        },
		        failure: function(form, action){
		        	biogps.formfailure(action,'Searching database failed!');
		        }
		     });
		   }
	};

	tabs.doSearch = doSearch;

	function resetSearch(){
        tabs = Ext.getCmp('searchform');
		tabs.form.reset();
	};*/

};


biogps.doSearch = function(cfg){
    //do the actual search

    //mark a new search is started, useful for selenium test.
    if (biogps.resultpage && biogps.resultpage.genelistrendered) biogps.resultpage.genelistrendered = false;

    var fm = biogps.searchform;
    var target;        //null if doSearch is submitted directly from biogps.searchform
                       //otherwise, the query input element, e.g. "qsearch_query" if triggered by qsearch_form at welcome page.

    if (cfg){
        fm.form.setValues(cfg);
        target = cfg.target;
        if (cfg.searchby){
            fm.items.get(0).setActiveTab(cfg.searchby)
        }
    }
    var searchby = fm.items.get(0).getActiveTab().id;

    setFocus = function(){
        if (target){
            var _target_el = Ext.get(target);
            if (_target_el) _target_el.focus();
        }
        else{
            if (searchby == 'searchbyanno')
                Ext.getCmp('query').focus();
            else
                Ext.getCmp('genomeinternal_string').focus();
        }
    }
    if (! fm.getForm().isValid()){
          Ext.MessageBox.show({
             title:'Error',
             msg: 'Wrong input! Correct and try again.',
             buttons: Ext.Msg.OK,
             fn: setFocus,
             icon: Ext.MessageBox.ERROR
         });
    }
    else{
        if (searchby == 'searchbyanno'){
            var query = fm.getForm().getValues().query.trim();
            if (query ==''){
                //ignoring empty query
	            fm.getForm().setValues({query: ''});
	            return;
            }
            else if (query.length>biogps.MAX_QUERY_LENGTH) {
                //failed for large query.
                 Ext.MessageBox.show({ title: 'Error',
                                       msg: String.format('Your query is too large (>{0}k characters). Modify your query and try again.', biogps.MAX_QUERY_LENGTH/1000),
                                       buttons: Ext.Msg.OK,
                                       fn: setFocus,
                                       icon: Ext.MessageBox.ERROR});
                 return;
            }
        }

        fm.getForm().submit({
         url:'/boe/',
         waitMsg:'Searching database...',
         method:'POST',
         timeout:120,
         params: {searchby: searchby},
         success: function(form, action){
             var result = action.result.data;
             Ext.MessageBox.hide();
             if (result.geneList && result.geneList.length==0){
                 //If the "symbolanno" type query returns nothing, try "keyword" query automatically.
                 if (form.getValues().qtype == 'symbolanno'){
                    form.setValues({qtype: 'keyword'});
                    biogps.doSearch();
                 }else{
                     Ext.MessageBox.show({ title: 'Not found',
                                           msg: 'Your query does not return any record. Try again.',
                                           buttons: Ext.Msg.OK,
                                           fn: setFocus,
                                           icon: Ext.MessageBox.WARNING});
                 }
             }
             else{
                 biogps.genelist_panel.loadGeneList(result);
                 biogps.renderSearchResult('resultpanel', 'center_panel', result)
             }
         },
         failure: function(form, action){
             biogps.formfailure(action,'Searching database failed!');
         }
      });
    }
};


biogps.doSearch2 = function(cfg){
    //do the actual search
    var query = cfg.query;
    //TODO: validate query here
    if (query.length>biogps.MAX_QUERY_LENGTH) {
        //failed for large query.
         Ext.MessageBox.show({ title: 'Error',
                               msg: String.format('Your query is too large (>{0}k characters). Modify your query and try again.', biogps.MAX_QUERY_LENGTH/1000),
                               buttons: Ext.Msg.OK,
                               fn: setFocus,
                               icon: Ext.MessageBox.ERROR});
         return;
    }

    var target = cfg.target;
    setFocus = function(){
        if (target){
            var _target_el = Ext.get(target);
            if (_target_el) _target_el.focus();
        }
    }

    if (query){
        Ext.MessageBox.wait('Searching database...', 'Please wait...');
        biogps.callRemoteService({
            url: '/boe/',
            params: {query: query},
            method: 'POST',
            fn: function(st){
                biogps.st = st;
                var result =  st.reader.jsonData.data;
                Ext.MessageBox.hide();
                if (result.geneList && result.geneList.length==0){
                    Ext.MessageBox.show({ title: 'Not found',
                                          msg: 'Your query does not return any record. Try again.',
                                          buttons: Ext.Msg.OK,
                                          fn: setFocus,
                                          icon: Ext.MessageBox.WARNING});
                }
                else{
                    biogps.genelist_panel.loadGeneList(result);
                    biogps.renderSearchResult('resultpanel', 'center_panel', result)
                }
            }
        });
    }
}

/*
biogps.setSampleQuery = function(cfg){
//	var fm = Ext.getCmp('searchform');
//	if (fm){
//		fm.form.setValues(cfg);
//	}
    if (biogps.searchform)
        biogps.searchform.form.setValues(cfg);
};

biogps.renderTipBox = function(container){
	if (isArray(biogps.tip_array) && biogps.tip_array.length>0) {
		var tipbox_container = Ext.fly(container).createChild({tag:'div', id: 'tipbox_container', style: 'padding:35px 5px 25px 5px;'});
		if (!Ext.state.Manager.get('hideTipBox')){
			var tipbox = new biogps.TipBox({id:'tipbox'});
			tipbox.render(tipbox_container);
		}
		else{
			biogps.makeShowTipBoxLink(tipbox_container);
		}
	}
};

biogps.makeShowTipBoxLink = function(container){
	var tipbox_container = container.createChild({tag:'div', style: "padding:4px 0px 0px 5px"});
	tipbox_container.update('<img src="/assets/img/information.png" align="absmiddle"/>&nbsp;<span style="font: 8pt Tahoma; font-weight:bold;">Tip of the Day:</span>&nbsp;')
	var tipbox_link = tipbox_container.createChild({tag:'a', href:'#', style: "font: 8pt Tahoma;", html:'[show]'});
	tipbox_link.on('click', function(e, t){
		e.stopEvent();
		Ext.state.Manager.clear('hideTipBox');
	    var tipbox = new biogps.TipBox({id:'tipbox'});
	    var container = Ext.fly('tipbox_container');
	    container.dom.innerHtml='';
	    while (container.first()){
	    	container.first().remove();
	    }
	    tipbox.render(container);
	},this);
};

biogps.TipBox = function(config) {
	this.id = '';
	Ext.apply(this, config);
	biogps.TipBox.superclass.constructor.call(this, {
		width: 300,//350, //550,
		//height: 100,
		//plain: true,
		//style: 'padding:35px 0px 25px 15px',
		bodyStyle: 'padding:5px 5px 5px 15px',
		html: '',
		tbar: new Ext.Toolbar({
			style:'background:#ffffff;',// border: 0 none;',
			items:[' ','<img src="/assets/img/information.png" align="absmiddle"/>',' ','<b>Tip of the Day:</b>','->',
				   {text: 'prev', handler:this.prevTip,scope:this},
			       ' ', '|', ' ',
			       {text: 'next', handler:this.nextTip,scope:this},
			       '    ',
			       {text: 'close', handler: this.closeBox,scope:this}]
		})
	});
	this.current_idx = Math.floor(Math.random() *1000 % biogps.tip_array.length)
	this.on('render', function(){
		this.el.fadeIn({duration:1});
		this.showTip();
	}, this);
};
Ext.extend(biogps.TipBox, Ext.Panel, {
	showTip: function(){
		this.body.update(String.format('{0}', biogps.tip_array[this.current_idx]));
	},

	nextTip: function(){
		this.current_idx = this.current_idx+1
		if (this.current_idx > biogps.tip_array.length-1)
			this.current_idx = 0;
		this.showTip();
	},

	prevTip: function(){
		this.current_idx = this.current_idx-1
		if (this.current_idx < 0)
			this.current_idx = biogps.tip_array.length-1;
		this.showTip();
	},

	closeBox: function(){
		if (this.el){
			this.el.fadeOut({duration:1,
                             callback: function(){
											this.destroy();
											Ext.fly('tipbox_container').dom.innerHtml='';
											biogps.makeShowTipBoxLink(Ext.fly('tipbox_container'));
											Ext.state.Manager.set('hideTipBox', true);
                             		   },
                             scope: this
                             });
		}
	}
});

biogps.renderFeedBox = function(container){
	var feedbox_container = Ext.fly(container).createChild({tag:'div', style: "padding:5px 0px 0px 5px"});
	//feedbox_container.alignTo(Ext.get('searchpanel'), 'tl', [600, 50]);
	feedbox_container.setSize(305, 'auto'); //355, 'auto');
	var feedbox = new Ext.Panel();
	feedbox.on('render', function(feedbox){
	feedbox.load({url:'/utils/feedbox/', scripts:true});
	});
	feedbox.render(feedbox_container);
};
*/
