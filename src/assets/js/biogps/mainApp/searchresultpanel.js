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
    if (biogps.usrMgr.profile && biogps.usrMgr.profile.defaultspecies){
        this.show_species = biogps.usrMgr.profile.defaultspecies;
    }
    else{
        this.show_species = ['human', 'mouse', 'rat'];
    }

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
    this.on('render', this.renderGeneList3, this);

};

Ext.extend(biogps.GeneResultPage, Ext.Panel, {
/*
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
*/
    renderGeneList2: function(){
        var taxid_list = [9606, 10090, 10116, 7227, 6239, 7955, 3702, 8364, 9823];
        var prefix_d = {'9606':  'Hs',
                        '10090': 'Mm',
                        '10116': 'Rn',
                        '7227':  'Dm',
                        '6239':  'Ce',
                        '7955':  'Dr',
                        '3702':  'At',
                        '8364':  'Xt',
                        '9823':  'Ss'
                        }
        var species_d = {'9606':  'human',
                         '10090': 'mouse',
                         '10116': 'rat',
                         '7227':  'fruitfly',
                         '6239':  'nematode',
                         '7955':  'zebrafish',
                         '3702':  'thale-cress',
                         '8364':  'frog',
                         '9823':  'pig'
                         }
        var species_menu_labels = {	'human': 'H. sapiens (human)',
	  				                'mouse': 'M. musculus (mouse)',
					                'rat': 'R. norvegicus (rat)',
					                'fruitfly': 'D. melanogaster (fruitfly)',
					                'nematode': 'C. elegans (nematode)',
					                'zebrafish': 'D. rerio (zebrafish)',
					                'thale-cress': 'A. thaliana (thale cress)',
					                'frog': 'X. tropicalis (frog)',
                                    'pig': 'S. scrofa (pig)'
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
                 '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}"><th scope="row" onclick="biogps.renderGeneReport2(\'{id}\')">{#}</th><tpl if="!this.useInlineQuery"><td onclick="biogps.renderGeneReport2(\'{id}\')">{query}</td></tpl><td onclick="biogps.renderGeneReport2(\'{id}\')">{symbol}</td><td onclick="biogps.renderGeneReport2(\'{id}\')">{id}</td><td style="max-width:450px;" onclick="biogps.renderGeneReport2(\'{id}\')">{name}</td><td class="homologene_td">{[this.fmtHomologene(values)]}</td></tr>',
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
    },

    species_d:  {'9606':  'human',
                 '10090': 'mouse',
                 '10116': 'rat',
                 '7227':  'fruitfly',
                 '6239':  'nematode',
                 '7955':  'zebrafish',
                 '3702':  'thale-cress',
                 '8364':  'frog',
                 '9823':  'pig'
                },
    species_menu_labels:  { 'human': 'H. sapiens (human)',
                            'mouse': 'M. musculus (mouse)',
                            'rat': 'R. norvegicus (rat)',
                            'fruitfly': 'D. melanogaster (fruitfly)',
                            'nematode': 'C. elegans (nematode)',
                            'zebrafish': 'D. rerio (zebrafish)',
                            'thale-cress': 'A. thaliana (thale cress)',
                            'frog': 'X. tropicalis (frog)',
                            'pig': 'S. scrofa (pig)'
                },

    toggle_species: function(cb, evt){
        $(cb).prev().attr('checked', !$(cb).prev().attr('checked'));
        biogps.resultpage.updateSpecies();
        return false;
    },

    updateSpecies: function(){
        var species_selected = [];
        $("input[name='generesult_species_list']:checked").each(function(){species_selected.push($(this).val());});
        this.show_species = species_selected;
        biogps.usrMgr.profile.defaultspecies = species_selected;
        var tbl_html = this.renderGeneTable();
        tbl_container = Ext.get('generesult_table_container');
        tbl_container.update(tbl_html, false, function(){
            var tbl = Ext.fly('generesult_table');
            sorttable.makeSortable(tbl.dom);
        });

        this.saveSpeciesSelection();

    },

    ToggleSelectAllSpecies: function(el, evt){
        var cb_list = $("input[name='generesult_species_list']");
        if (el.innerHTML=='Select all'){
            cb_list.attr('checked', true);   //check all
            el.innerHTML = 'Unselect all';
        }
        else{
            cb_list.attr('checked', false);   //uncheck all
            el.innerHTML = 'Select all';
        }
        biogps.resultpage.updateSpecies();
        return false;
    },

    renderGeneTable: function(){
        var species_d = this.species_d;
        var species_menu_labels = this.species_menu_labels;

        var displayed_gene_cnt = 0;
        var displayed_gene_list = [];
        for (var i=0; i<this.geneList.length; i++){
            var gene = this.geneList[i];
            var taxid = gene.taxid.toString();
            var species = species_d[taxid];
            this.geneList[i].hide = false;
            if (isArray(this.show_species)){
                if(this.show_species.indexOf(species) == -1){
                    this.geneList[i].hide = true;
                }
            }
            if (!this.geneList[i].hide) {
                displayed_gene_cnt+=1;
                displayed_gene_list.push(this.geneList[i]);
            }
        }

        var tpl = new Ext.XTemplate(
            '<p class="generesult_header"><a class="generesult_goback" href="/#goto=welcome" title="Go back to query"></a>Your query ',
            '<tpl if="this.useInlineQuery">',
            '(<span class="generesult_query">"{query:ellipsis(50)}"</span>) ',
            '</tpl>',
            'returns {totalCount} record{this.plural_total}',
            '<tpl if="this.genelist_filtered">',
                ', {this.gene_count} record{this.plural} displayed',
            '</tpl>',
            ':</p>',

            '<table id="generesult_table" class="generesult_table" cellspacing="0">',
            '<thead><tr><th scope="col">no.</th><tpl if="!this.useInlineQuery"><th scope="col">query</th></tpl><th scope="col">symbol</th><th scope="col">id</th><th scope="col" style="max-width:450px;">name</th><th scope="col">species</th></tr></thead><tbody>',
            '<tpl for="this.gene_list">',
                '<tpl if="!values.hide">',
                    '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}">',
                        '<th scope="row" onclick="biogps.renderGeneReport2(\'{id}\')">{#}</th>',
                        '<tpl if="!this.useInlineQuery">',
                            '<td onclick="biogps.renderGeneReport2(\'{id}\')">{query}</td>',
                        '</tpl>',
                        '<tpl if="values.symbol">',
                            '<tpl if="values.symbol && values.symbol.length &gt; 10">',
                                '<td style="font-size:10px" onclick="biogps.renderGeneReport2(\'{id}\')">{symbol}</td>',
                            '</tpl>',
                            '<tpl if="values.symbol && values.symbol.length &lt;= 10">',
                                '<td onclick="biogps.renderGeneReport2(\'{id}\')">{symbol}</td>',
                            '</tpl>',
                        '</tpl>',
                        '<tpl if="!values.symbol">',
                            '<td onclick="biogps.renderGeneReport2(\'{id}\')"></td>',
                        '</tpl>',
                        '<tpl if="values.id.length &gt; 10">',
                            '<td style="font-size:10px" onclick="biogps.renderGeneReport2(\'{id}\')">{id}</td>',
                        '</tpl>',
                        '<tpl if="values.id.length &lt;= 10">',
                            '<td onclick="biogps.renderGeneReport2(\'{id}\')">{id}</td>',
                        '</tpl>',
                        '<td style="max-width:350px;" onclick="biogps.renderGeneReport2(\'{id}\')">{name}</td>',
                        '<td class="homologene_td" onclick="biogps.renderGeneReport2(\'{id}\')">{[this.fmtSpecies(values)]}</td>',
                    '</tr>',
                '</tpl>',
            '</tpl>',
            '</tbody></table>',
            {
                compiled: true,
                disableFormats: false,
                useInlineQuery: (this.qtype=='keyword' || this.qtype=='interval'),
                plural_total: this.totalCount > 1?'s':'',
                plural: displayed_gene_cnt > 1?'s':'',
                gene_list: displayed_gene_list,
                gene_count: displayed_gene_cnt,
                genelist_filtered: this.totalCount>displayed_gene_cnt,
                fmtSpecies: function(values){
                    var tid = values.taxid.toString();
                    var species = species_d[tid];
                    out = String.format('<a title="{0}">{1}</a>', species_menu_labels[species], species);
                    return out
                }
            });
        var tbl_html = tpl.apply(this);
        return tbl_html;


    },

    renderGeneList3: function(){
        var species_d = this.species_d;
        var species_menu_labels = this.species_menu_labels;

        var species_list = [];
        var species_counts = {}
        for (var i=0; i<this.geneList.length; i++){
            var gene = this.geneList[i];
            var taxid = gene.taxid.toString();
            var species = species_d[taxid];
            if (species_counts[species]){
                species_counts[species].count += 1;
            }
            else{
                species_counts[species] = {species: species,
                                           label: species_menu_labels[species],
                                           count: 1};
            }
            this.geneList[i].hide = false;
            if (isArray(this.show_species)){
                if(this.show_species.indexOf(species) == -1){
                    this.geneList[i].hide = true;
                }
            }
        }
        for (species in species_menu_labels){
            var species_checked;
            if (isArray(this.show_species)){
                species_checked = (this.show_species.indexOf(species) != -1)?"checked":"";
            }
            else {
                species_checked = "checked";
            }

            if (species_counts[species]){
                species_counts[species].checked = species_checked;
                species_list.push(species_counts[species]);
            }
            else{
                species_list.push({species: species,
                                   label: species_menu_labels[species],
                                   checked: species_checked,
                                   count: 0});
            }
        }

        var tpl = new Ext.XTemplate(

            '<div id="generesult_species_selector">',
            '<p>Select species here:</p>',
            '<table class="generesult_species_selector" cellspacing="0">',
            '<form>',
            '<tbody>',
            '<tpl for="this.species_list">',
                '<tr><td><input type="checkbox" {checked} name="generesult_species_list" value="{species}" onclick="javascript:biogps.resultpage.toggle_species(this, event);"><a href="javascript:void(null);" onclick="javascript:biogps.resultpage.toggle_species(this, event);">{species}</a>&nbsp;&nbsp;</td><td>({count})&nbsp;&nbsp;&nbsp;&nbsp;</td><tr>',
            '</tpl>',
            '<tr><td>',
                '<a href="javascript: void(null);" onclick="javascript:biogps.resultpage.ToggleSelectAllSpecies(this, event);">Select all</a>',
            '</td></tr>',
            // '<tr><td>',
            //     '<a href="javascript: void(null);" onclick="javascript:biogps.resultpage.saveSpeciesSelection(this, event);">Remember current species selection</a>',
            // '</td></tr>',
            '<tbody>',
            '</form>',
            '</table>',
            '</div>',

            '<div id="generesult_table_container"></div>',

            //'<div id="temp_for_notfound"></div>',
            '<tpl if="values.notfound">',
                '<div id="generesult_footer">',
                '<p class="notfound_footer">Found no matches for {[values.notfound.length]} query term{[values.notfound.length>1?"s":""]}:<br />',
                '<span class="notfound_hint">(Try wildcard query?)</span><br />',
                '<tpl for="notfound">',
                '<div class="notfound_term">{.}</div>',
                '</tpl>',
                '</p>',
                '</div>',
            '</tpl>',
            {
                compiled: true,
                disableFormats: false,
                species_list: species_list
            }
        );

        if(this.rendered){
            var html = tpl.apply(this);

            var geneList = this.geneList;
            this.body.update(html, false, function(){
                var parent_el = Ext.get('result_panel');
                var tbl_container = Ext.get('generesult_table_container');
                tbl_container.anchorTo(parent_el, 'tl', [25, 0]);
                var tbl_html = biogps.resultpage.renderGeneTable();
                tbl_container.update(tbl_html, false, function(){
                    var tbl = Ext.fly('generesult_table');
                    sorttable.makeSortable(tbl.dom);
                    var species_selector = Ext.get('generesult_species_selector');
                    species_selector.anchorTo(tbl, 'tl', [700, 5]);
                    var footer = Ext.get('generesult_footer');
                    if (footer) {
                       footer.anchorTo(tbl_container, 'bl', [0, 5]);
                    }

                    biogps.Messenger.fireEvent('genelistrendered');
                    biogps.resultpage.genelistrendered = true;

                    //Goto genereport page directly if search result has just one gene
                    if (geneList.length==1){
                        biogps.renderGeneReport2(geneList[0].id);
                    }
                    else{
                        if (Ext.isIE) Ext.History.add('goto=searchresult');  //A fix for IE, otherwise it will switch back to welcome page after resultpanel is rendered (when search was submitted from welcome page)
                    }
                }, this);
            }, this);
        }
    },

    saveSpeciesSelection: function(el, evt){
        //save current species selection to user's profile.
        var species_selected = [];
        $("input[name='generesult_species_list']:checked").each(function(){species_selected.push($(this).val());});
        biogps.usrMgr.saveUserOptions({defaultspecies: species_selected});
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


