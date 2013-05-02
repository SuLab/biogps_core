//if (Ext.isDefined(window.Window)){
//Ext.override(Window, {
//  maximize: function() {
//    if (this.isMinimized() || this.resizing)
//      return;
//
//    if (Prototype.Browser.IE && this.heightN == 0)
//      this._getWindowBorderSize();
//
//    if (this.storedLocation != null) {
//      this._restoreLocation();
//      if(this.iefix)
//        this.iefix.hide();
//    }
//    else {
//      this._storeLocation();
//      Windows.unsetOverflow(this);
//
//      var windowScroll = WindowUtilities.getWindowScroll(this.options.parent);
//      var pageSize = WindowUtilities.getPageSize(this.options.parent);
//      var left = windowScroll.left;
//      var top = windowScroll.top;
//
//      if (this.options.parent != document.body) {
//        windowScroll =  {top:0, left:0, bottom:0, right:0};
//        var dim = this.options.parent.getDimensions();
//        pageSize.windowWidth = dim.width;
//        pageSize.windowHeight = dim.height;
//        top = 0;
//        left = 0;
//      }
//      if (this.constraint) {
//        pageSize.windowWidth -= Math.max(0, this.constraintPad.left) + Math.max(0, this.constraintPad.right);
//        pageSize.windowHeight -= Math.max(0, this.constraintPad.top) + Math.max(0, this.constraintPad.bottom);
//        left +=  Math.max(0, this.constraintPad.left);
//        top +=  Math.max(0, this.constraintPad.top);
//      }
//
//      var width = pageSize.windowWidth - this.widthW - this.widthE;
//      var height= pageSize.windowHeight - this.heightN - this.heightS;
//
//      /*****some adjustment for windows in a genereport panel*****/
//      width = width - 20;
//      var parent_top = Ext.get(this.options.parent).getTop();
//      top = Math.max(top, biogps.centerTab.getActiveTab().el.getTop()-parent_top);
//	  height = Math.min(height, biogps.centerTab.el.getHeight()-(top+parent_top)) - 20;
//      /*****end of adjustment*****/
//
//      if (this.useLeft && this.useTop && Window.hasEffectLib && Effect.ResizeWindow) {
//        new Effect.ResizeWindow(this, top, left, width, height, {duration: Window.resizeEffectDuration});
//      }
//      else {
//        this.setSize(width, height);
//        this.element.setStyle(this.useLeft ? {left: left} : {right: left});
//        this.element.setStyle(this.useTop ? {top: top} : {bottom: top});
//      }
//
//      this.toFront();
//      if (this.iefix)
//        this._fixIEOverlapping();
//    }
//    this._notify("onMaximize");
//
//    // Store new location/size if need be
//    this._saveCookie()
//  }
//});
//}

biogps.Gene = function(config) {
    this.id = '';
    Ext.apply(this, config);
    biogps.Gene.superclass.constructor.call(this);
    this.addEvents({beforeload: true});
    this.addEvents({load: true});
    this.fireEvent('beforeload');
};
Ext.extend(biogps.Gene, Ext.util.Observable, {
    load: function(id){
        //load gene object from remote service
        biogps.callRemoteService({
                                  url: '/boe/getgeneidentifiers/?format=json&geneid=' + (id || this.id),
                                  fn: function(st){
                                        Ext.apply(this, st.reader.jsonData);
                                        this.fireEvent('load', this);
                                    },
                                  scope:this});
    },

    getEntryGene: function(species){
        //return the gene object matches with EntryGeneID
        var species_list = null;
        if (isArray(species)){
            species_list = species;
        }
        else if (isString(species)){
            species_list = [species];
        }
        else{
            if (this.EntrySpecies)
                species_list = [this.EntrySpecies];
            else
                species_list = this.SpeciesList;
        }

        var entrygene = null;
        if (species_list && this.EntryGeneID){
            for (var i=0; i<species_list.length; i++){
                var gene_list = this[species_list[i]];
                if (isArray(gene_list)){
                    for (var j=0; j<gene_list.length; j++) {
                        if ((gene_list[j].entrezgene == this.EntryGeneID) || (gene_list[j].ensemblgene == this.EntryGeneID)){
                            return gene_list[j];
                        }
                    }
                }
            }
        }
    }
});


biogps.loadSampleGene = function(config) {
    /**
     * @method
     * @param {function} callback Function to execute after loading the gene
     */
    var gid, onloadcallback, scope, species;
    gid = config.id || 1017; //default, CDK2
    onloadcallback = config.callback || Ext.emptyFn;
    scope = config.scope;
    species = config.species;

    //get proper sample gene id based on species
    if (species && biogps.SAMPLE_GENE &&
        biogps.SAMPLE_GENE[species]){
        //if available, set species_specific sample gene
        gid = biogps.SAMPLE_GENE[species];
    }

    //now load sample_gene object if not loaded before
    if (!(biogps.sample_gene && biogps.sample_gene.id == gid)){
    //if (!biogps.sample_gene) {
        biogps.sample_gene = new biogps.Gene({id: gid});
        biogps.sample_gene.on('load', onloadcallback, scope);
        biogps.sample_gene.load();
    }
    else {
        onloadcallback.call(scope);
    }
};


biogps.Plugin = function(config) {
    this.id = '';
    this.title = '';
    this.url = '';          //before keyword substitution
    this.author = '';
    this.author_url = '';
    this.type = 'iframe';   //default to iframe type
    this.description = '';
    this.options = {};
        //possible option values:
        //  speciesOnly: 'human'   //for some plugin only relevant to one species
        //  allowedSpecies: ['mouse']  //for some plugin only relevant to a subset of available species
        //  securityAware: 'true'   //for some plugin need to be passed with sessionid for security validation
        //  mobile_url: <string>    //for alternative url template for mobile page
        //  certified_owner: true|false   //flag for certified owner (the owner who truely own the website of the plugin)
    this.useroptions=null;
        //useroptions allow users customize the behavior of the plugin in their layouts if possible.
    this.runtimeoptions=null;
        //runtimeoptions allow user change behavior of plugin rendering (e.g. speceisOnly parameter) at runtime, but it won't be saved.
    this.permission = null;
    this.lastmodified = '';
    this.tags='';
    this.usage_percent = {};
    this.usage_layout_count=0;
    this.usage_ranking=0;
    this.usage_users=0;
    this.related_plugins = {};

    this.left;
    this.top;
    this.width;
    this.height;

    this.separator = '+';     // the separator used in url to separate multiple identifiers

    Ext.apply(this, config);
    if (this.name && isString(this.name)){
        this.title = this.name;
    }
    if (this.options && isString(this.options)){
        this.options = Ext.util.JSON.decode(this.options);
    }
    if (this.options == '' | this.options == null)
        this.options = {};
    biogps.Plugin.superclass.constructor.call(this);

    //initilize this.runtimeoptions.currentSpecies if this.useroptions.currentSpecies is set
    if (this.useroptions && this.useroptions.currentSpecies){
        this.runtimeoptions = this.runtimeoptions || {};
        this.runtimeoptions.currentSpecies = this.useroptions.currentSpecies;
    }

    this.addEvents({load: true});           //fired when a plugin data is loaded from web service
    this.addEvents({keyworderror: true})    //fired when a keyword substitution on url fails.
    this.addEvents({error: true})           //fired when any other error occurs.


    //private methods
    this.is_secure_cookie_set = function(){
        var cookie_list = document.cookie.split(';').walk(function(s){return s.trim();});
        return cookie_list.indexOf('secure_plugin_client_session='+biogps.get_sessionid()) != -1
    }

    this.set_secure_cookie = function(){
        //set a secure "gnf.org" domain cookie
        if (!this.is_secure_cookie_set()){
            //this.secure_cookie_ready=false;
            biogps.callRemoteService({
                url: '/utils/d9d7fd01be668950e3ea61c574e8eca9/',
                fn: function(){this.fireEvent('secure_cookie_set');},
                scope: this
            });
        }
    }

};

Ext.extend(biogps.Plugin, Ext.util.Observable, {

    /**
     * Load plugin from remote service.
     * Fire load event when success.
     * Fire loadfailed event when failed
     * @method
     * @param {integer} id
     */
    load: function(id){
        id = id || this.id;
        biogps.callRemoteService({url: '/plugin/' + id.toString() +'/?format=json',
                                  fn: function(st){
                                  		var data = st.reader.jsonData;
                                  		if (data) {
	                                        Ext.apply(this, st.reader.jsonData);
	                                        //some changes for back-compatibility
	                                        this.title = this.name;
	                                        this.author = this.owner.name;
	                                        this.author_url = this.owner.url;
//                                            this.is_shared = data.items[0].fields.is_shared;
//                                            this.usage_percent = data.items[0].fields.usage_percent;
//                                            this.usage_layout_count = data.items[0].fields.usage_layout_count;
//                                            this.usage_ranking = data.items[0].fields.usage_ranking;
//                                            this.usage_users = data.items[0].fields.usage_users;
//                                            this.related_plugins = data.items[0].fields.related_plugins;
	                                        this.fireEvent('load', this);
                                        }
                                        else {
                                            this.fireEvent('loadfailed', id);
                                        }
                                       },
                                   scope: this});
    },

    getKeywords: function(url){
        url = url || this.url;
        if (url){
            var kwd_list = url.match(/(\{\{[\w|:.]+\}\})/g);
            return kwd_list;
        }
        else {
            return null;
        }
    },

//   /**
//    * Get a cleaned keyword without "{{" and ""}}".
//    * @param {string} keyword
//    */
//    cleanKeyword: function(keyword){
//        var _kwd = keyword.trim();
//        var a,b;
//        if (_kwd.substring(0,2) == '{{')
//            a = 2;
//        else
//            a = 0;
//        if (_kwd.substring(_kwd.length-2,_kwd.length) == '}}')
//            b = _kwd.length-2;
//        else
//            a = _kwd.length;
//
//        _kwd = _kwd.substring(a,b);
//        return _kwd;
//    },

	getPreviewUrl: function() {
        return this.geturl(biogps.sample_gene);
	},

    _get_value: function(kwd, gene){
        this.idx_filter_separator='.';       // e.g., {{MGI.1}}
        this.value_field_separator=':';      // e.g., "MGI:104772"

        var k = kwd.trim().toLowerCase();
        var _idx_filter = null;
        if (k.split(this.idx_filter_separator).length == 2){
            //support for something like "{{MGI:2}}"
            //will take only "104772" part of "MGI:104772" value
            var _k = k.split(this.idx_filter_separator);
            k = _k[0];
            _idx_filter = parseInt(_k[1]);
        }
        if (gene[k]){
            var value = gene[k];
            if (isArray(value)){
                if (_idx_filter){
                    for (var i=0;i<value.length;i++){
                        value[i] = value[i].split(this.value_field_separator)[_idx_filter];
                    }
                }
                value = value.join(this.separator);
            }else{
                if (_idx_filter){
                    value = value.split(this.value_field_separator)[_idx_filter];
                }
            }
            return value;
        }
    },

    geturl: function(gene) {
        //do keyword substitution with the given gene object
        var _url=null;
        var kwd;
        var _kwd;
        if (gene){
            //var kwd = this.getKeyword();
            var kwd_list = this.getKeywords();
            if (kwd_list && kwd_list.length>0){
                var species = this.getCurrrentSpecies(gene, true);
                if (species){
                    //var current_gene = gene.getEntryGene(species);

                	//This block return only the first gene in case of multiple genes for the same species
                    /*var current_gene = gene[species][0];
                    if (current_gene){
		                for (var i=0; i<kwd_list.length; i++){
		                    kwd = kwd_list[i];             //with {{ }}
		                    _kwd = kwd.substring(2, kwd.length-2);    //without {{ }}
		                    //_kwd can be in the form of 'kwd1|kwd2". If kwd1 is not available, use kwd2 instead
		                    _url = null;
		                    rawurl = this.url;
                            //console.log(i, rawurl)
                            console.log(i, _url)
		                    _kwd.split('|').each(function(k){
		                        if (!_url) {
		                            k = k.trim();
                                    if (current_gene[k]){
		                                var value = current_gene[k];
		                                if (isArray(value))
		                                    value = value.join(this.separator);
		                                _url = rawurl.replace(kwd, value);
		                            }
		                        }
		                    }, this);
		                }
                    }*/

                    this.current_species = species;    //to record current species rendered.
                    var current_gene = gene[species][0];
                    _url = this.url;
                    if (current_gene){
                        for (var i=0; i<kwd_list.length; i++){
                            kwd = kwd_list[i];             //with {{ }}
                            _kwd = kwd.substring(2, kwd.length-2);    //without {{ }}
                            //_kwd can be in the form of 'kwd1|kwd2". If kwd1 is not available, use kwd2 instead
                            var _kwd_list = _kwd.split('|')
                            for (var j=0; j<_kwd_list.length; j++){
                                value = this._get_value(_kwd_list[j], current_gene)
                                if (value){
                                    _url = _url.replace(kwd, value);
                                    break;
                                }
                            }
                            // _kwd.split('|').forEach(function(k){
                            //     value = this._get_value(k, current_gene)
                            //     if (value)
                            //         _url = _url.replace(kwd, value);
                            // }, this);
                        }
                    }



                    //This block return cancatenated IDs from all genes in case of multiple genes for the same species
                    /*//Disable for now
                    var current_gene = gene[species]  //an array of actual gene object, although for most of cases, only one object in the array, there are cases multiple genes for the same species in one othology group.
                    if (current_gene){
		                for (var i=0; i<kwd_list.length; i++){
		                    kwd = kwd_list[i];             //with {{ }}
		                    _kwd = kwd.substring(2, kwd.length-2);    //without {{ }}
		                    //_kwd can be in the form of 'kwd1|kwd2". If kwd1 is not available, use kwd2 instead
		                    _url = null;
		                    rawurl = this.url;
		                    _kwd.split('|').each(function(k){
		                        if (!_url) {
		                            k = k.trim();
		                            if (current_gene.length == 1){
                                    //if (current_gene[k]){
		                                var value = current_gene[0][k];
		                                if (isArray(value))
		                                    value = value.join(this.separator);
		                                _url = rawurl.replace(kwd, value);
		                            }
		                            else {
		                            	//multiple gene objects for one species
		                            	var value = [];
		                            	current_gene.each(function(g){
		                            		var _value = g[k];
		                            		if (isArray(_value)){
		                            			value += _value;
		                            		}
		                            		else{
		                            			value.push(_value);
		                            		}
		                            	});
		                            	value = value.join(this.separator);
		                            	_url = rawurl.replace(kwd, value);
		                            }
		                        }
		                    }, this);
		                }
                    }
                    */

                }
            }
        }
        else {
            throw new Ext.Error('no-sample-gene',"plugin.geturl(gene) was called without a value for 'gene'.")
        }

//        if (_url == null){
//            this.fireEvent('keyworderror');
//            //this.fireEvent('error', {errormsg: String.format('Failed keyword substitution on plugin url.<br>Plugin: "{0}"', this.title)});
//        }

        if (this.getKeywords(_url) != null){
            this.fireEvent('keyworderror');
            return;
        }

        else {
            if (this.options.securityAware == true){
            	//set a secure "gnf.org" domain cookie
                this.set_secure_cookie();
            }
        }
        return _url;
    },

    /**
     * Deprecated. A wrapper for validateUrl but only return true or false.
     * @return {boolean} true or false.
     */
    isValidUrl: function(){
        return (this.validateUrl()==true);
    },

    /**
     * Validate url template against available plugin keywords
     * @return {mixed} true or an error msg.
     */
    validateUrl: function(){
        var valid = true;
        var errmsg = null;
        var kwd_list = this.getKeywords();
        if (kwd_list && Ext.isArray(kwd_list)){
            var all_kwd_list = [];
            var kwd, _kwd;
            biogps.PLUGINKEYWORDS_common.concat(biogps.PLUGINKEYWORDS_other).each(function(item){
                all_kwd_list.push(item.key.substring(2,item.key.length-2));
            });
            all_kwd_list.push('EntrezGeneID');         //included for back-compatibility

            for (var i=0; i<kwd_list.length; i++){
                kwd = kwd_list[i];             //with {{ }}
                _kwd = kwd.substring(2, kwd.length-2);    //without {{ }}
                _kwd.split('|').each(function(item){
                    if (all_kwd_list.indexOf(item.trim()) == -1){
                        valid = false;
                        errmsg = String.format('Un-recognized keyword: "{0}".', item);
                    }
                });
            }
        }
        if (valid)
            return true;
        else
            return errmsg;
    },

    hasPositioning: function() {
        return (this.top && this.left && this.width && this.height)!=null;
    },

    getPositioning: function() {
        return {left: this.left,
                 top: this.top,
                 width: this.width,
                 height: this.height};
    },

    isOneSpeciesOnly: function() {
        // Return true if this plugin is only available for one species
        return (this.species != null && this.species.length == 1);
    },

    getAllowedSpecies: function(applyuseroptions){
        var allowedspecies = this.species ? this.species : biogps.AVAILABLE_SPECIES;
        if (allowedspecies.length>1 &&
            applyuseroptions == true &&
            this.useroptions &&
            this.useroptions.speciesOnly &&
            allowedspecies.indexOf(this.useroptions.speciesOnly) != -1){
            allowedspecies = [this.useroptions.speciesOnly];
        }
//        if (allowedspecies.length>1 &&
//              this.runtimeoptions &&
//            this.runtimeoptions.speciesOnly &&
//            allowedspecies.indexOf(this.runtimeoptions.speciesOnly) != -1){
//            allowedspecies = [this.runtimeoptions.speciesOnly];
//        }

        return allowedspecies;
    },

    isSpeciesAllowed: function(species){
        return (this.getAllowedSpecies().indexOf(species)!=-1);
    },
    /**
     * Get a list of available species under the context of input gene object.
     * @param {object} gene
     * @param {bool} applyuseroptions
     */
    getAvailableSpecies: function(gene, applyuseroptions){
	    var allowed_species_list = this.getAllowedSpecies(applyuseroptions);
	    var available_species = [];
        var gene_species_list = gene.SpeciesList;
        if (gene_species_list){
		    for (var i=0;i<allowed_species_list.length;i++){
		        if (gene_species_list.indexOf(allowed_species_list[i]) != -1){
		            available_species.push(allowed_species_list[i]);
		        }
		    }
        }
        return available_species;
    },

    /**
     * Get the current species to render under the context of input gene object.
     * if this.runtimeoptions.currentSpecies is set and available for the input gene,
     * using that one, otherwise take the first available from the allowed species list.
     * @param {object} gene
     * @param {bool} applyuseroptions
     */
    getCurrrentSpecies: function(gene, applyuseroptions){
        var available_species_list = this.getAvailableSpecies(gene, applyuseroptions);
        var species = null;
        if (this.runtimeoptions && this.runtimeoptions.currentSpecies &&
            available_species_list.indexOf(this.runtimeoptions.currentSpecies) != -1){
                species = this.runtimeoptions.currentSpecies;
        }
        else if (available_species_list.length>0){
            if (gene.EntrySpecies && available_species_list.indexOf(gene.EntrySpecies) != -1){
                species = gene.EntrySpecies;
            }
            else{
                species = available_species_list[0];
            }
        }
        return species;
    },

    /**
     * Return allowed species based on the keyword used in URL template. E.g. "MGI" is a mouse-only keyword.
     * Returns null if all species are allowed.
     * This should be called on a valid url.
     * @return null or array
     */
    getAllowedSpeciesOnKeyword: function(){
        var allowed_species = null;
        var kwd_list = this.getKeywords();
        if (kwd_list && Ext.isArray(kwd_list)){
            var kwd, _kwd;
            var all_kwd_list = new Ext.util.MixedCollection(false, function(obj){return obj.key.substring(2, obj.key.length-2);});
            all_kwd_list.addAll(biogps.PLUGINKEYWORDS_common.concat(biogps.PLUGINKEYWORDS_other));
            for (var i=0; i<kwd_list.length; i++){
                kwd = kwd_list[i];             //with {{ }}
                _kwd = kwd.substring(2, kwd.length-2);    //without {{ }}
                _kwd.split('|').each(function(item){
                    var kwd_obj = all_kwd_list.get(item);
                    if (kwd_obj && Ext.isArray(kwd_obj.allowedSpecies)){
                        allowed_species = kwd_obj.allowedSpecies;
                    }
                });
            }
        }
        return allowed_species;
    },

    render_preview: function(gene, parentEl){
        //if parentEl is provided, open a in page window, otherwise open a new browser window.
        if (!parentEl){
            if (this.type == 'iframe'){
                var url = this.geturl(gene);
                if (url) {
                    window.open(url,'','scrollbars=yes,menubar=no,height=600,width=800,resizable=yes,toolbar=no,location=no,status=no');
                }
            }
        }
        else {
/*            var _old_maxzindex;
            var url = this.geturl(gene);
            if (url){
                var preview_win = new Window({id: 'preview_'+Math.floor(Math.random()*10000).toString(),
                                               className: 'dialog',
                                               title: this.title,
                                               width: 350,
                                               height:250
                                              });
                if(this.type == 'iframe'){
                    preview_win.setURL(url);
                }
                else{
                    preview_win.setHTMLContent('<h2>Currently only "iframe" type of plugin has preview.</h2>');
                }

                var winid = preview_win.getId();
                if (Ext.fly(winid+'_sizer') && Ext.fly(winid+'_sizer').getStyle('cursor') != 'se-resize')
                    Ext.fly(winid+'_sizer').setStyle('cursor', 'se-resize');

                _old_maxzindex = Windows.maxZIndex + 1;
                preview_win.setDestroyOnClose();
                preview_win.showCenter();
                Windows.previewWinIndex = Windows.previewWinIndex?Windows.previewWinIndex+1:0;
                preview_win.setZIndex(parseFloat(parentEl.getStyle('z-index')) + 1 + Windows.previewWinIndex);
                Windows.maxZIndex = _old_maxzindex;
            }*/
        }
    },

    preview: function(parentEl){
        if (biogps.sample_gene){
            this.render_preview(biogps.sample_gene, parentEl);
        }
        else{
            biogps.sample_gene = new biogps.Gene({id: 1017});  //CDK2 as an default example
            biogps.sample_gene.on('load', function(gene){
                this.render_preview(gene, parentEl);
            }, this);
            biogps.sample_gene.load();
        }
    },

    show: function(container){

    },

    showFlagAsInappropriateForm: function(container){
        if(this.id){
           if (!this.flagformwin){
                this.flagformwin = new Ext.Window({
                    title:'Flag plugin',
                    layout: 'fit',
                    width: 380,
                    //height: 200,
                    labelWidth: 150,
                    //modal: true,
                    constrain: true,
                    constrainHeader: true,
                    renderTo: container,
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
                                fn: function(){this.ownerCmp.flagAsInappropriate()},
                                scope: win//this.ownerCmp
                            }]);
                        }
                    }},
                    items: [new Ext.FormPanel({
                        id:'newlayoutform',
                        labelWidth: 120,
                        autoHeight: true,
                        bodyStyle:'padding:5px 5px 5px 5px',
                        border : false,
                        items: [{
                            xtype:'label',
                            html: "<b>Note:</b>&nbsp;If you believe that the content displayed in this plugin are inappropriate or irrelevant, please enter a brief description below.  Flagged plugins will be reviewed by a moderator. <br/><br/>"
                        },{
                            xtype:'radiogroup',
                            fieldLabel:'Reason:',
                            labelSeparator:'',
                            hidden: false,
                            disabled: false,
                            columns: 1,
                            vertical: true,
                            items:[{
                                inputValue:'broken',
                                name:'reason',
                                boxLabel:'Broken plugin',
                                checked: true
                            },{
                                inputValue:'inappropriate',
                                boxLabel:'Inappropriate or offensive content',
                                name:'reason',
                                checked: false
                            }]
                        },{
                            fieldLabel: "Your comments (optional)",
                            xtype: 'textarea',
                            anchor: "90%",
                            name: 'comment',
                            value: '',
                            allowBlank:true
                        },{
                            xtype:'label',
                            hidden: true,
                            style:'color:red'
                        }],
                        buttons: [{
                            text:'Flag now',
                            handler: this.flagAsInappropriate,
                            scope:this
                        },{
                            text: 'Cancel',
                            handler: function(){
                                this.flagformwin.destroy();
                            },
                            scope: this
                        }]
                    })]
                })
           }
           this.flagformwin.on('destroy', function(){this.flagformwin=null;},this);
           this.flagformwin.show();
           biogps.flagformwin = this.flagformwin;
        }
    },

    flagAsInappropriate:function(){
        if(this.id && this.flagformwin){
            var flagform = this.flagformwin.items.get(0);
            var label = this.flagformwin.items.get(0).items.get(3);
            if (flagform && label){
                label.show();
                label.setText('Submitting...');
                flagform.form.submit({
                    url:String.format('/plugin_v1/{0}/flag/', this.id),
                    method:'POST',
                    timeout:60,
                    success: function(form, action){
                        if (action.result && action.result.success){
                            if (action.result.msg)
                                label.setText(action.result.msg);
                            else
                                label.setText('Success.');
                            flagform.buttons[0].disable();
                            flagform.buttons[1].setText('Done!');
                        }
                    },
                    failure: function(form, action){
                        biogps.formfailure(action,'Submitting flag failed!');
                    }
                });
            }
        }
    },

	// Called when assigning this Plugin object to a data store.
    join: function(store){
        this.store = store;
    }
});
