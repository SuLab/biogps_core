biogps.renderSearchResult = function(containerid, parentid, result){
    var container = Ext.get(containerid);
    var parentcontainer = Ext.getCmp(parentid);
    Ext.getCmp('result_panel').enable();
    if (!container){
    	container = Ext.getBody().createChild({tag: 'div', id: containerid});

    	parentcontainer.add({
                    contentEl:containerid,
                    title: 'Search Result',
                    layout: 'fit',
					closable:true,
                    autoScroll:true
    	});
    	parentcontainer.doLayout();
    	parentcontainer.setActiveTab(parentcontainer.items.getCount()-1);
    }


    //if only one gene returns, genereport panel will be rendered immediately
    //this is to avoid the flash on "result_panel"
    if (result.geneList.length>1){
        Ext.History.add('goto=searchresult');
    	parentcontainer.setActiveTab('result_panel');
    }

	container.dom.innerHTML = '';

	biogps.resultpage = new biogps.GeneResultPage(result);
	biogps.resultpage.render(container.dom);

};

biogps.GeneResultPage = function(config) {
	this.totalCount;
	this.resultPerPage;
	this.currentPage;
	this.geneList;
	Ext.apply(this, config);
	var plural = this.totalCount > 1?'s':'';
	this.start = this.resultPerPage*(this.currentPage-1) + 1;
	this.end = Math.min(this.totalCount, this.start + this.resultPerPage -1);
	this.totalPage = Math.ceil(this.totalCount/this.resultPerPage);

	biogps.GeneResultPage.superclass.constructor.call(this, {
		border: false
//		tbar: [ String.format('Your query returns {0} record{1}.', this.totalCount, plural),
//		        ' ',
//		        '->',

        //     ########temp disable paging feature here#########
//				String.format('Record{0} {1} - {2} of {3}', plural, this.start, this.end, this.totalCount),
//				' ', '-', ' ',
//				{
//		            tooltip: this.firstText,
//		            iconCls: "x-tbar-page-first",
//		            disabled: true,
//		            handler: Ext.emptyFn
//        		},
//        		{
//		            tooltip: this.prevText,
//		            iconCls: "x-tbar-page-prev",
//		            disabled: true,
//		            handler: Ext.emptyFn
//        		},
//        		' ','-',' ',
//				'Page', ' ',
//        		new Ext.form.TextField({
//        			value: this.currentPage,
//        			width: 20
//        		}), ' ',
//		        'of ' + this.totalPage,
//		        ' ','-',' ',
//        		{
//		            tooltip: this.nextText,
//		            iconCls: "x-tbar-page-next",
//		            disabled: true,
//		            handler: Ext.emptyFn
//        		},
//        		{
//		            tooltip: this.lastText,
//		            iconCls: "x-tbar-page-last",
//		            disabled: true,
//		            handler: Ext.emptyFn
//        		},
//        		' ', '-',' ',
//				'Record per page:',
//				new Ext.form.ComboBox({
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
//                    value: this.resultPerPage.toString(),
//                    typeAhead: false,
//                    mode: 'local',
//                    triggerAction: 'all',
//                    editable: false,
//                    forceSelection: true,
//                    selectOnFocus:true
//				}),


//				' '
//			]
	});
//	this.on('render', this.renderGeneList, this);
    this.on('render', this.renderGeneList2, this);

};

Ext.extend(biogps.GeneResultPage, Ext.Panel, {
	renderGeneList: function(){
        var html, g;
		if(this.rendered){
			html = '<table id="generesult_table" class="generesult_table" cellspacing="0">';
            html += '<thead><tr><th scope="col">no.</th><th scope="col">symbol</th><th scope="col">id</th><th scope="col">name</th></tr></thead><tbody>';
			//html += '<thead><tr><th scope="col">no.</th><th scope="col">symbol</th><th scope="col">id</th><th scope="col">name</th><th scope="col">matched query</th></tr></thead><tbody>';
			for (var i=0; i<this.geneList.length; i++){
				g = this.geneList[i];
				if (i%2 == 0){
                    html += String.format('<tr onclick="biogps.renderGeneReport2(\'{0}\')"><th scope="row">{1}</th><td>{2}</td><td>{3}</td><td>{4}</td></tr>', g.id, i+1, g.symbol, g.id, g.name);
					//html += String.format('<tr onclick="biogps.renderGeneReport2(\'{0}\')"><th scope="row">{1}</th><td>{2}</td><td>{3}</td><td>{4}</td><td>{5}</td></tr>', g.id, i+1, g.symbol, g.id, g.name, g.matched_term);
                }
				else{
                    html += String.format('<tr class="odd" onclick="biogps.renderGeneReport2(\'{0}\')"><th scope="row">{1}</th><td class="alt">{2}</td><td class="alt">{3}</td><td class="alt">{4}</td></tr>', g.id, i+1, g.symbol, g.id, g.name);
				 	//html += String.format('<tr class="odd" onclick="biogps.renderGeneReport2(\'{0}\')"><th scope="row">{1}</th><td class="alt">{2}</td><td class="alt">{3}</td><td class="alt">{4}</td><td class="alt">{5}</td></tr>', g.id, i+1, g.symbol, g.id, g.name,  g.matched_term);
                }
			}
			html +='</tbody></table>';

			var geneList = this.geneList;
			this.body.update(html, false, function(){
				biogps.Messenger.fireEvent('genelistrendered');
                biogps.resultpage.genelistrendered = true;
				//Goto genereport page directly if search result has just one gene
				if (geneList.length==1){
					biogps.renderGeneReport2(geneList[0].id);
				}
                else{
                    if (Ext.isIE) Ext.History.add('goto=searchresult');  //A fix for IE, otherwise it will switch back to welcome page after resultpanel is rendered (when search was submitted from welcome page)
                }
			},this);



		}
	},

    renderGeneList2: function(){
        var taxid_list = [9606, 10090, 10116, 7227, 6239, 7955, 3702, 8364];
        var prefix_d = {'9606':  'Hs',
                        '10090': 'Mm',
                        '10116': 'Rn',
                        '7227':  'Dm',
                        '6239':  'Ce',
                        '7955':  'Dr',
                        '3702':  'At',
                        '8364':  'Xt'
                        }
        var species_d = {'9606':  'human',
                         '10090': 'mouse',
                         '10116': 'rat',
                         '7227':  'fruitfly',
                         '6239':  'nematode',
                         '7955':  'zebrafish',
                         '3702':  'thale-cress',
                         '8364':  'frog'
                         }
        var species_menu_labels = {	'human': 'H. sapiens (human)',
	  				                'mouse': 'M. musculus (mouse)',
					                'rat': 'R. norvegicus (rat)',
					                'fruitfly': 'D. melanogaster (fruitfly)',
					                'nematode': 'C. elegans (nematode)',
					                'zebrafish': 'D. rerio (zebrafish)',
					                'thale-cress': 'A. thaliana (thale cress)',
					                'frog': 'X. tropicalis (frog)'
                }
        var tpl = new Ext.XTemplate(
//            '<p style="color:blue;padding: 5px 15px 0 15px;font-size:16px;font-family:\'comic sans ms\', sans-serif;"><img src="/assets/img/message.png" /><span id="new_feature_header">We improved this page! <a id="new_feature_link" style="color:blue" href="javascript:void(0);">Show me.</a></span></p>',
            '<p class="generesult_header">Your query ',
            '<tpl if="this.useInlineQuery">',
            '(<span class="generesult_query">"{query:ellipsis(50)}"</span>) ',
            '</tpl>',
            'returns {totalCount} record{this.plural}:</p>',
            '<table id="generesult_table" class="generesult_table" cellspacing="0">',
            '<thead><tr><th scope="col">no.</th><tpl if="!this.useInlineQuery"><th scope="col">query</th></tpl><th scope="col">symbol</th><th scope="col">id</th><th scope="col" style="max-width:450px;">name</th><th scope="col">homologene</th></tr></thead><tbody>',
            '<tpl for="geneList">',
                 '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}"><th scope="row" onclick="biogps.renderGeneReport2(\'{id}\')">{#}</th><tpl if="!this.useInlineQuery"><td onclick="biogps.renderGeneReport2(\'{id}\')">{key}</td></tpl><td onclick="biogps.renderGeneReport2(\'{id}\')">{symbol}</td><td onclick="biogps.renderGeneReport2(\'{id}\')">{id}</td><td style="max-width:450px;" onclick="biogps.renderGeneReport2(\'{id}\')">{name}</td><td class="homologene_td">{[this.fmtHomologene(values)]}</td></tr>',
            '</tpl>',
            '</tbody></table>',
            '<div id="temp_for_notfound"></div>',
            '<tpl if="values.notfound">',
                '<p class="notfound_footer">Found no matches for {[values.notfound.length]} query term{[values.notfound.length>1?"s":""]}:<br />',
                '<span class="notfound_hint">(Try wildcard query or keyword query?)</span><br />',
                '<tpl for="notfound">',
                '<div class="notfound_term">{.}</div>',
                '</tpl>',
                '</p>',
            '</tpl>',
            {
                compiled: true,
                disableFormats: false,
                useInlineQuery: (this.qtype=='keyword' || this.qtype=='interval'),
                plural: this.totalCount > 1?'s':'',
                fmtHomologene: function(values){
                    var hgene = values.homologene;
                    var out = '';
                    if (hgene){
                        for (var i=0;i<taxid_list.length;i++) {
                            var tid = taxid_list[i];
                            var species_found = false;
                            for (var j=0;j<hgene.genes.length;j++){
                                var g = hgene.genes[j];
                                if (parseInt(tid)==parseInt(g[0])){
                                    out += String.format('<span class="species_available{0}"><a href="javascript:biogps.renderGeneReport2(\'{1}\')" title="{2}">{3}</a></span>', (g[1]==values.id)?" current_species":"", g[1], species_menu_labels[species_d[tid]],  prefix_d[tid]);
                                    species_found = true;
                                }
                            }
                            if (!species_found){
                                out += String.format('<a href="javascript:void(null);" title="{0}"><span class="species_unavailable">{1}</span></a>', species_menu_labels[species_d[tid]], prefix_d[tid]);
                            }
                        }
                        out += String.format('&nbsp;&nbsp;<span class="homologene_id">(<a href="http://www.ncbi.nlm.nih.gov/homologene/{0}" title="View NCBI HomoloGene record" target="_blank">{1}</a>)</span>', hgene.id, hgene.id);
                    }
                    else{
                        //no homologene, just display the current species itself.
                        var current_tid = values.taxid.toString();
                        for (var i=0;i<taxid_list.length;i++) {
                            var tid = taxid_list[i];
                            if (tid == current_tid){
                                out += String.format('<span class="species_available current_species"><a href="javascript:biogps.renderGeneReport2(\'{0}\')" title="{1}">{2}</a></span>', values.id, species_menu_labels[species_d[tid]],  prefix_d[tid]);
                            }
                            else{
                                out += String.format('<span class="species_invisible">{0}</span>', prefix_d[tid]);
                            }
                        }
                    }
                    return out;
                }
            }
        );

        if(this.rendered){
            var html = tpl.apply(this);

            var geneList = this.geneList;
            this.body.update(html, false, function(){
    		    var tbl = Ext.get('generesult_table')
    		    sorttable.makeSortable(tbl.dom);
                //create tooltip
//                new Ext.ToolTip({
//                    title: new_feature_title,
//                    target: 'new_feature_header',
//                    anchor: 'left',
//                    html: new_feature_html,
//                    width: 400,
//                    dismissDelay:0,
//                    hideDelay:5000,
//                    autoHide: true,
//                    closable: true
//                });
                biogps.Messenger.fireEvent('genelistrendered');
                biogps.resultpage.genelistrendered = true;
                //Goto genereport page directly if search result has just one gene
                if (geneList.length==1){
                    biogps.renderGeneReport2(geneList[0].id);
                }
                else{
                    if (Ext.isIE) Ext.History.add('goto=searchresult');  //A fix for IE, otherwise it will switch back to welcome page after resultpanel is rendered (when search was submitted from welcome page)
                }
            },this);



        }
    }

});

//var new_feature_title = '<span style="font-size:14px;padding-bottom: 5px;">New features</span>';
//var new_feature_html = '<ul class="feedentry" style="font-size:14px;text-indent: 5px;">' +
//                       '<li style="padding-bottom: 5px;">The order of the genes matches the original order of your query terms.</li>' +
//                       '<li style="padding-bottom: 5px;">Matched query term or terms are listed in the "QUERY" column.</li>'+
//                       '<li style="padding-bottom: 5px;">Each column in the results table is sortable.</li>' +
//                       '<li style="padding-bottom: 5px;">The new "HOMOLOGENE" column shows all available species for each gene orthology group and provides quick access to view the species-specific gene reports.</li>' +
//                       '<li style="padding-bottom: 5px;">Unmatched query terms, if any, will be shown below the results table.</li>' +
//                       '</ul>' +
//                       '<p><a href="http://biogps.blogspot.com/2010/07/improved-search-result-page.html" target="_blank">More details in our blog post.</a>';


