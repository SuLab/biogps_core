//biogps namespace is defined in core_dispatch.js
Ext.namespace('biogps.utils');

if (!Ext.isDefined(Array.prototype.each)){
    Array.prototype.each = function( f ) {
        var i = this.length, j, l = this.length;
        for( i=0; i<l; i++ ) { if( ( j = this[i] ) ) { f( j ); } }
    };
}

if (!Ext.isDefined(Array.prototype.walk)){
    Array.prototype.walk = function( f ) {
     var a = [], i = this.length;
     while(i--) { a.push( f( this[i] ) ); }
     return a.reverse();
    };
}

if (!Ext.isDefined(Array.prototype.equals)){
    Array.prototype.equals = function(a){
        if (this.length != a.length){
            return false;
        }
        for (var i = 0; i < this.length; ++ i){
            if (this[i] !== a[i]){
                return false;
            }
        }
        return true;
    };
}

if (!Ext.isDefined(String.prototype.startsWith)){
    String.prototype.startsWith = function(t, i) { if (i==false) { return
    (t == this.substring(0, t.length)); } else { return (t.toLowerCase()
    == this.substring(0, t.length).toLowerCase()); } }
}

if (!Ext.isDefined(String.prototype.endsWith)){
    String.prototype.endsWith = function(t, i) { if (i==false) { return (t
    == this.substring(this.length - t.length)); } else { return
    (t.toLowerCase() == this.substring(this.length -
    t.length).toLowerCase()); } }
}

biogps.isEmptyObject = function(obj){
    for (var attr in obj){return false;}
    return true;
}

biogps.Messenger = function(config) {
    Ext.apply(this, config);
    biogps.Messenger.superclass.constructor.call(this);
    this.addEvents({genelistrendered: true});
    this.addEvents({genereportrendered: true});
};
Ext.extend(biogps.Messenger, Ext.util.Observable, {
});

/**
 * A singleton for passing event between biogps objects.
 */
biogps.Messenger = new biogps.Messenger();

biogps.evtEmptyFn = function(){console.log(arguments);};  //use it for testing an event to see what parameters are passed.

//Ext.BLANK_IMAGE_URL = '/assets/js/ext/resources/images/default/s.gif';
//save one HTTP request (on Firefox, Opera and IE8 which support data URLs)
Ext.BLANK_IMAGE_URL = (function() {
    if (Ext.isIE8 || Ext.isGecko || Ext.isOpera || Ext.isChrome || Ext.isSafari) {
        return "data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
    } else {
        return '/assets/img/s.gif';
    }
})();

// URL to load into iframes to bypass the IE security warning
Ext.SSL_SECURE_URL = 'https://biogps.org/assets/img/s.gif';

Ext.USE_NATIVE_JSON = true;

biogps.error = function(msg){
     Ext.MessageBox.show({
        title:'Error',
        msg: msg,
        buttons: Ext.Msg.OK,
        icon: Ext.MessageBox.ERROR
    });
};

biogps.warning = function(msg){
     Ext.MessageBox.show({
        title:'Warning',
        msg: msg,
        buttons: Ext.Msg.OK,
        icon: Ext.MessageBox.WARNING
    });
};

biogps.ajaxfailure = function(conn, response, options){
    if (biogps.bequietonfailure) return;

	biogps.failedajax = [conn, response,options];
	var _conn = conn;
	if (conn && conn.status) _conn=conn;
	else if (response.status) _conn=response;
	else if (options.status) _conn=options;
	else _conn = conn;
	var _url = response.url;
	if (!_url && response.argument)
		_url = response.argument.url;

	var msg = 'Failed to access "' + _url+ '" with:<br>' +
			  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Error code: ' + (_conn.status?_conn.status.toString():"None") + '<br>' +
			  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Error message: ' + (_conn.statusText?_conn.statusText.toString():"None") + '<br>';
	Ext.MessageBox.alert('Ajax Error', msg);
};

biogps.ajaxfailure2 = function(o, arg, e){
	biogps.ajaxfailure(e, arg);
};

biogps.formfailure = function(action, errmsg, onclose, scope){
	 //biogps.failedaction = action;
     Ext.MessageBox.hide();
     if (action.result){
		 if (action.result.error){
			if (typeof(action.result.error) == 'string'){
				errmsg += '<br><br>&nbsp;&nbsp;&nbsp;&nbsp;'+action.result.error;
			}
			else if (action.result.error.error_code){
				errmsg += '<br><br>&nbsp;&nbsp;&nbsp;&nbsp;Error Code: ' + action.result.error.error_code;
                if (action.result.error.error_msg){
                   errmsg += '<br><br>&nbsp;&nbsp;&nbsp;&nbsp;Error Msg: ' + action.result.error.error_msg;
                }
				if (action.result.error.errorreport_id){
				   errmsg += '<br><br>&nbsp;&nbsp;&nbsp;&nbsp;<a href="/utils/errorreport/' + action.result.error.errorreport_id +'" target="_blank">View detailed error report.</a>';
				}
			}
			else {
				errmsg += '<br><br>&nbsp;&nbsp;&nbsp;&nbsp;'+action.result.error.toString();
			}
		 }
		 else if (action.result.data){
			if (action.result.data.status){
				errmsg += '<br><br>&nbsp;&nbsp;&nbsp;&nbsp;Error Code: ' + action.result.data.status;
			}
		 }
     }
     else if (action.response.responseText){
     	Ext.getBody().dom.innerHTML = action.response.responseText;   //display any unhandled error
     	return;
     }
     else if (action.response.statusText){
     	errmsg += '<br><br>&nbsp;&nbsp;&nbsp;&nbsp;Reason: ' + action.response.statusText;
     }
     else{
         errmsg += '<br><br>&nbsp;&nbsp;&nbsp;&nbsp;Reason: timeout.'
     }

     Ext.MessageBox.show({
        title:'Error',
        msg: errmsg,
        buttons: Ext.Msg.OK,
        fn: onclose,
        scope: scope,
        icon: Ext.MessageBox.ERROR
    });
};


biogps.callRemoteService = function(config){
    var url = config.url;
    var params = config.params || {};
    var onloadcallback = config.fn || Ext.emptyFn;
    var onloadfailure = config.failure || Ext.emptyFn;
    var scope = config.scope;
    var method = config.method || 'GET';
    var disableCaching = (config.disableCaching==null)?true:config.disableCaching;
    var ignorefailure = (config.ignorefailure==null)?false:config.ignorefailure;
    var timeout = config.timeout || 30000;   // in ms
    // var async = (config.async == null) ? true : config.async;

    var type = config.type || 'json';
    if (type == 'json')
        var ST = Ext.data.JsonStore;
    else
        var ST = Ext.data.Store;

    var st = new ST({
            proxy: new Ext.data.HttpProxy({
                method: method,
                disableCaching: disableCaching,
                timeout: timeout,
                url: url
            }),
            baseParams: params,
            fields:[],
            autoLoad: true
        });
    st.on('load', onloadcallback, scope);
    if (!ignorefailure){
        //st.on('loadexception', biogps.ajaxfailure, scope);
        st.on('exception', function(dataproxy, type, action, options, response, mixedarg){
                                biogps.ajaxException(dataproxy, type, action, options, response, mixedarg);
                                onloadfailure(st);
                           }, scope);   //"loadexception" deprecated since ExtJS v3, use "exception" instead.
    }
};

/**
 * A handler to catch "exception" event of datastore (ExtJS v3 and up)
 * Ref: http://extjs.com/deploy/dev/docs/output/Ext.data.DataProxy.html
 */
biogps.ajaxException = function(dataproxy, type, action, options, response, mixedarg){
    var generic_error = "Unknown error. Please contact us.";
    if (type=='remote'){
        // when status is 200, but returned "success" is false.
        // biogps.error(response.error || "None");
        // the above line is changed to the below due to the change of returned response object.
        biogps.error((response.raw && response.raw.error) || generic_error);
    }
    else{
        //type == 'response'
        // when status is not 200
        var url = options.url;
        var errorcode = response.status || generic_error;
        var errormsg =  response.responseText || response.statusText || generic_error;
        var msg = 'Failed to access "' + url+ '" with:<br>' +
                  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Error code: ' + errorcode + '<br>' +
                  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Error message: ' + errormsg + '<br>';
        Ext.MessageBox.alert('Ajax Error', msg);
    }
};

biogps.setTitle = function(action){
    //Set browser title based on action
    var title = ''
    var desc = ''
    switch (action){
            default:
                break;
            case 'about':
                //title = 'BioGPS - About';
                title = 'About';
                break;
            case 'terms':
                //title = 'BioGPS - Terms of Use';
                title = 'Terms of Use';
                break;
            case 'help':
                //title = 'BioGPS - Help';
                title = 'Help';
                break;
            case 'faq':
                title = 'FAQ';
                break;
            case 'downloads':
                title = 'Downloads';
                break;
            case 'iphone':
                title = 'iPhone';
                break;
            case 'search':
                break;
            case 'searchresult':
                //title = 'BioGPS - Search Result';
                title = 'Search Result';
                if (biogps.resultpage && biogps.resultpage.rendered){
                    title = 'Search Result ({0})';
                    title = String.format(title, biogps.resultpage.totalCount);
                }
                else {
                    //wait till biogps.resultpage is rendered.
	                biogps.Messenger.on('genelistrendered', function(){
	                    biogps.setTitle('result');
	                    biogps.clearListeners(biogps.Messenger, 'genelistrendered');
	                });
                }
                break;
            case 'genereport':
                //title = 'BioGPS - Report';
                title = 'Gene Report';
                if (biogps.GeneReportMgr && biogps.GeneReportMgr.rendered){
	                desc = biogps.GeneReportMgr.makeTitle();
                }
                else {
                    //wait till biogps.resultpage is rendered.
                    biogps.Messenger.on('genereportrendered', function(){
						var task = new Ext.util.DelayedTask(function(){
	                        biogps.setTitle('genereport');
	                        biogps.clearListeners(biogps.Messenger, 'genereportrendered');
						});
						task.delay(500);
                    });
                }
                break;
            case 'pluginlibrary':
                //title = 'BioGPS - Plugin Library';
                title = 'Plugin Library';
                break;
            case 'mystuff':
                //title = 'BioGPS - My Stuff';
                title = 'My Stuff';
                break;
    }

    var max_length = 100;   //maximum allowed string length for title.
    var site = 'BioGPS'
    if (title.length == '') {
        //default title
        title = 'BioGPS - your Gene Portal System';
    }
    else {
        if (desc == ''){
            title += ' | ' + site;
        }
        else {
		    if (desc.length>max_length)
		        desc = desc.substring(0, 97) + '...';
	        title = desc + ' | ' + title + ' | ' + site;
        }
    }
    document.title = title;
};


function createBox(t, s){
    return ['<div class="msg">',
            '<div class="x-box-mc"><h3>', t, '</h3><div>', s, '</div></div>',
            '</div>'].join('');
}

biogps.showmsg = function(title, msg, delay){
    var delay = delay || 1;
    if(!biogps.msgCt){
        biogps.msgCt = Ext.DomHelper.insertFirst(document.body, {id:'msg-div'}, true);
    }
    biogps.dismiss_msg();   //dismiss existing msg;
    biogps.msgCt.alignTo(document, 't-t');
    var s = String.format.apply(String, Array.prototype.slice.call(arguments, 1));
    var m = Ext.DomHelper.append(biogps.msgCt, {html:createBox(title, s)}, true);
    m.slideIn('t').pause(delay).ghost("t", {remove:true});
};

biogps.dismiss_msg = function(){
    if (biogps.msgCt){
        biogps.msgCt.dom.innerHTML = "";
    }
}
biogps.dismiss_msg_html = '<a href="javascript:biogps.dismiss_msg();">Dismiss</a>';


biogps.require_user_logged_in = function(){
	if (biogps.usrMgr.is_anonymoususer){
		Ext.MessageBox.alert("Alert", 'This function is only available for registered users.');
		return false;
	}
	else{
		return true;
	}

};

biogps.whydisabled = function(cmp, msg){
	if (cmp.el){
		var msk = cmp.el.mask('Why disabled?', 'whydisabled_msg');
        biogps.msk = msk;
        var target_el = Ext.DomQuery.selectNode('div[class="ext-el-mask-msg whydisabled_msg"]', cmp.el.dom);
        target_el = target_el || cmp.el;
        new Ext.ToolTip({
            //target: cmp.el._maskMsg.dom.firstChild,
            target: target_el,
            html: msg,
            title: 'Why disabled?',
            dismissDelay: 15000,
            autoHide: true,
            closable: true,
            draggable:true
        });
	}
};


//Ext.override(Ext.form.BasicForm, {
//    submit : function(options){
//        if(this.standardSubmit){
//            var v = this.isValid();
//            if(v){
//                this.el.dom.submit();
//            }
//            return v;
//        }
//        if(options.params){
//            options.params.csrfmiddlewaretoken = Ext.get('csrfmiddlewaretoken').dom.value;
//        } else {
//            options.params = {csrfmiddlewaretoken: Ext.get('csrfmiddlewaretoken').dom.value};
//        }
//        this.doAction('submit', options);
//        return this;
//    },
//});
//
//biogps.updatecsrf = function(){
//	Ext.Ajax.request({
//		   url: 'utils/getform',
//		   success: function(response){
//						console.log(Ext.get('csrfmiddlewaretoken').dom.value);
//						//console.log(response.responseText);
//						//var token = Ext.DomQuery.selectNode('input[id=csrfmiddlewaretoken]', response.responseText).value;
//						var token = response.responseText.substring(response.responseText.indexOf("value='")+7,response.responseText.indexOf("' /></div></form>"));
//						console.log(token)
//						Ext.get('csrfmiddlewaretoken').dom.value = token;
//						console.log(Ext.get('csrfmiddlewaretoken').dom.value);
//    				},
//		   failure: biogps.ajaxfailure,
//		});
//};

biogps.clearListeners = function(obj, evt){
	if (obj.events){
		var ce = obj.events[evt.toLowerCase()];
		if(typeof ce == "object")
			ce.clearListeners();
	}
};

//biogps.testCookies = function(){
//    var cp = new Ext.state.CookieProvider();
//    if (!cp.readCookies().test){
//        alert("Warning: many features will not work as expected unless you enable cookies. Please enable cookies on your browser and refresh the page again.");
//    }
//    cp.clear('test');
//}
biogps.setCookies = function(){
//	var cp = new Ext.state.CookieProvider();
//	//test cookies
//	cp.set('test', 'cookietest');
//    setTimeout("biogps.testCookies()", 1000);
//	Ext.state.Manager.setProvider(cp);

    if (navigator.cookieEnabled) {
        var cp = new Ext.state.CookieProvider();
        Ext.state.Manager.setProvider(cp);
    }
    else {
        alert("Warning: many features will not work as expected unless you enable cookies. Please enable cookies on your browser and refresh the page again.");
    }

}


biogps.initHistory = function() {
    Ext.History.init();
    Ext.History.on('change', biogps.dispatcher_by_hash);
}

biogps.init = function (){

//    //execute any delayed tasks.
//    if (isArray(biogps.delayedTasks) && biogps.delayedTasks.length>1){
//        for (var i=0;i<biogps.delayedTasks.length;i++){
//            biogps.delayedTasks[i]();
//        }
//    }

    biogps.setCookies();
    coreDispatcher.bindHotKey();
    biogps.initHistory();
    Ext.QuickTips.init();

    // Execute the delayed action, if there is one.
    if (coreDispatcher.delayedAction) {
        _gaq.push(['_trackEvent', 'coreDispatcher.delayedExecute', 'delayedCallback']);
        coreDispatcher.delayedAction();
    }
};

biogps.mainUI_init = function (){

    //biogps.getlastsearch();
    biogps.initInfobar();
    //biogps.initPluginWin();
    //biogps.getplugins();
    //biogps.initLoginForm();
    biogps.usrMgr.init();
    //biogps.dispatcher();
    //biogps.usrMgr.loadSavedUserData()

    //biogps.setupUpdator();
};

/*
 * using Ext.History.getToken instead.
 *
biogps.getHash = function() {
    var href = top.location.href, i = href.indexOf("#");
    return i >= 0 ? href.substr(i + 1) : null;
}*/

biogps.mainUI_postinit = function(){
	// something done after main UI initialized.
	// biogps.initLogo();
	// Message ticker commented out on 2/26/09
	// Will be replaced by new message system later on.
    //biogps.initMsgTicker();
}

biogps.getlastsearch = function() {
    var st = new Ext.data.JsonStore({url:'/service/getlastsearch/',
                                     fields: [{name: 'symbol'},
                                              {name: 'id'}],
                                     autoLoad: true});
    st.on('load', function(){
    				var saved_genelist = st.reader.jsonData;
    				if (isArray(saved_genelist) && saved_genelist.length>0)
                    	biogps.genelist_panel.loadGeneList({geneList: st.reader.jsonData});
                    },this);
};

/*
parse_token=function(token){
	var params = {}
	if (token){
		token.split('&').each(function(item){
			var pair = item.split('=');
			var name = pair[0];
			var value = pair[1];
			if (isArray(params[name])){
				params[name].push(value);
			}
			else if (isString(params[name])){
				params[name] = [params[name], value];
			}
			else{
				params[name] = value;
			}
		})
	}
	return params;
}*/

_reuse_exist_tab = function(tabid){
	//if it is hidden behide welcome div, bring it up.
	var welcome_el = Ext.get('welcome');
	if (welcome_el && welcome_el.isVisible()){
		welcome_el.hide();
	}

	if (biogps.centerTab.getActiveTab().id == tabid){
		return true;
	}
	var tab = biogps.centerTab.getItem(tabid);
	if (tab && !tab.disabled){
		biogps.centerTab.suspendEvents();    //avoid to fire "tabchange" event again.
		biogps.centerTab.setActiveTab(tabid);
		biogps.centerTab.resumeEvents();
		return true;
	}
	return false;
}

/*
biogps.getIEHistoryToken = function(){
    iframe = Ext.get(Ext.History.iframeId).dom;
    var doc = iframe.contentWindow.document;
    var elem = doc.getElementById("state");
    var token = elem ? elem.innerText : null;
    return token;
};

biogps.setIEHistoryToken=function(token){
    iframe = Ext.get(Ext.History.iframeId).dom;
    var html = ['<html><body><div id="state">',token,'</div></body></html>'].join('');
    try {
        var doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        return true;
    } catch (e) {
        return false;
    }
};
*/

biogps.dispatcher_by_hash = function(hash){
//    if (Ext.isIE){
//        console.log(hash, biogps.getIEHistoryToken());
//	    if (hash != biogps.getIEHistoryToken())
//	        biogps.setIEHistoryToken(hash);
//    }
	var params = Ext.urlDecode(hash);
	if (params) {
		var cmd = params['goto'];
		if (cmd) cmd = cmd.toLowerCase();
		switch(cmd){
			//case 'welcome':
            default:
				var welcome_el = Ext.get('welcome');
				if (welcome_el && !welcome_el.isVisible()){
					welcome_el.show();
				}
                biogps.setTitle(cmd);
				break;
			case 'about':
			case 'terms':
			case 'help':
            case 'faq':
            case 'downloads':
            case 'iphone':
				biogps.showInfoPage(cmd);
                break;
			case 'search_disabled':
				var _qtype;
				var _query;
	   			if (params['qtype'] =='keyword'){
	   				_qtype = 'keyword';
	   			}
	   			else if (params['qtype'] =='interval'){
	   				_qtype = 'interval';
	   				var genome = biogps.GENOMEASSEMBLY[params['genome']] || 'mouse';
	   			}
	   			else{
	   			    _qtype = 'symbolanno';
	   			}
	   			_query = params['query']
	   			if (_query){
	   				if (biogps.searchform){
		   				if (_qtype == 'interval'){
			   					biogps.searchform.items.get(0).setActiveTab('searchbyinterval');
				   				biogps.searchform.form.setValues({genomeinternal_string: _query,
				   				                                  genomeassembly: genome
				   				});
		   				}
		   				else {
			   				_query = _query.replace(/[\+,|]+/g, '\n');
                                biogps.searchform.items.get(0).setActiveTab('searchbyanno');
				   				biogps.searchform.form.setValues({query: _query,
				   											      qtype: _qtype
				   				});
		   				}
		   				biogps.doSearch();
	   				}
	   			}
	   			else{
	   				_reuse_exist_tab('search_panel');
	   			}
                biogps.setTitle(cmd);
				break;
            case 'search':
                _query = params['query'];
                if (_query){
                    var searchform = Ext.get('qsearch_form');
                    searchform.dom.query.value = _query;
                        biogps.doSearch({'query': _query,
                                         'target': searchform.query.id});
                }
                biogps.setTitle(cmd);
                break;
			case 'searchresult':
                if (biogps.resultpage){
				    _reuse_exist_tab('result_panel');
                    biogps.setTitle(cmd);
                }
                else{
                    window.location = '/#goto=welcome';
                }

				break;
			case 'genereport':
				var id = params['id'];
				var geneid_list = [];
				if (id) {
					if (isString(id))
						geneid_list = id.replace(/[\+|]+/g, ',').split(',');
					else if (isArray(id))
						geneid_list = id;
				}
				if (geneid_list.length>0){
					if (!_reuse_exist_tab('report_panel') || (geneid_list.join(',') != biogps.GeneReportMgr.getGeneidList().join(','))){
						biogps.renderGeneReport2(geneid_list, true);
					}
				}
				else{
					_reuse_exist_tab('report_panel');
				}
                biogps.setTitle(cmd, geneid_list);

                var add_plugin = params['add_plugin'];
                //if "add_plugin" parameter is passed, add this plugin into the layout if not already.
                if (add_plugin){
	                if (biogps.GeneReportMgr && biogps.GeneReportMgr.rendered){
	                	biogps.GeneReportMgr.quickAddPlugin_byID(add_plugin);
	                }
	                else {
	                    //wait till biogps.resultpage is rendered.
	                    biogps.Messenger.on('genereportrendered', function(){
	                        biogps.GeneReportMgr.quickAddPlugin_byID(add_plugin);
	                        biogps.clearListeners(biogps.Messenger, 'genereportrendered');
	                    });
	                }
                }

                var show_dataset = params['show_dataset'];
                //if "show_dataset" parameter is passed, show this dataset in datachart plugin (add if not rendered)
                if (show_dataset){
                    if (biogps.GeneReportMgr && biogps.GeneReportMgr.rendered){
                        biogps.GeneReportMgr.showDataset(show_dataset);
                    }
                    else {
                        //wait till biogps.resultpage is rendered.
                        biogps.Messenger.on('genereportrendered', function(){
                            biogps.GeneReportMgr.showDataset(show_dataset);
                            biogps.clearListeners(biogps.Messenger, 'genereportrendered');
                        });
                    }
                }

				break;
			case 'pluginlibrary':
				// Route V1 deep links to V2 URLs
                // Process the 't' param for the high-level tab to show.
                if (params['t']) {
                    // Plugin Library home
                    if (params['t'] == 'library-home') {
                        location.replace('/plugin/')
                    }

                    if (params['t'] == 'library-plugin' || params['t'] == 'library-edit') {
                        // Individual plugin page
                        if (params['p']) {
                            location.replace('/plugin/' + params['p'] + '/')
                        }
                    }
                    else if (params['t'] == 'library-add') {
                        // New plugin page
                        location.replace('/plugin/new/')
                    }
                    else if (params['search']) {
                        // Search term entered
                        location.replace('/search/plugin/?q=' + params['search'])
                    }
                    else if (params['tags']) {
                        // Searching based on tags
                        location.replace('/plugin/tag/' + params['tags'] + '/')
                    }
                }
                else {
                    // No matches, re-direct to plugin library home
                    location.replace('/plugin/')
                }
				break;
			case 'mystuff':
				if (!_reuse_exist_tab('mystuff_panel')){
					biogps.renderMyStuffPanel();
				}
                biogps.setTitle(cmd);
				break;
		}
	}
	else{
		//Ext.History.add('goto=search');
        Ext.History.add('goto=welcome');
	}
};

biogps.dispatcher = function() {
	//dispatch based on query string
	var hash = window.location.hash;
	//if(hash.length>0 && hash[0]=='#'){
	if(hash.length>0 && hash.substring(0,1)=='#'){    //IE7 does not support hash[0]
		hash = hash.substring(1);
		biogps.dispatcher_by_hash(hash);
	}
	else{
		Ext.History.add('goto=search');
	}
};

biogps.initMsgTicker = function(){
    var center_panel = Ext.get('center_panel');
    if (center_panel){
        var msgCt = Ext.get('msg-ct');
        msgCt.anchorTo(center_panel.first(), 'tr',[-300, 0], false, false);

        var msgIndex = 0;
        var msg = Ext.get('msg'),
            msgInner = Ext.get('msg-inner'),
            active = null;

        msgInner.addClassOnOver('msg-over');

        msg.on('click', function(){
            if (active.action){
                active.action();
            }
            else{
                if (active.url){
                    window.open(active.url);
                }
            }
        });

        function doUpdate(){
            msgInner.update(active.text);
            msg.slideIn('b');
        }

        function showMsg(index){
            if (isArray(biogps.ticker_msgs) && biogps.ticker_msgs.length>0){
                if(!msgInner.hasClass('msg-over')) {
                    active = biogps.ticker_msgs[index];
                    if(msg.isVisible()){
                        msg.slideOut('b', {callback: doUpdate});
                    }else{
                        doUpdate();
                    }
                }
            }
        }

        setInterval(function(){
            msgIndex = biogps.ticker_msgs[msgIndex+1] ? msgIndex+1 : 0;
            showMsg(msgIndex);
        }, 5000);

        showMsg(0);
    }
}

biogps.setupUpdator = function(){
    // Start a simple clock task that runs once per minute
    var task = {
        run: function(){
            //update biogps.ticker_msgs
            biogps.callRemoteService({
                url: '/tickermsgs/',
                fn: function(st){
                    var tickers = [{text: 'Welcome to BioGPS site.'}];
                    if (st.reader.jsonData.cnt_user_all){
                        tickers.push({text: String.format('There are currently {0} registered users.', st.reader.jsonData.cnt_user_all)});
                    }
                    if (st.reader.jsonData.cnt_newuser_lastweek && st.reader.jsonData.cnt_newuser_lastweek>0){
                        tickers.push({text: String.format('{0} new users registered in the last week.', st.reader.jsonData.cnt_newuser_lastweek)});
                    }
                    if (st.reader.jsonData.cnt_user_lastweek){
                        tickers.push({text: String.format('There are {0} users visited BioGPS last week.', st.reader.jsonData.cnt_user_lastweek)});
                    }
                    if (st.reader.jsonData.cnt_plugins){
                        tickers.push({text: String.format('There are {0} registered plugins in the plugin library.', st.reader.jsonData.cnt_plugins)});
                    }
                    if (st.reader.jsonData.cnt_layouts){
                        tickers.push({text: String.format('BioGPS users have created {0} custom user layouts.', st.reader.jsonData.cnt_layouts)});
                    }
                    biogps.ticker_msgs = tickers;
                },
                ignorefailure: true
            })

        },
        interval: 300*1000 //5 min
    }
    var runner = new Ext.util.TaskRunner();
    runner.start(task);
}


//biogps.initLogo = function(){
//	var header = Ext.get('biogps-logo');
//	if (header){
//		function overfn(){
//			var logohover = Ext.fly('logohover');
//			if (!logohover)
//				logohover = Ext.getBody().createChild({id: 'logohover', tag:'div'});
//			logohover.update('<img src="/assets/img/biogps-logo_big.gif" style="width:200px;height:150px;"/>');
//			logohover.setTop(header.getBottom()+200);
//			logohover.setLeft(header.getRight()+250);
//			logohover.setStyle({"z-index":20000});
//			logohover.show();
//			logohover.setSize(200, 150, {duration: 1});
//		}
//		function outfn(){
//			var logohover = Ext.fly('logohover');
//			if (logohover){
//				logohover.clean();
//				logohover.hide();
//			}
//		}
//		header.hover(overfn, outfn, this);
//	}
//},

/*this function is deprecated*/
/*
biogps.initLogo = function(){
	var biogpslogo = Ext.get('biogps-logo');
	if (biogpslogo){
		function overfn(){
			if (!biogps.logopanel){
				var _x = biogpslogo.getLeft();
				var _y = biogpslogo.getBottom();
				var logo_cnt = 9;
				biogps.logopanel = 	new Ext.Panel({
									id:'logopanel',
									layout:'fit',
									floating: true,
									renderTo: Ext.getBody(),
									shadow: false,
									x:_x,
									y:_y,
									//width: 310,
									//height: 150,
				                    //html: String.format('<img width="100%" height="100%" src="/assets/img/biogps_logo_big_{0}.png" />', Math.ceil(Math.random()*100 % logo_cnt)),
									width: 172,
									height: 83,
				                    html: String.format('<img width="100%" height="100%" src="/assets/img/logos/logo{0}.png" alt="logo" />', Math.ceil(Math.random()*100 % logo_cnt)),
				                    listeners: {'render': function(panel){
				                    						panel.el.fadeIn({duration:0.5});
				                    					  }}
								});
			}
		}
		function outfn(){
			if (biogps.logopanel){
				biogps.logopanel.el.fadeOut({duration:0.5,
				                             callback: function(){
				                             				if (biogps.logopanel && biogps.logopanel.destroy)
																biogps.logopanel.destroy();
															biogps.logopanel = null;
				                             		   }
				                             });
//				biogps.logopanel.destroy();
//				biogps.logopanel = null;
			}
		}
		biogpslogo.hover(overfn, outfn, this);
	}
};
*/

//biogps.AVAILABLE_SPECIES = ['human', 'mouse', 'rat'];  //this is assigned at index_ext.html template based on input URL
biogps.GENOMEASSEMBLY = {'hg18':'human',
                         'mm9': 'mouse',
                         'rn4': 'rat',
                         'dm3': 'fruitfly'}

biogps.TAXONOMY_LIST = new Ext.data.SimpleStore({
					       fields: ['name', 'taxid'],
	  			           data :  [['human', 9606],
					        		['mouse', 10090],
					                ['rat', 10116],
                                    ['fruitfly', 7227]]
});

biogps.PLUGINKEYWORDS_common = [
{key: "{{entrezgene}}", text: "Entrez GeneID"},
{key: "{{symbol}}", text: "Symbol"},
{key: "{{ensemblgene}}", text: "Ensembl GeneID"},
{key: "{{unigene}}", text: "UniGene ID"},
{key: "{{uniprot}}", text: "Uniprot ID"},
{key: "{{refseqmrna}}", text: "RefSeq Transcript"},
{key: "{{refseqprotein}}", text: "RefSeq Protein"},
{key: "{{pdb}}", text: "PDB ID"}
];
biogps.PLUGINKEYWORDS_other = [
//{key: "{{ApiDB_CryptoDB}}", text: "ApiDB_CryptoDB"},
//{key: "{{CGNC}}", text: "CGNC"},
//{key: "{{ECOCYC}}", text: "ECOCYC"},
//{key: "{{EcoGene}}", text: "EcoGene"},
//{key: "{{Ensembl}}", text: "Ensembl"},
{key: "{{FLYBASE}}", text: "FLYBASE", allowedSpecies: ['fruitfly']},
//{key: "{{GeneDB}}", text: "GeneDB"},
{key: "{{assembly}}", text: "Genome Assembly"},
{key: "{{genomelocation}}", text: "Genomic Location"},
{key: "{{chr}}", text: "Chromosome"},
{key: "{{gstart}}", text: "Genomic Start Position"},
{key: "{{gend}}", text: "Genomic End Position"},
{key: "{{aliase}}", text: "Aliase"},
{key: "{{HGNC}}", text: "HGNC", allowedSpecies: ['human'] },
{key: "{{HPRD}}", text: "HPRD", allowedSpecies: ['human'] },
//{key: "{{IMGT/GENE-DB}}", text: "IMGT/GENE-DB"},
//{key: "{{InterPro}}", text: "InterPro"},
{key: "{{MGI}}", text: "MGI", allowedSpecies: ['mouse'] },
{key: "{{MIM}}", text: "OMIM", allowedSpecies: ['human'] },
//{key: "{{MaizeGDB}}", text: "MaizeGDB"},
//{key: "{{PBR}}", text: "PBR"},
//{key: "{{Pathema}}", text: "Pathema"},
{key: "{{RATMAP}}", text: "RATMAP", allowedSpecies: ['rat'] },
{key: "{{RGD}}", text: "RGD", allowedSpecies: ['rat'] },
//{key: "{{SGD}}", text: "SGD"},
{key: "{{TAIR}}", text: "TAIR", allowedSpecies: ['thale-cress'] },
//{key: "{{UniProtKB/Swiss-Prot}}", text: "UniProtKB/Swiss-Prot"},
//{key: "{{VBRC}}", text: "VBRC"},
//{key: "{{VectorBase}}", text: "VectorBase"},
{key: "{{WormBase}}", text: "WormBase", allowedSpecies: ['nematode'] },
{key: "{{Xenbase}}", text: "Xenbase", allowedSpecies: ['frog'] },
{key: "{{ZFIN}}", text: "ZFIN", allowedSpecies: ['zebrafish'] },
{key: "{{PharmGKB}}", text: "PharmGKB", allowedSpecies: ['human'] }
];

////Fix for radio setValue
////http://extjs.com/forum/showthread.php?t=26568
//Ext.apply(Ext.form.Radio.prototype,{
//    setValue : function(v){
//    	if (typeof v == 'boolean') {
//            Ext.form.Radio.superclass.setValue.call(this, v);
//        } else {
//            var r = this.el.up('form').child('input[name='+this.el.dom.name+'][value='+v+']', true);
//            if (r) r.checked = true;
//        }
//    }
//
//});

//Fix for radiogroup/checkboxgroup
Ext.override(Ext.form.CheckboxGroup, {
    //as of ExtJS v3.1.1, this method is just emptyFn.
    //override it to return an array of checked values.
    getRawValue: function() {
        var out = [];
        this.eachItem(function(item){
            if(item.checked){
                out.push(item.getRawValue());
            }
        });
        return out;
    }
});

/* This fix has been deprecated now
//http://extjs.com/forum/showthread.php?t=39161
Ext.override(Ext.form.CheckboxGroup, {
  getNames: function() {
    var n = [];

    this.items.each(function(item) {
      if (item.getValue()) {
        n.push(item.getName());
      }
    });

    return n;
  },

  getValues: function() {
    var v = [];

    this.items.each(function(item) {
      if (item.getValue()) {
        v.push(item.getRawValue());
      }
    });

    return v;
  },

  setValues: function(v) {
    var r = new RegExp('(' + v.join('|') + ')');

    this.items.each(function(item) {
      item.setValue(r.test(item.getRawValue()));
    });
  }
});


Ext.override(Ext.form.RadioGroup, {
  getName: function() {
    return this.items.first().getName();
  },

  getValue: function() {
    var v;

    this.items.each(function(item) {
      v = item.getRawValue();
      return !item.getValue();
    });

    return v;
  },

  setValue: function(v) {
    this.items.each(function(item) {
      item.setValue(item.getRawValue() == v);
    });
  }
}); */


/*
if (dsHistory){
	dsHistory.deferProcessing = true;
	Ext.apply(dsHistory, {
		cleanQueryVar: function(){
			for (attribute in dsHistory.QueryElements){
				dsHistory.removeQueryVar(attribute);
			}
		}
	});
}
*/

//A MessageBox only mask its targetEl when new parameter targetEl is provided
//Ref:  http://extjs.com/forum/showthread.php?t=11275&highlight=MessageBox+mask
/*
Ext.override(Ext.MessageBox, {
	show : function(options){

	var el = Ext.get(this.targetEl);
	//resize the mask
	dialog.mask.resize(el.getSize().width, el.getSize().height);

	// align it to the element (to the top-left corner)
	dialog.mask.alignTo(el.dom, "tl");
	}
});
*/

/*
//A fix for Ext.Window to make masking only applied to ownerCt when modal=true and constrain=true
//Ref: http://extjs.com/forum/showthread.php?t=43340&highlight=window+modal+constrain
Ext.override(Ext.Window, {
    // private
    beforeShow : function() {
        delete this.el.lastXY;
        delete this.el.lastLT;
        if (this.x === undefined || this.y === undefined) {
            var xy = this.el.getAlignToXY(this.container, 'c-c');
            var pos = this.el.translatePoints(xy[0], xy[1]);
            this.x = this.x === undefined? pos.left : this.x;
            this.y = this.y === undefined? pos.top : this.y;
        }
        this.el.setLeftTop(this.x, this.y);

        if (this.expandOnShow) {
            this.expand(false);
        }

        if (this.modal) {
            this.container.addClass("x-body-masked"); // instead of Ext.getBody().addClass("x-body-masked")
            this.mask.setSize(this.container.getWidth(true), this.container.getHeight(true));

            // align the mask with its container -- for some strange reason, using alignTo()
            // shifts the mask down by a fixed amount everytime the window is shown
            this.mask.setLeftTop(this.container.getLeft(), this.container.getTop()).show();
        }
    },

    show: Ext.Window.prototype.show.createInterceptor(function() {
        if (!this.renderTo && !this.rendered && this.ownerCt) {
            this.render(this.ownerCt.getEl());
        }
    }),

    // private
    afterHide : function() {
        this.proxy.hide();
        if (this.monitorResize || this.modal || this.constrain || this.constrainHeader) {
            Ext.EventManager.removeResizeListener(this.onWindowResize, this);
        }
        if (this.modal) {
            this.mask.hide();
            this.container.removeClass("x-body-masked"); // instead of Ext.getBody().removeClass("x-body-masked")
        }
        if (this.keyMap) {
            this.keyMap.disable();
        }
        this.fireEvent("hide", this);
    },

    // private
    onWindowResize : function() {
        if (this.maximized) {
            this.fitContainer();
        }
        if (this.modal) {
            this.mask.setSize('100%', '100%');
            this.mask.setSize(this.container.getWidth(true), this.container.getHeight(true));
        }
        this.doConstrain();
    },

    // private
    onDestroy: Ext.Window.prototype.onDestroy.createInterceptor(function() {
        // bugfix: remove window resize event listener
        Ext.EventManager.removeResizeListener(this.onWindowResize, this);
    })
});*/


biogps.get_sessionid = function(){
	var cookies = document.cookie;
	var session_key = 'sessionid=';
	var s = cookies.indexOf(session_key);
	if (s==-1){
		return '';
	}
	else{
		var start = s+session_key.length;
		var end = cookies.substring(s).indexOf(';');
		if (end==-1){
			return cookies.substring(start);
		}
		else{
			return cookies.substring(start, s+end);
		}
	}
};


//Credit: http://www.overset.com/2007/07/11/javascript-recursive-object-copy-deep-object-copy-pass-by-value/
function deepObjCopy (dupeObj) {
	var retObj = new Object();
	if (typeof(dupeObj) == 'object') {
		if (typeof(dupeObj.length) != 'undefined')
			var retObj = new Array();
		for (var objInd in dupeObj) {
			if (typeof(dupeObj[objInd]) == 'object') {
				retObj[objInd] = deepObjCopy(dupeObj[objInd]);
			} else if (typeof(dupeObj[objInd]) == 'string') {
				retObj[objInd] = dupeObj[objInd];
			} else if (typeof(dupeObj[objInd]) == 'number') {
				retObj[objInd] = dupeObj[objInd];
			} else if (typeof(dupeObj[objInd]) == 'boolean') {
				((dupeObj[objInd] == true) ? retObj[objInd] = true : retObj[objInd] = false);
			}
		}
	}
	return retObj;
};

if (!Ext.isArray && isArray) Ext.isArray = isArray;

//Credit: http://www.planetpdf.com/developer/article.asp?ContentID=testing_for_object_types_in_ja
// Return a boolean value telling whether
// the first argument is an Array object.
function isArray() {
	if (typeof arguments[0] == 'object') {
		var criterion = arguments[0].constructor.toString().match(/array/i);
 		return (criterion != null);
 	}
 	return false;
};
// Return a boolean value telling whether
// the first argument is a string.
function isString() {
	if (typeof arguments[0] == 'string')
		return true;
	if (typeof arguments[0] == 'object') {
		var criterion = arguments[0].constructor.toString().match(/string/i);
 		return (criterion != null);
 	}
 	return false;
};

biogps.utils.toggleScrollbar = function(el, hidden){
    if (hidden){
        el.setStyle('overflow', 'hidden');
    }
    else{
        el.setStyle('overflow', 'auto');
    }
};

/**
 * a wrapper for loading input gene list into genelist_panel
 * This is used by some plugins (e.g. DataChart) to load list
 * of genes into biogps.
 */
biogps.utils.loadGeneList = function(glist){
    if (Ext.isArray(glist) && glist.length>0 && biogps.genelist_panel){
        biogps.genelist_panel.loadFromGeneIDList(glist);
    }
};

// biogps.renderPluginBrowsePanel
// Loads up the Plugin Library as defined in pluginpanel.js.  The handling in
// this function deals mostly with setting up the Ext tab container to hold the
// library.  Loading / rendering of the actual library is kicked off by the
// call to 'initLibrary()' at the bottom.
//    Param forcerefresh: (optional)
//    Param historyParams: (optional) passed from biogps.dispatcher_by_hash()
//      further up in this file.  Since renderPluginBrowsePanel is only called
//      once, this is not part of the the back button history functionality.
//      Instead, we're using the same parameters here to handle deep linking.
biogps.renderPluginBrowsePanel = function(forcerefresh, historyParams){
	var tab_container = Ext.getCmp('center_panel');
	var container_id = 'pluginbrowse_panel';
	var container = tab_container.getItem(container_id);
	var is_new_container = false;
	if (!container) {
		container = tab_container.add({ title:'Plugin Library',
					                   id:container_id,
					                   closable: true,
					                   layout: 'fit',
					                   autoScroll:true});
		var fn = function(){if (Ext.get('pluginbrowse_panel')) biogps.renderPluginBrowsePanel(forcerefresh=true);};
		biogps.usrMgr.linkWithAuthentication(fn);
		container.on('destroy', function(){
			biogps.usrMgr.unlinkWithAuthentication(fn);
			biogps.currentPluginRenderer = null;
			delete biogps.currentPluginRenderer;
			//remove any preview window.
			var win;
			for (var i=0;i<Windows.windows.length;i++) {
				win = Windows.windows[i];
				if (win.getId().startsWith('preview')) {
					win.close();
				}
			}
		});
		is_new_container = true;
	}


    biogps.centerTab.suspendEvents();    //avoid to fire "tabchange" event again.
    biogps.centerTab.setActiveTab(container);
    biogps.centerTab.resumeEvents();
    // tab_container.setActiveTab(container);
    if (is_new_container || forcerefresh) {
        // Mask the whole tab to cover up the "flashing effect" in ticket #390
        var libMask = new Ext.LoadMask(biogps.centerTab.body, {
                            msg:"Loading Plugin Library...",
                            removeMask:true
                        });
        libMask.show();

        // Load the HTML content & initialize the library
		container.load({url:'/plugin_v1/browse',
		                scripts:true,
						nocache: true,
		                callback: function(el, success, response, options) {
		                	if (success) {
		                		if (initLibrary) {
                                    initLibrary(historyParams); }
		                	}
		                	else {
		                		biogps.ajaxfailure(null, response);
		                	}
		                }
		                });
    }
    else {
        // We get here by already having the library loaded, then clicked on
        // the link in the dark-blue top bar.  It should take us back to the
        // library home page.
        biogps.currentLibrary.setActiveItem('library-home','breadcrumb');
    }
}

//Ext.Element.autoHeight is deprecated. The following code copies from Element.lagacy.js to add this method back.
Ext.Element.addMethods({
    /**
     * Measures the element's content height and updates height to match. Note: this function uses setTimeout so
     * the new height may not be available immediately.
     * @param {Boolean} animate (optional) Animate the transition (defaults to false)
     * @param {Float} duration (optional) Length of the animation in seconds (defaults to .35)
     * @param {Function} onComplete (optional) Function to call when animation completes
     * @param {String} easing (optional) Easing method to use (defaults to easeOut)
     * @return {Ext.Element} this
     */
    autoHeight : function(animate, duration, onComplete, easing){
        var oldHeight = this.getHeight();
        this.clip();
        this.setHeight(1); // force clipping
        setTimeout(function(){
            var height = parseInt(this.dom.scrollHeight, 10); // parseInt for Safari
            if(!animate){
                this.setHeight(height);
                this.unclip();
                if(typeof onComplete == "function"){
                    onComplete();
                }
            }else{
                this.setHeight(oldHeight); // restore original height
                this.setHeight(height, animate, duration, function(){
                    this.unclip();
                    if(typeof onComplete == "function") onComplete();
                }.createDelegate(this), easing);
            }
        }.createDelegate(this), 0);
        return this;
    }
});
