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
        //https://biogps-dev.gnf.org/service/getgeneidentifiers/?geneid=106953&format=json
        biogps.callRemoteService({
                                  //url: '/service/getgeneidentifiers/?format=json&geneid=' + (id || this.id),
                                  url: '/boc/getgeneidentifiers/?format=json&geneid=' + (id || this.id),
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
                        if ((gene_list[j].EntrezGene == this.EntryGeneID) || (gene_list[j].EnsemblGene == this.EntryGeneID)){
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

//    load: function(id){
//        id = id || this.id;
//        biogps.callRemoteService({url: '/plugin_v1/' + id.toString() +'/',
//                                  fn: function(st){
//                                        var data = st.reader.jsonData;
//                                        if (data.totalCount == 1){
//                                            this.id = data.items[0].pk;
//                                            this.title = data.items[0].fields.title;
//                                            this.url = data.items[0].fields.url;
//                                            this.author = data.items[0].fields.author;
//                                            this.author_url = data.items[0].fields.author_url;
//                                            this.type = data.items[0].fields.type;
//                                            this.description = data.items[0].fields.description;
//                                            if (data.items[0].fields.options === null) {
//                                                this.options = {};
//                                            }
//                                            else if (isString(data.items[0].fields.options) && (data.items[0].fields.options != '')) {
//                                                this.options = Ext.util.JSON.decode(data.items[0].fields.options);
//                                            }
//                                            else {
//                                                this.options = data.items[0].fields.options;
//                                            }
//                                            this.permission = data.items[0].fields.permission;
//                                            //this.rolepermission = data.items[0].fields.permission.R;
//                                            this.lastmodified = data.items[0].fields.lastmodified;
//                                            this.created = data.items[0].fields.created;
//                                            this.tags = data.items[0].fields.tags;
//                                            this.is_shared = data.items[0].fields.is_shared;
//                                            this.usage_percent = data.items[0].fields.usage_percent;
//                                            this.usage_layout_count = data.items[0].fields.usage_layout_count;
//                                            this.usage_ranking = data.items[0].fields.usage_ranking;
//                                            this.usage_users = data.items[0].fields.usage_users;
//                                            this.related_plugins = data.items[0].fields.related_plugins;
//                                            this.species = data.items[0].fields.species;
//
//                                            this.fireEvent('load', this);
//                                        }
//                                        else {
//                                            //data.totalCount=0 when plugin is not found or has no permission to access
//                                            this.fireEvent('loadfailed', id);
//                                        }
//
//                                       },
//                                   scope: this});
//    },

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

        var k = kwd.trim();
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

//    deprecated!
//    // Returns a single string value after parsing out this plugin's permissions object.
//    // Used to populate the plugin editing form 'rolepermission' value and to set a CSS
//    // class in the large plugin view.
//    formatPermission: function(){
//        var fPerm = "";
//        if (this.permission) {
//            if (this.permission.R) {
//                // Everyone
//                if (this.permission.R.indexOf('BioGPS Users')>=0) { fPerm = 'biogpsusers'; }
//
//                // Novartis & GNF
//                // This appears before 'GNF Only' because Novartis implies GNF.
//                else if (this.permission.R.indexOf('Novartis Users')>=0) { fPerm = 'novartisusers'; }
//
//                // GNF Only
//                else if (this.permission.R.indexOf('GNF Users')>=0) { fPerm = 'gnfusers'; }
//            }
//
//            // Friends Only
//            else if (this.permission.F) { fPerm = 'friendusers'; }
//        }
//
//        // Private
//        else { fPerm = 'myself'; }
//        return fPerm;
//    },

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


//biogps.Portlet = function(config) {
//
//
//    this.id;
//    this.plugin;
//    this.gene;
//    this.container;
//
//    this.extra_btns = {};
//    this.showframe = true;
//    this.removed = false;
//    this.frame_cls = 'dialog';
//    this.clean_cls = 'portlet-clean';
//    this.mouseover_cls = 'portlet-plain'
//
//    Ext.apply(this, config);
//
//    if (!(isString(this.id) && this.id != '' &&
//         typeof(this.plugin) == 'object' &&
//         typeof(this.gene) == 'object' &&
//         isString(this.container) && this.container != '')) {
//        return;
//    };
//
//    this.plugin.on('error', function(error){
//        Ext.MessageBox.show({
//            title:'Plugin Error',
//            msg: error.errormsg,
//            buttons: Ext.Msg.OK,
//            icon: Ext.MessageBox.ERROR
//        });
//    },this);
//
////    this.url = this.plugin.geturl(this.gene);
////  this.showframe = !this.plugin.hasPositioning();   //show frame if positioning data are not available
//    this.cls = this.showframe?this.frame_cls:this.clean_cls
//
//    biogps.Portlet.superclass.constructor.call(this);
//
//
//    this.addEvents({resize: true});
//    this.addEvents({move: true});
//    this.addEvents({remove: true});
//
//
//    this.infotpl = new Ext.Template(
//    '<table width="100%">',
//        '<tr><td class="genesummary_head" colspan="2">Plugin details:<br></td></tr>',
//        '<tr><td class="genesummary_name">Title:</td><td class="genesummary_text">{title}</td></tr>',
//        '<tr><td class="genesummary_name">ID:</td><td class="genesummary_text">{id}</td></tr>',
//        '<tr><td class="genesummary_name">URL:</td><td class="genesummary_text"><div style="width:100%; overflow:auto;">{realurl}</div></td></tr>',
//        '<tr><td class="genesummary_name">URL tpl:</td><td class="genesummary_text"><div style="width:100%; overflow:auto;">[<a href="{url}" target="_blank">mouse over to see</a>]</div></td></tr>',
//        '<tr><td class="genesummary_name">Type:</td><td class="genesummary_text">{type}</td></tr>',
//        '<tr><td class="genesummary_name">Author:</td><td class="genesummary_text">{author}</td></tr>',
//        '<tr><td class="genesummary_name">Description:</td><td class="genesummary_text">{description}</td></tr>',
//    '</table>'
//    ).compile();
//
//    var win = new Window({id:           this.id,
//                           className:   this.cls,
//                           title:       this.plugin.title,
//                           width:       this.plugin.width || 350,
//                           height:      this.plugin.height || 250,
//                           top:         this.plugin.top || 0,
//                           left:        this.plugin.left || 0,
//                           minimizable: false,
//                           parent:      $(this.container)
//                          });
//    win.root = this;
//    this.win = win;
//
//
//    win.setCloseCallback(function(){
//        var x = Ext.MessageBox.confirm('Remove Plugin?',
//                       String.format('Are you sure that you want to remove <br />this plugin "{0}" from your layout?', this.title),
//                       function(btn){
//                            if (btn == 'yes'){
//                                win.root.remove();
//                                win.root.fireEvent('remove', win.root);
//                            }
//                       }
//        );
//    });
//
//    var myObserver = {
//        //onDestroy: function(eventName, win) {
//        //},
//
//        onEndResize: win.root.syncSize,
//        onEndMove: win.root.syncLocation,
//        onMinimize: win.root.onMinimize,
//        onMaximize: win.root.onMaximize
//
//    };
//    Windows.addObserver(myObserver);
//
//    var winid = this.win.getId();
//    //add tooltip to standard buttons
//    Ext.QuickTips.register({target:Ext.fly(winid+'_close'),
//                            text:'Remove this plugin'});
//    Ext.QuickTips.register({target:Ext.fly(winid+'_minimize'),
//                            text:this.win.isMinimized()?'Restore window':'Minimize window'});
//    Ext.QuickTips.register({target:Ext.fly(winid+'_maximize'),
//                            text: this.win.isMaximized()?'Restore window':'Maximize window'});
//
//    //fix sizer curcur
//    if (Ext.fly(winid+'_sizer') && Ext.fly(winid+'_sizer').getStyle('cursor') != 'se-resize')
//        Ext.fly(winid+'_sizer').setStyle('cursor', 'se-resize');
//    win.options.showframe = this.showframe;
//    var foo = this.showframe?"off":"on";
//    new Insertion.Top(winid,"<div id='"+winid+"_toggle' class='"+this.cls+"_toggle_"+foo+"'></div>")
//    //new Insertion.Top(this.id,"<div id='"+this.winid+"_toggle' class='dialog_toggle_off'></div>")
//    var toggle_btn = Ext.get(winid+"_toggle");
//    this.extra_btns['toggle'] = toggle_btn;
//    Ext.QuickTips.register({target: toggle_btn,
//                            text: 'Toggle frame'});
//    if (!this.showframe){
//        win.options.draggable = false;
//        win.options.resizable = false;
//        toggle_btn.setOpacity(0.3);
//    }
//    toggle_btn.on('mouseover', function(){
//                                    toggle_btn.setOpacity(1);
//                                    if(!win.options.showframe) {
//                                        //win.getContent().style.border = '1px #0000ff dashed';
//                                        win.changeClassName(this.mouseover_cls);
//                                    }
//                                }, this);
//    toggle_btn.on('mouseout', function(){
//                                    toggle_btn.setOpacity(0.3);
//                                    if(!win.options.showframe){
//                                        win.changeClassName(this.clean_cls)
//                                        //win.getContent().style.border = '';
//                                    }
//                                }, this);
//    toggle_btn.on('click', this.toggleFrame, this);
//
//    this.addButton('info', this.showInfo,'Show info about this plugin');
//    this.addButton('refresh', this.refresh, 'Refresh this plugin');
//    if (!biogps.usrMgr.is_anonymoususer){
//        this.addButton('flagit', this.flagit, 'Flag as inappropriate');
//    }
//
//    //this.addButton('species_Mm', this.showSpeciesSelector,'Select other species');
//
//    this.renderSpeciesSelector();
//
//    /*bottom_tds = Ext.DomQuery.select('td',Ext.get(winid+'_row3').dom);
//    Ext.fly(bottom_tds[0]).hover(overFn=function(evt,el){
//                                    Ext.fly(el).replaceClass('dialog_sw', 'dialog_sw_hover');
//                                    Ext.fly(bottom_tds[1]).replaceClass('dialog_s', 'dialog_s_hover');
//                                 },
//                        outFn=function(evt,el){
//                                    Ext.fly(el).replaceClass('dialog_sw_hover', 'dialog_sw');
//                                    Ext.fly(bottom_tds[1]).replaceClass('dialog_s_hover', 'dialog_s');
//                                 });
//    Ext.fly(bottom_tds[1]).hover(overFn=function(evt,el){
//                                    Ext.fly(el).replaceClass('dialog_s', 'dialog_s_hover');
//                                    Ext.fly(bottom_tds[0]).replaceClass('dialog_sw', 'dialog_sw_hover');
//                                 },
//                        outFn=function(evt,el){
//                                    Ext.fly(el).replaceClass('dialog_s_hover', 'dialog_s');
//                                    Ext.fly(bottom_tds[0]).replaceClass('dialog_sw_hover', 'dialog_sw');
//                                 });
//
//    Ext.fly(bottom_tds[2]).hover(overFn=function(evt,el){
//                                    Ext.fly(el).replaceClass('dialog_se', 'dialog_se_hover');
//                                    Ext.fly(el).replaceClass('dialog_sizer', 'dialog_sizer_hover');
//                                 },
//                        outFn=function(evt,el){
//                                    Ext.fly(el).replaceClass('dialog_se_hover', 'dialog_se');
//                                    Ext.fly(el).replaceClass('dialog_sizer_hover', 'dialog_sizer');
//                                 });*/
//
//    this.loadContent();
//    if (this.minimized)
//        win.minimize();
//
//    win.setDestroyOnClose();
//    win.show();
//    //win.setConstraint(true, {left:10, top:28, right:-1000, bottom:-1000});
//    win.setConstraint(true, {left:10, top:0, right:-1000, bottom:-1000});
//    win.toFront();
//
//    if (!this.plugin.hasPositioning()){
//        //in case of the plugin does not have size/location, remember the values system generates.
//        this.syncSize(null, win);
//        this.syncLocation(null, win);
//    }
//};
//
//Ext.extend(biogps.Portlet, Ext.util.Observable, {
//    syncSize: function(evtname, win){
//    	if (win.root){
//	        Ext.apply(win.root.plugin, win.getSize());
//	        win.root.fireEvent('resize');
//    	}
////      if (win.root.containerCmp && win.root.containerCmp.updateSize)
////          win.root.containerCmp.updateSize();
//    },
//
//    syncLocation:function(evtname, win){
//    	if (win.root) {
//	        Ext.apply(win.root.plugin, win.getLocation());
//	        win.root.fireEvent('move');
//    	}
////      if (win.root.containerCmp && win.root.containerCmp.updateSize)
////          win.root.containerCmp.updateSize();
//    },
//
//    getLayoutData: function(){
//        var p = {id: this.plugin.id};
//        Ext.apply(p,  this.win.getSize());
//        var _loc = this.win.getLocation();
//        p.left = parseInt(_loc.left);
//        p.top = parseInt(_loc.top);
//        if (this.plugin.useroptions){
//            p.useroptions = this.plugin.useroptions
//        }
//        if (this.win.isMinimized()){
//        	if (! p.useroptions) p.useroptions = {};
//        	p.useroptions.minimized = this.win.isMinimized();
//        }
//        return p;
//    },
//
//    getBox: function(){
//        //get parsed top/left/width/height info
//        var loc = this.win.getLocation();
//        var size = this.win.getSize();
//        var box = {top: parseInt(loc.top),
//                   left:parseInt(loc.left),
//                   width:parseInt(size.width),
//                   height:parseInt(size.height)};
//        return box;
//    },
//
//    onMinimize: function(evtname, win){
//        Ext.QuickTips.register({target:Ext.fly(win.getId()+'_minimize'),
//                                text:win.isMinimized()?'Restore window':'Minimize window'});
//    },
//
//    onMaximize: function(evtname, win){
//        Ext.QuickTips.register({target:Ext.fly(win.getId()+'_maximize'),
//                                text: win.isMaximized()?'Restore window':'Maximize window'});
////      win.setSize(win.getSize().width, Ext.getCmp('report_panel').body.getHeight()-100);
////      Ext.get(win.getContent()).setSize(win.getSize().width, Ext.getCmp('report_panel').body.getHeight()-100);
////      win.updateHeight();
////      win.updateWidth();
////      if (win.isMaximized()){
////          Ext.apply(win.constraintPad, {bottom: -1000});
////      }
////      else{
////          Ext.apply(win.constraintPad, {bottom: win.options.parent.getHeight()-Ext.getCmp('report_panel').body.getHeight()+100});
////          win.maximize();
////      }
//
//    },
//
//    addButton: function(btnname, callback, tooltip){
//        var winid = this.win.getId();
//        new Insertion.Top(winid,"<div id='"+winid+"_"+btnname+"' class='"+this.cls+"_" + btnname + "'></div>")
//        var new_btn = Ext.get(winid+"_" + btnname);
//        this.extra_btns[btnname] = new_btn;
//        new_btn.on('click', callback, this);
//        if (tooltip)
//            Ext.QuickTips.register({target: new_btn,
//                                    text: tooltip});
//
//    },
//
//    setFrameCls: function(){
//        this.win.changeClassName(this.frame_cls);
//        for (var btn in this.extra_btns){
//            if (btn=='toggle'){
//                this.extra_btns[btn].removeClass(this.clean_cls+'_'+btn+'_on');
//                this.extra_btns[btn].addClass(this.frame_cls+'_'+btn+'_off');
//                this.extra_btns[btn].setOpacity(1);
//            }
//            else {
//                this.extra_btns[btn].removeClass(this.clean_cls+'_'+btn);
//                this.extra_btns[btn].addClass(this.frame_cls+'_'+btn);
//            }
//        }
//    },
//
//    setClearCls: function(){
//        this.win.changeClassName(this.clean_cls);
//        for (var btn in this.extra_btns){
//            if (btn=='toggle'){
//                this.extra_btns[btn].removeClass(this.frame_cls+'_'+btn+'_off');
//                this.extra_btns[btn].addClass(this.clean_cls+'_'+btn+'_on');
//                this.extra_btns[btn].setOpacity(0.3);
//            }
//            else {
//                this.extra_btns[btn].removeClass(this.frame_cls+'_'+btn);
//                this.extra_btns[btn].addClass(this.clean_cls+'_'+btn);
//            }
//        }
//    },
//
//    toggleFrame: function(){
//        var win = this.win;
//        win.options.showframe = ! win.options.showframe;
//        win.options.draggable = win.options.showframe;
//        win.options.resizable = win.options.showframe;
//        if (win.options.showframe){
//            this.setFrameCls();
//            win.setTitle(this.plugin.title);
//        }
//        else {
//            this.setClearCls();
//            win.setTitle('');
//        }
//    },
//
//    showInfo: function(){
//
//        if (this.infopanel){
//            this.infopanel.destroy();
//            this.infopanel = null;
//            return;
//        }
//
//        var info_btn = this.extra_btns['info'];
//        var _x = info_btn.getX() - info_btn.parent().getX();
//        var _y = info_btn.getY() - info_btn.parent().getY() + 20;
//
//        var winid = this.win.getId();
//        this.infopanel =    new Ext.Panel({
//                            id:winid+'_infopanel',
//                            layout:'fit',
//                            floating: true,
//                            x:_x,
//                            y:_y,
//                            width: 250,
//                            //html: this.infotpl.apply(Ext.apply({realurl: this.url}, this.plugin)),
//                            html: this.infotpl.apply(Ext.apply({realurl: this.url?'[<a href="'+this.url+'" target="_blank">open in a new window</a>]':'NA'}, this.plugin)),
//
//                            //title: 'BioGPS plugin details:',
//                            frame: true,
//                            buttonAlign: 'center',
//                            buttons: [{
//                                text:'OK',
//                                handler: function(){
//                                    this.infopanel.destroy();
//                                    this.infopanel = null;
//                                    //Ext.getCmp(this.winid+'_infopanel').destroy();
//                                },
//                                scope: this
//                            }]
//                        });
//        this.infopanel.on('show', function(){}, this)
//        this.infopanel.render(Ext.get(winid).dom);
//    },
//
//    renderSpeciesSelector: function(){
//        var species_list, species_menu, species_button;
//        var winid = this.win.getId();
//        if (this.plugin){
//            species_list = this.plugin.getAvailableSpecies(this.gene, applyuseroptions=true);//  getAllowedSpecies();
//            if (species_list.length>0){
//                species_menu = new Ext.menu.Menu();
//                var _this = this;
//                species_list.each(function(s){species_menu.add({text: s,
//                                                                 checked: false, //(s == _this.plugin.currentspecies),
//                                                                 //value: layout.id,
//                                                                 group: winid+'_selectedspecies',
//                                                                 handler: _this.onSpeciesSwitch,
//                                                                 scope: _this
//                                                                });});
//
//                species_button = new Ext.Button({text: '', //'&nbsp;&nbsp;&nbsp;&nbsp;',
//                                                 menu:species_menu,
//                                                 cls: 'dialog_species_btn'
//                                                 });
//                species_button.on('click', function(btn){btn.showMenu();});
//                species_button.render(Ext.get(winid).dom);
//                this.species_menu = species_menu;
//                this.species_button = species_button;
//            }
//        }
//    },
//
//    onSpeciesSwitch: function(item, evt){
//        var current_species = item.text;
//        if (this.plugin){
//            this.plugin.useroptions = this.plugin.useroptions || {};
//            this.plugin.useroptions.speciesOnly = current_species;
//            this.loadContent();
//        }
//    },
//
//    updateCurrentSpecies: function(){
//        if (this.species_button && this.species_menu) {
//	        var current_species = this.plugin.current_species;
//			var species_labels = {'human': '<span style="font-weight:bold;">Hs&nbsp;</span>',
//					              'mouse': '<span style="font-weight:bold;">Mm</span>',
//					              'rat': '<span style="font-weight:bold;">Rn</span>'}
//	        this.species_button.setText(species_labels[current_species]);
//	        this.species_menu.items.each(function(o){o.setChecked(o.text==current_species);});
//        }
//    },
//
//    loadContent: function(){
//    	if (this.plugin.options.securityAware){
//    		//set_scecure_cookie first and then call _loadContent.
//    		this.plugin.on('secure_cookie_set', function(){this._loadContent();}, this);
//    		this.url = this.plugin.geturl(this.gene);
//            this.updateCurrentSpecies();
//    	}
//    	else {
//			this.url = this.plugin.geturl(this.gene);
//            this.updateCurrentSpecies();
//			this._loadContent();
//    	}
//    },
//
//    _loadContent: function(){
//        var win = this.win;
//
//        if (this.plugin.url){
//	        switch(this.plugin.type){
//	            case 'div':
//	                    if (this.html){
//	                        //win.getContent().innerHTML = this.html;
//	                        win.setHTMLContent(this.html)
//	                    }
//	                    else if (this.url) {
//	                        var _url;
//                            var scripts_enabled;
//	                        if (this.url.startsWith('http://')) {
//	                            _url = '/utils/proxy?url='+this.url.replace('&','%26');
//	                            scripts_enabled = false;
//	                        }
//	                        else {
//	                            _url = this.url;
//	                            scripts_enabled = true;
//	                        }
//	                        _url = _url+'&container='+this.win.getId();
//	                        Ext.get(win.getContent()).load({url:_url, scripts:scripts_enabled});
//	                    }
//	                    else{
//	                        win.setHTMLContent("HTML content is not available!")
//	                    }
//	                    break;
//	            case 'iframe':
//	                if (this.url){
//	                    win.setURL(this.url);
//                        //win.content.contentDocument.addEventListener("load",function(){console.log('ding!')},false);
//                        //console.log(win.content.contentDocument)
//	                }
//	                else {
//                        var _gene = this.gene.getEntryGene();
//                        var err_msg = String.format('This plugin is not available for this gene: {0}({1}, {2})', _gene.Symbol,
//                                                                                                                      this.gene.EntrySpecies,
//                                                                                                                      this.gene.EntryGeneID);
//	                    win.setHTMLContent(err_msg);
//	                }
//	                break;
//	        }
//        }
//        else {
//        	//This plugin is not loaded correctly (likely deleted.)
//        	var err_msg = "This plugin (id: {0}) is not loaded correctly. \
//						   Either you have deleted it already or you don't have the privilege to access it.\
//                           <br /><br />If this is your own layout, you might want to remove it from this layout by closing this plugin window.</p>";
//        	win.setHTMLContent(String.format(err_msg, this.plugin.id));
//        }
//
//    },
//
//    refresh:function(){
//        this.loadContent();
//    },
//
//    setCustomizable: function(){
//        var win = this.win;
//        this.win.options.draggable = true;
//        this.win.options.resizable = true;
//        this.win.options.showframe = true;
//        this.setFrameCls();
//    },
//
//    setFixed: function(){
//        var win = this.win;
//        this.win.options.draggable = false;
//        this.win.options.resizable = false;
//        this.win.options.showframe = false;
//        this.setClearCls();
//    },
//
//    update: function(cfg){
//        //update win based on cfg.height, cfg.width, cfg.top, cfg.left and cfg.minimized
//        if (cfg.width != null && cfg.height != null)
//            this.win.setSize(parseInt(cfg.width), parseInt(cfg.height));
//
//        if (cfg.top != null && cfg.left != null)
//            if (cfg.animate){
//                var container_xy = Ext.get(this.container).getAnchorXY();
//                var _x = container_xy[0] + parseInt(cfg.left);
//                var _y = container_xy[1] + parseInt(cfg.top);
//                Ext.get(this.win.getId()).moveTo(_x, _y, true);
//            }
//            else{
//                this.win.setLocation(parseInt(cfg.top), parseInt(cfg.left));
//            }
//
//
//        if ((cfg.minimized && !this.win.isMinimized()) || (!cfg.minimized && this.win.isMinimized()))
//            this.win.minimize();
//    },
//
//    remove: function(){
//        //remove win of this portlet.
//        if (this.win){
//            this.win.destroy();
//            delete this.win;
//        }
//        this.removed = true;
//    },
//
//    sameAs: function(otherp){
//        //compare if otherp is the same plugin as self.
//        return ((this.plugin.id == otherp.id) && (this.plugin.options == otherp.options));
//    },
//
//    flagit: function(){
//        //flag a plug as inapprapriate content.
//        if (this.plugin) {
//            this.plugin.showFlagAsInappropriateForm(this.win.element);
//        }
//    },
//
//    isOverlapWith: function(portlet_b, d){
//        //return true if this portlet is overlap with another portlet_b
//        var b1 = this.getBox();
//        var b2 = portlet_b.getBox();
//
//        if(d) console.log(b1.left+b1.width, b2.left, b1.left+b1.width>b2.left,
//                    b2.left+b2.width,b1.left, b2.left+b2.width>b1.left,
//                    b1.top+b1.height,b2.top, b1.top+b1.height>b2.top,
//                    b2.top+b2.height,b1.top, b2.top+b2.height>b1.top);
//
//        if (((b1.left+b1.width>b2.left && b2.left+b2.width>b1.left) &&
//             (b1.top+b1.height>b2.top && b2.top+b2.height>b1.top))){
////        if ( ((b1.left+b1.width>b2.left) && (b1.top+b1.height>b2.top)) ||
////             ((b2.left+b2.width>b1.left) && (b2.top+b2.height>b1.top)) ){
//            return true;
//        }
//        else{
//            return false;
//        }
//    },
//
//    getPositionNextTo: function(portlet_b, width_constrain) {
//        //return x,y location next to given portlet, but subject to width_contrain
//        var this_box = this.getBox();
//        var last_box = portlet_b.getBox();
//
//        var _x = last_box.left + last_box.width + 5;
//        var _y = last_box.top;
//        if (_x + this_box.width>width_constrain){
//            _x = 0;
//            _y = last_box.top + last_box.height + 50;
//        }
//        return {x:_x, y:_y};
//    }
//
//});

