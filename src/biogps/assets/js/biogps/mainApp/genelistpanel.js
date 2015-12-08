NodeMouseEventPlugin = Ext.extend(Object, {
    init: function(tree) {
        if (!tree.rendered) {
            tree.on('render', function() {this.init(tree)}, this);
            return;
        }

        this.tree = tree;
        tree.body.on('mouseover', this.onTreeMouseover, this, {delegate: 'li.x-tree-node'});
    },

    onTreeMouseover: function(e, t, o) {
        var nodeEl = Ext.fly(t).down('div.x-tree-node-el');
        if (nodeEl) {
            var nodeId = nodeEl.getAttribute('tree-node-id', 'ext');
            if (nodeId) {
                this.tree.fireEvent('mouseover', this.tree.getNodeById(nodeId), e);
            }
        }
    }
});


biogps.ListPanelBase = function(config){
    this.ibar = []  //an array for inline toolbar.

    var default_cfg = {border:false,
                        split:true,
                        width: 225,
                        minSize: 175,
                        maxSize: 400,
                        rootVisible:false,
                        lines:true,
                        baseAtrchecked: true,
                        collapseFirst:false,
                        plugins: new NodeMouseEventPlugin()
    };
    Ext.apply(this, default_cfg);
    Ext.apply(this, config);
    biogps.ListPanelBase.superclass.constructor.call(this);

    this.on('mouseover', function(node, evt){
        if (node.isLeaf()){
            this.toggleNodeInlineToolBar(node);
        }
        evt.stopEvent();
        return false;
    }, this);

    //disable select action on non-leaf node
    //works only for DefaultSelectionModel
    this.getSelectionModel().on('beforeselect', function(sm, node){
         return node.isLeaf();
    },this);

    //checkbox on top-level toggles all its children nodes
    this.on('checkchange', function(node,checked){
        if (!node.isLeaf() && node.parentNode == this.root && node.childNodes.length>0){
            //if node is upper level.
            node.childNodes.each(function(_node){_node.ui.toggleCheck(checked);});
        }
    },this);


/*    this.on('contextmenu', this.onContextMenu, this);*/

};
Ext.extend(biogps.ListPanelBase, Ext.tree.TreePanel, {

    // prevent the default context menu
    afterRender : function(){
        biogps.ListPanelBase.superclass.afterRender.call(this);
        this.el.on('contextmenu', function(e){
            e.preventDefault();
        });
    },

    //toggle inline toolbar
    toggleNodeInlineToolBar: function(node){
        if (node) {
            var anchor_el = node.ui.getAnchor();
            var node_el = Ext.get(anchor_el.parentNode);

            anchor_el = Ext.get(anchor_el);
            var ibar_el = (node_el.last().id==node.id+'_ibar') ? node_el.last() : null;

            if (!ibar_el) {
                ibar_el = node_el.createChild({'tag':'div', id: node.id+'_ibar', cls:'node-inline-toolbar'});
                this.ibar.each(function(btn){
                    var _btn = ibar_el.createChild({tag: "button", cls:'node-inline-btn ' + btn.iconCls});
                    _btn.on('click', function(evt){
                            btn.fn.call(btn.scope, node);
                        },this, {stopPropagation: true,
                                stopEvent: true,
                                preventDefault: true
                    });
                },this);
            }

        }
    },

    /**
     * Remove a node from the tree, "beforeremove" and "remove" events can be used for customized actions associated with "remove".
     * @param {TreeNode or string} node  TreeNode object or the id of a TreeNode.
     * @param {boolean} preventAnim default false.
     */
    removeNode: function(nodeid, preventAnim){
        var node;
        if (nodeid.id)
            node = nodeid;
        else
            node = this.getNodeById(nodeid);
        if(node){
            node.unselect();
            if (!preventAnim){
                Ext.fly(node.ui.elNode).ghost('l', {
                    callback: function(){this.remove()}, //node.remove,
                    scope: node,
                    duration: .4
                });
            }
            else{
                node.remove();
            }
        }
    }
});


biogps.GeneListPanel = function() {
    biogps.GeneListPanel.superclass.constructor.call(this, {
        id : 'genelist-tree',
        region:'center',
        //title:'Current List',
        lines:false,
        root: new Ext.tree.TreeNode('GeneList Viewer'),
        tbar: [{
            iconCls:'icon-showreport',
            text: 'View',
            handler: function(){this.showGeneReport()},
            tooltip: 'View Gene Report',
            scope:this
        },{
            iconCls:'icon-undo',
            text: 'Undo',
            handler: this.loadLastGeneList,
            tooltip: 'Load last gene list',
            scope:this
        },{
            text: 'Save',
            iconCls: 'icon-save',
            id: 'genelist_save_btn',
            handler: this.saveGeneSet,
            tooltip: 'Save selected genes',
            disabled: true,
            scope:this
        }],
        ibar: [{
            iconCls: 'icon-remove-small',
            fn: function(node){this.removeNode(node);},
            scope: this
        }]
    });

    this.createRoot();

    /*this.getSelectionModel().on({
        'beforeselect' : function(sm, node){
             return node.isLeaf();
        },
        'selectionchange' : function(sm, node){
            if(node){
                this.fireEvent('geneselect', node.attributes);
            }
            //this.getTopToolbar().items.get('delete').setDisabled(!node);
        },
        scope:this
    });*/
    this.on({'beforeremove': function(){this.last_geneList = this.getCurrentGeneList();},
              'remove': function(){this.updateRoot();},
              scope: this});

    this.addEvents({geneclicked:true});
    this.on('click', function(node, evt){
        if (node.isLeaf()){
            this.fireEvent('geneclicked', node.attributes);
        }
    },this);

    biogps.usrMgr.linkWithAuthentication(this.init, this);

};

Ext.extend(biogps.GeneListPanel, biogps.ListPanelBase, {
    init: function(){
        if (biogps.usrMgr.is_anonymoususer){
            this.getTopToolbar().items.get('genelist_save_btn').disable();
        }
        else{
            this.getTopToolbar().items.get('genelist_save_btn').enable();
        }
    },



    /*
    selectGene: function(nodeid){
        this.getNodeById(nodeid).select();
    },

    selectAll: function(){
        this.genelist_node.eachChild(function(node){node.ui.checkbox.checked=true;})
    },

    deselectAll: function(){
        this.genelist_node.eachChild(function(node){node.ui.checkbox.checked=false;})
    },
*/

/*    removeGene: function(nodeid, preventAnim){
        var node;
        if (nodeid.ui)
            node = nodeid;
        else
            node = this.getNodeById(nodeid);
        if(node){
            _removeFn = function(){
                this.last_geneList = this.getCurrentGeneList();
                node.remove();
                this.updateRoot();
            };
            node.unselect();
            if (!preventAnim){
                Ext.fly(node.ui.elNode).ghost('l', {
                    callback: _removeFn,
                    scope: this,
                    duration: .4
                });
            }
            else{
                _removeFn();
            }
        }
    },*/

    createRoot: function(){
        this.genelist_node = this.root.appendChild(
        new Ext.tree.TreeNode({
            text:'All Genes',
            cls:'node-root-el',
            //cls:'genelist_root',
            checked: false,
            expanded:true
        }))
    },

    /**
     * returns an array of gene object based on current gene nodes.
     * @return geneList an array of gene object
     */
    getCurrentGeneList: function(){
        var current_glist = [];
        var gnodes = this.genelist_node.childNodes;
        if (gnodes.length > 0){
            for (var i=0;i<gnodes.length;i++){
                current_glist.push(gnodes[i].attributes);
            }
        }
        return current_glist;
    },

    removeAll: function(){
        //remember current genelist for undo if existing.
        this.last_geneList = this.getCurrentGeneList();

        this.root.removeChild(this.genelist_node);
        this.createRoot();
    },

    updateRoot: function(){
        this.genelist_node.setText(String.format('All ({0})', this.genelist_node.childNodes.length));
    },

    addGene : function(attrs, inactive, preventAnim){
        var exists = this.getNodeById(attrs.id);
        if(exists){
            if(!inactive){
                exists.select();
                exists.ui.highlight();
            }
            return;
        }
        Ext.apply(attrs, {
            iconCls: 'icon-gene',
            checked: false,
            leaf:true,
            qtip:'GeneID: '+attrs.id + '<br>' + attrs.name,
            id: attrs.id
        });
        var node = new Ext.tree.TreeNode(attrs);
        this.genelist_node.appendChild(node);
        if(!inactive){
            if(!preventAnim){
                Ext.fly(node.ui.elNode).slideIn('l', {
                    callback: node.select, scope: node, duration: .4
                });
            }else{
                node.select();
            }
        }
        return node;
    },

    /**
     * Merging two gene list without duplicates and also sorted by symbol
     * @param {array} glist1
     * @param {array} glist2
     * @return an array
     */
    mergeGeneList: function(glist1, glist2){
        var _gli = glist1.concat(glist2).sort(function(a,b){return a.symbol>b.symbol;});
        for (var i=1; i<_gli.length;i++){
            if (_gli[i-1].id == _gli[i].id) {
                _gli.splice(i, 1);
                i = i- 1;
            }
        }
        return _gli;
    },

    /**
     * Add all genes to the list from xml-formated queryreuslt string.
     * @param {object} queryresult queryresult must have geneList attributes.
     * @param {boolean} appending if true, append geneList to existing list.
     */
    loadGeneList: function(queryresult, appending){
        var glist;
        if (appending){
            glist = this.mergeGeneList(this.getCurrentGeneList(),queryresult.geneList);
        }
        else{
            glist= queryresult.geneList;
        }
        var MAX_GENE_COUNT = 1000;
        if (glist.length>MAX_GENE_COUNT){
            biogps.warning(String.format('At most {0} genes can be loaded at left-side panel. {1} extra genes are excluded.', MAX_GENE_COUNT, glist.length-MAX_GENE_COUNT));
        }
        this.removeAll();
        for(var i=0; i < Math.min(glist.length,MAX_GENE_COUNT); i++){
            gid = glist[i].id
            gsymbol = glist[i].symbol
            gname = glist[i].name
               this.addGene({id: gid,
                             symbol:gsymbol,
                             name:gname,
                          text: gsymbol
                          }, true, true);
        }
        this.updateRoot();
        //this.genelist_node.ui.toggleCheck(true);
        this.expand(true);
        this.doLayout();
    },

    /**
     * Load genelist from this.last_geneList if available.
     */
    loadLastGeneList: function(){
        if (this.last_geneList && this.last_geneList.length>0){
            this.loadGeneList({'geneList': this.last_geneList});
        }
    },

    loadFromGeneIDList: function(glist){
        var loadmask = new Ext.LoadMask(this.ownerCt.getEl(), {msg: 'Loading gene list...'});
        loadmask.show();

        biogps.callRemoteService({
           url: '/service/getgenelist/',
           params: {genelist: glist.join(',')},
           method: 'POST',
           timeout: 90000,
           fn: function(st){
                    var geneList = st.reader.jsonData;
                    this.loadGeneList(geneList);
                    loadmask.hide();
                    loadmask.destroy();
           },
           scope: this
        });

    },

    getSelectedGenes: function(){
       var selected_genes = [];
       this.genelist_node.eachChild(function(node){
           if (node.ui.checkbox.checked){
               selected_genes.push(node.id);
           }
           });
       return selected_genes;
    },

    showGeneReport: function(node){
       if (node && node.id){
              var selected_genes = [node.id];
       }
       else{
           var selected_genes = this.getSelectedGenes();
       }

       //tracking "view" button usage by Google Analytics
        //_gaq.push(['_trackEvent', 'BioGPS', 'GR_by_view_btn', selected_genes.length + '']);
        ga('send', 'event', 'BioGPS', 'GR_by_view_btn', selected_genes.length + '', {'nonInteraction': 1});

       if (selected_genes.length == 0){
               biogps.error('You did not select any gene. Please select and try again.');
       }
       else if (selected_genes.length > 10){
            biogps.error('You can only render at most 10 gene reports at one time. Please select fewer genes and try again.');
       }
       else{
            biogps.renderGeneReport2(selected_genes);
       }
    },

    saveGeneSet: function(){
        var selected_genes = this.getSelectedGenes();
        biogps.GeneSetMgr.saveGeneSet(selected_genes, this.tbar);
    }
});

biogps.GeneSetMgr = function(config) {
    this.id = '';
    Ext.apply(this, config);
    biogps.GeneSetMgr.superclass.constructor.call(this);
    this.addEvents({genesetsaved: true});
//    this.addEvents({load: true});
//    this.fireEvent('beforeload');
    this.on('genesetsaved', function(){biogps.geneset_panel.load();});
};
Ext.extend(biogps.GeneSetMgr, Ext.util.Observable, {

   doGenesetSave: function(cfg){
       if (!(biogps.genesetsavewin && biogps.genesetsavewin.el.parent()))
           return;

       var url, params;
       var method = 'POST';

       switch (cfg.mode){
           case 'new':
               var geneList = cfg.geneList;
               url = '/geneset/';
               params = {data: Ext.util.JSON.encode(geneList)};
               break;
           case 'union':
               var genesetid = cfg.genesetid;
               url = '/geneset/union/';
               //params = {genesetid: Ext.util.JSON.encode(genesetid)};
               params = {genelistid: genesetid};
               break;
           case 'intersection':
               var genesetid = cfg.genesetid;
               url = '/geneset/intersection/';
               params = {genelistid: genesetid};
               break;
           case 'update':
               var geneset = cfg.geneset;
               url = '/geneset/'+geneset.genesetid+'/';
               method = 'PUT';
               break;
           default:
               return;
       }

       if (!(Ext.getCmp('genesetsaveform_name').isValid())){
               biogps.error('Missing or wrong input gene list name! Correct and try again.');
            Ext.getCmp('genesetsaveform').form.reset();
       }
       else {
           biogps.genesetsavewin.body.mask('Saving gene list...');
           Ext.getCmp('genesetsaveform').getForm().submit({
            url: url,
            params: params,
            method: method,
            scope: this,
            success: function(form, action){
                if(action.result.success){
                    var genesetname = Ext.getCmp('genesetsaveform_name').getValue()
                    biogps.genesetsavewin.body.unmask();
                    biogps.genesetsavewin.body.mask(String.format('Gene list "{0}" saved!', genesetname));

                    setTimeout(function(){
                        biogps.genesetsavewin.body.unmask();
                        biogps.genesetsavewin.close();
                        }, 1000);
                    this.fireEvent('genesetsaved');
                }
                else{
                     biogps.genesetsavewin.body.unmask();
                     biogps.formfailure(action,
                                        errmsg = 'Saving Gene list failed! Try again.',
                                        onclose= function(){
                                                    if (biogps.genesetsavewin)
                                                        biogps.genesetsavewin.items.get(0).form.reset();
                                                        biogps.genesetsavewin.items.get(0).items.get(0).focus();
                                                });
                }
            },
            failure: function(form, action){
                 biogps.genesetsavewin.body.unmask();
                 biogps.formfailure(action,
                                    errmsg = 'Saving Gene list failed! Try again.',
                                    onclose= function(){
                                                Ext.getCmp('genesetsaveform').form.reset();
                                                Ext.getCmp('genesetsaveform').items.get(0).focus();
                                            });
            }
          });
       }
    },

    showSaveWin: function(cfg){
        var targetEl = cfg.targetEl;
        var fn = function(){this.doGenesetSave(cfg);};
        var _title, _name, _description;

        if (cfg.mode == 'new'){
            var geneList = cfg.geneList;
            if (geneList.length == 0){
                biogps.error('You did not select any gene to save. Please try again.');
                return;
            }
            else if (geneList.length > 1000){
                biogps.error('You can save at most 1000 genes in one gene list. Please select less genes and try again.');
                return;
            }
            _title = String.format('Save selected Genes ({0})', geneList.length);
        }
        else if (cfg.mode == 'union' || cfg.mode == 'intersection'){
            var genesetid = cfg.genesetid;

            if (!isArray(genesetid) || genesetid.length < 2){
                biogps.error('Select at least two gene lists for operation.');
                return;
            }
            else if (genesetid.length > 100){
                biogps.error('At most 100 gene lists can be operated at once.');
                return;
            }
            _title = String.format('Take {0} of selected gene lists ({1})', cfg.mode, genesetid.length);
            _name = String.format("{0}_Gene_List_{1}", Ext.util.Format.capitalize(cfg.mode), Ext.util.Format.date(new Date(), 'mdY'));
            _description = String.format('This gene list is created by taking {0} from ({1})', cfg.mode, genesetid.join(', '));
        }
        else if (cfg.mode == 'update'){
            var geneset = cfg.geneset;
            _title = "Update geneset";
            _name = geneset.name;
            _description = geneset.description;
        }
        else{
            return;
        }

        biogps.genesetsavewin = new Ext.Window({
                title: _title,
                layout: 'fit',
                width: 380,
                labelWidth: 200,
                modal: true,
                autoHeight: true,
                stateful: false,
                plain: true,
                grp: this,
                listeners: {
                    'show': {
                        buffer : 10,
                        fn: function(win){
                            //bind Enter hotkey
                            var kmap = new Ext.KeyMap(win.getEl(),[{
                                    key: 13,   //Enter key
                                    stopEvent: true,
                                    fn: fn,
                                    scope: this.grp
                                },{
                                    key: 27,   //ESC key
                                    stopEvent: true,
                                    fn:function(){
                                        biogps.genesetsavewin.close();
                                    }
                                }]
                            );
                            // Focus on text field
                            win.items.get(0).items.get(0).focus();
                        }
                    },
                    'destroy': function(){delete biogps.genesetsavewin;}
                },
                items: new Ext.FormPanel({
                    id:'genesetsaveform',
                    labelWidth: 120,
                    autoHeight: true,
                    bodyStyle:'padding:5px',
                    border : false,
                    items:[{
                                xtype:'textfield',
                                anchor: "90%",
                                fieldLabel: "Name your Gene list",
                                id:'genesetsaveform_name',
                                name: 'name',
                                value: _name,
                                allowBlank:false
                            },{
                                fieldLabel: "Description",
                                xtype: 'textarea',
                                anchor: "90%",
                                id: 'genesetsaveform_description',
                                name: 'description',
                                value: _description,
                                height: 100,
                                allowBlank:true
                            }],
                    buttons: [{
                                text:'Save',
                                handler: fn,
                                scope:this
                              },{
                                text: 'Cancel',
                                handler: function(){
                                            biogps.genesetsavewin.close();
                                         }
                              }]
                    })
        });

        biogps.genesetsavewin.show(targetEl);
        //biogps.genesetsavewin.focus();
        //biogps.genesetsavewin.items.get(0).items.get(0).focus()
    },

    saveGeneSet: function(geneList, targetEl){
        this.showSaveWin({mode: 'new',
                          targetEl: targetEl,
                          geneList: geneList});
    },

    unionGeneSet: function(genesetid, targetEl){
        this.showSaveWin({mode: 'union',
                          targetEl: targetEl,
                          genesetid: genesetid});
    },

    intersectionGeneSet: function(genesetid, targetEl){
        //check first if there are genes left after intersection.
        biogps.callRemoteService({
           url: '/geneset/intersection/',
           params: {genelistid: genesetid,
                    validate: '1'},
           method: 'POST',
           fn: function(st){
                  if (st.reader.jsonData.success){
                   this.showSaveWin({mode: 'intersection',
                                     targetEl: targetEl,
                                     genesetid: genesetid});
                  }
                  else {
                      biogps.error(st.reader.jsonData.error?st.reader.jsonData.error:'Failed to perform intersection on selected gene sets.');
                  }
           },
           scope: this
        })
    },

    editGeneSet: function(geneset, targetEl){
        this.showSaveWin({mode: 'update',
                          targetEl: targetEl,
                          geneset: geneset});
    },

    deleteGeneSet: function(geneset, callback, scope){
        var msg = String.format('Are you SURE you want to delete the "{0}" gene list?<br />This action CANNOT be undone!', geneset.name);
        Ext.MessageBox.confirm('Confirm',
            msg,
            function(ans){
                if (ans == 'yes'){
                    biogps.callRemoteService({
                        url: '/geneset/'+geneset.genesetid+'/',
                        method: 'DELETE',
                        fn: callback,
                        scope: scope
                    });
                }
            },
            this);
    },

    /**
     *
     * @param {} geneset
     * @param {} callback
     * @param {} scope
     */
    loadGenes: function(geneset, callback, scope){
        //Load genes from a geneset
        biogps.callRemoteService({
            url: '/geneset/'+geneset.genesetid+'/?geneinfo=1',
            method: 'GET',
            fn: callback,
            scope: scope
        });
    },

    /**
     * Load genes from a list of genesets by taking "union" or "intersection" (based on mode)
     * @param {array} geneset_list
     * @param {string} mode: either "union" or "intersection"
     * @param {function} callback function
     * @param {object} scope
     */
    loadGeneSets: function(geneset_list, mode, callback, scope, failure){
        var url;
        if (mode == 'intersection'){
            url = '/geneset/intersection/';
        }
        else if (mode == 'union'){
            url = '/geneset/union/';
        }
        else {
             biogps.error("Unknown mode parameter: " + mode);
             return;
        }

        biogps.callRemoteService({
           url: url,
           params: {genelistid: geneset_list,
                    geneinfo: 1},
           method: 'POST',
           fn: callback,
           failure: failure,
           scope: this
        });
    }


});

biogps.GeneSetMgr = new biogps.GeneSetMgr();

Ext.override(Ext.tree.MultiSelectionModel, {
    onNodeClick : function(node, e){
        this.select(node, e, true); //changed e.ctrlKey to true to always keep existing
    },

    select : function(node, e, keepExisting){
//        if(keepExisting !== true){
//            this.clearSelections(true);
//        }
        if(this.isSelected(node)){
            this.lastSelNode = node;
            this.unselect(node);  //added - if it's selected, then unselect it
        return node;
        }
        this.selNodes.push(node);
        this.selMap[node.id] = node;
        this.lastSelNode = node;
        node.ui.onSelectedChange(true);
        this.fireEvent("selectionchange", this, this.selNodes);
        return node;
    }
});


biogps.GeneSetPanel = function() {
    biogps.GeneSetPanel.superclass.constructor.call(this, {
        id:'geneset-tree',
        region:'south',
        title:'Saved Gene Lists',
        lines: true,
        height: 300,
//        collapsible: true,
//        collapseMode:'mini',
//        split: true,
        selModel: new Ext.tree.MultiSelectionModel(),
        simpleSelect: true,
        root: new Ext.tree.TreeNode('GeneSet Viewer'),
//        root: new Ext.tree.AsyncTreeNode({text: 'Layout Tree',
//                                          draggable: false,
//                                          id:'root'}),
//        loader: new Ext.tree.TreeLoader({dataUrl: '/genesettree/'}),
//        animate: true,
//        enableDD: true,
//        enableDrop: true,
//        dropConfig:{appendOnly:true},

        /*tbar option 1
        tbar: [{
//            text: 'All',
//            tooltip: 'Select all',
//            handler: this.selectAll,
//            scope:this
//        },{
//            text: 'None',
//            tooltip: 'DeSelect all',
//            handler: this.deselectAll,
//            scope:this
//        },{
            text: 'Load/Union',
            handler: this.union,
            scope:this
        },{
//            text: 'Union',
//            handler: this.union,
//            scope:this
//        },{
            text: 'Intersection',
            handler: this.intersection,
            scope:this
        },{
            text: 'Refresh',
            iconCls: 'icon-refresh',
            handler: this.load,
            scope:this
        },'-',{

            text:'Remove',
            handler: this.remove,
            iconCls: 'icon-remove',
            scope: this
        },{
            text: 'Edit',
            handler: this.edit,
            iconCls: 'icon-edit',
            scope:this

//        },{
//            text: 'More',
//            menu: [{
//                text: 'Union',
//                handler: this.union,
//                scope:this
//            },{
//                text: 'Intersection',
//                handler: this.intersection,
//                scope:this
//            },'-',{
//                text: 'Refresh',
//                handler: this.load,
//                scope:this
//	        },{
//	            text:'Remove',
//	            handler: this.remove,
//	            scope: this
//	        },{
//	            text: 'Edit',
//	            handler: this.edit,
//	            scope:this
//            }]
        }]*/

        /* tbar option 2*/
        tbar: [
        new Ext.Toolbar.SplitButton({
            text: 'Load',
            handler: this.union,
            scope: this,
            tooltip: 'Load genes from selected gene list',
            iconCls: 'icon-load',
            menu : {
                items: [{
                    text: 'Union',
                    handler: this.union,
                    scope:this,
                    iconCls: 'icon-intersection'
                    //tooltip: 'Load genes from selected gene list by taking union'
                },{
                    text: 'Intersection',
                    handler: this.intersection,
                    scope:this,
                    iconCls: 'icon-intersection'
                    //tooltip: 'Load genes from selected gene list by taking intersection'
                },'-','Options:',{
                    text: 'Append genes',
                    id: 'cbx_genelist_appending',
                    checked: false,
                    listeners: {'render': {fn: function(item){this.cbx_genelist_appending=item;},
                                           scope: this}
                              },
                    handler: function(item,evt){item.setChecked(!item.checked);return false;},
                    scope: this
                }]}
        }),{
            text: 'Export',
            handler: this.export_csv,
            iconCls: 'icon-export',
            tooltip: 'Export genes from selected gene list as csv',
            scope: this
        }
        /*,{
            text: 'Edit',
            handler: this.edit,
            iconCls: 'icon-edit',
            tooltip: 'edit selected gene list',
            scope: this
        },{
            text:'Remove',
            handler: this.remove,
            iconCls: 'icon-remove',
            tooltip: 'remove selected gene list',
            scope: this
        },{
            text: 'Refresh',
            iconCls: 'icon-refresh',
            handler: this.load,
            tooltip: 'Reload gene lists',
            scope:this
        }*/
        ],
    ibar: [{
            iconCls: 'icon-edit-small',
            fn: this.edit,
            scope: this
        },{
            iconCls: 'icon-remove-small',
            fn: this.remove,
            scope: this
        }]
    });

    this.createRoot();
    biogps.usrMgr.linkWithAuthentication(this.init, this);

    this.on({
            'remove': function(){this.updateRoot();},
            'click': function(node, evt){
                if (node.isLeaf()){
                    node.ui.checkbox.checked = !node.ui.checkbox.checked;
                }
            },
            'checkchange': function(node,checked){
                if (node.parentNode == this.root && node.childNodes.length>0){
                    //if node is upper level.
                    node.childNodes.each(function(_node){_node.ui.toggleCheck(checked);});
                }
                else if (node.isLeaf()){
                    if (checked){
                        this.selModel.select(node);
                        node.ui.highlight();
                    }
                    else{
                        this.selModel.unselect(node);
                    }
                }
            }, scope: this});

    this.on('dblclick', function(node, evt){
        this.loadOneGeneset(node);
        node.ui.toggleCheck(true);
    },this);

};

Ext.extend(biogps.GeneSetPanel, biogps.ListPanelBase, {

    init: function(){
        if (biogps.usrMgr.is_anonymoususer){
            this.removeAll();
            this.mylist.appendChild(
                new Ext.tree.TreeNode({
                    //text:'You need to log in to save gene list.',
                    text: 'Available after logging in.',
                    disabled:true
                }));
            this.getTopToolbar().disable();
            this.mylist.disable();
        }
        else{
            this.load();
        }
    },

    isGenesetNode: function(node){
        return node && node.attributes.genesetid;
    },

    createRoot: function(){
        this.mylist = this.root.appendChild(
            new Ext.tree.TreeNode({
                text:'All Gene Lists',
                cls:'node-root-el',
                checked: false,
                expanded:true
            })
        );
    },

    getSelectedGeneSets: function(returnnodes){
//        return this.getChecked(returnnodes?null:'genesetid', this.mylist)
        var selected_genesets = [];
        this.mylist.eachChild(function(node){
            if (node.ui.checkbox.checked){
                if (returnnodes){
                    selected_genesets.push(node);
                }
                else{
                    selected_genesets.push(node.attributes.genesetid);
                }
            }
            });
        return selected_genesets;
    },

    onlyOneSelected: function(){
        var gs_li = this.getSelectedGeneSets(returnnodes=true);
        if (gs_li.length == 0){
            biogps.error('Please select a gene list first.');
        }
        else if (gs_li.length > 1){
            biogps.error('Please select only one gene list to continue.');
        }
        else {
            return gs_li[0];
        }
    },

    removeAll: function(){
        this.suspendEvents();      //prevent fireing remove event
        this.root.removeChild(this.mylist);
        this.resumeEvents();
        this.createRoot();
    },

    updateRoot: function(){
        this.root.firstChild.setText(String.format('All ({0})', this.mylist.childNodes.length));
    },


    addNode : function(attrs, inactive, preventAnim){
        var exists = this.getNodeById(attrs.id);
        if(exists){
            if(!inactive){
                exists.select();
                exists.ui.highlight();
            }
            return;
        }
        Ext.apply(attrs, {
            iconCls: 'icon-geneset',
            checked: false,
            leaf:true,
            qtip: attrs.description,
            id: 'geneset_' + attrs.genesetid,
            text: attrs.name + ' (' + attrs.size + ')'
        });
        var node = new Ext.tree.TreeNode(attrs);
        this.mylist.appendChild(node);
        if(!inactive){
            if(!preventAnim){
                Ext.fly(node.ui.elNode).slideIn('l', {
                    callback: node.select, scope: node, duration: .4
                });
            }else{
                node.select();
            }
        }
        return node;
    },

    load: function(queryresult){
        biogps.callRemoteService({
            url: '/getmygenesets/',
            fn: _loadlist,
            scope: this
        });

        function _loadlist(st){
            var geneset_list = st.reader.jsonData;
            this.removeAll();
            for(var i=0; i < geneset_list.length; i++){
                this.addNode({genesetid:geneset_list[i].id,
                              name: geneset_list[i].name,
                              description: Ext.util.Format.ellipsis(geneset_list[i].description, 100),
                              size: geneset_list[i].size
                              }, true, true);
            }
            this.updateRoot();
            this.expand(true);
            this.doLayout();
        }
    },

//    union: function(){
//    	var gs_li = this.getSelectedGeneSets();
//        biogps.GeneSetMgr.unionGeneSet(gs_li, this.tbar);
//    },
//
//    intersection: function(){
//        var gs_li = this.getSelectedGeneSets();
//        biogps.GeneSetMgr.intersectionGeneSet(gs_li, this.tbar);
//    },


    edit: function(s){
        if (!(s && s.attributes)){
            //if the first parameter is not passed as a node, get current selected
            s = this.onlyOneSelected();
        }

        if (s && s.attributes.genesetid){
            biogps.GeneSetMgr.editGeneSet(s.attributes, this.tbar);
        }
    },

    remove: function(s){
        if (!(s && s.attributes)){
            //if the first parameter is not passed as a node, get current selected
            s = this.onlyOneSelected();
        }

        if (s && s.attributes.genesetid){
            biogps.GeneSetMgr.deleteGeneSet(s.attributes, callback, this);
        }
        function callback(st){
            data = st.reader.jsonData;
            if (data.success){
                this.removeNode(s.id);
            }
            else {
                biogps.error(data.error?data.error:'');
            }
        };
    },

    getLoadAppendingFlag: function(){
        return this.cbx_genelist_appending?this.cbx_genelist_appending.checked:false;
    },

    loadOneGeneset: function(s){
        if (s && s.attributes.genesetid){
            var loadmask = new Ext.LoadMask(this.ownerCt.getEl(), {msg: 'Loading gene list...'});
            loadmask.show();
            var appending = this.getLoadAppendingFlag();
            if (s.attributes.cachedGeneList){
                biogps.genelist_panel.loadGeneList(s.attributes.cachedGeneList, appending);
                loadmask.hide();
                loadmask.destroy();
            }
            else {
                function callback (st){
                    geneset = st.reader.jsonData;
                    var geneList = {totalCount: geneset.data.length, geneList:geneset.data};
                    s.attributes.cachedGeneList = geneList;
                    biogps.genelist_panel.loadGeneList(geneList, appending);
                    loadmask.hide();
                    loadmask.destroy();
                }
                biogps.GeneSetMgr.loadGenes(s.attributes, callback, this);
            }
        }
    },

    loadGeneSets: function(mode){
        var gs_li = this.getSelectedGeneSets();
        if (!isArray(gs_li) || gs_li.length == 0){
            biogps.error('Please select a gene list first.');
            return;
        }

        if (mode=='intersection' && gs_li.length < 2){
            biogps.error('Select at least two gene lists for operation.');
            return;
        }

        if (gs_li.length == 1 && mode != 'intersection'){
            //just load one geneset
            var s = this.onlyOneSelected();
            this.loadOneGeneset(s);
            return;
        }

        //now load multiple genesets by taking union or intersection
        var loadmask = new Ext.LoadMask(this.ownerCt.getEl(), {msg: 'Loading gene list...'});
        loadmask.show();
        var appending = this.getLoadAppendingFlag();
        function callback (st){
            genedata = st.reader.jsonData;
            var geneList = {totalCount: genedata.genes.length, geneList:genedata.genes};
            biogps.genelist_panel.loadGeneList(geneList, appending);
            loadmask.hide();
            loadmask.destroy();
        }
        function failure(){
            loadmask.hide();
            loadmask.destroy();
        }
        biogps.GeneSetMgr.loadGeneSets(gs_li, mode, callback, this, failure);
    },

    intersection: function(){
        this.loadGeneSets(mode='intersection');
    },

    union: function(){
        this.loadGeneSets(mode='union');
    },

    export_csv: function(){
        //open the download link in a new window
        var gs_li = this.getSelectedGeneSets();
        if (!isArray(gs_li) || gs_li.length == 0){
            biogps.error('Please select a gene list first.');
            return;
        }
        var url = '/geneset/download/?'+Ext.urlEncode({'genelistid': gs_li});
        window.location = url;
    }

});
