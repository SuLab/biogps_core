/* ------------------------
 * BEGIN SOURCE FILE: biogps/biogps_base.js 
 */

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
Ext.SSL_SECURE_URL = 'https://biogps.gnf.org/assets/img/s.gif';

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
    biogps.ding = arguments;
    if (type=='remote'){
        biogps.error(response.error || "None");
    }
    else{
        //type = 'response'
        var url = options.url;
        var errorcode = response.status || "None";
        var errormsg =  response.responseText || response.statusText || "None";
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
                        biogps.setTitle('genereport');
                        biogps.clearListeners(biogps.Messenger, 'genereportrendered');
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
            '<div class="x-box-mc"><h3>', t, '</h3>', s, '</div>',
            '</div>'].join('');
}
var msgCt;
biogps.showmsg = function(title, msg){

    if(!msgCt){
        msgCt = Ext.DomHelper.insertFirst(document.body, {id:'msg-div'}, true);
    }
    msgCt.alignTo(document, 't-t');
    var s = String.format.apply(String, Array.prototype.slice.call(arguments, 1));
    var m = Ext.DomHelper.append(msgCt, {html:createBox(title, s)}, true);
    m.slideIn('t').pause(1).ghost("t", {remove:true});
};

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
        new Ext.ToolTip({
            target: cmp.el._maskMsg.dom.firstChild,
            html: msg,
            title: 'Why disabled?',
            autoHide: false,
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

biogps.setCookies = function(){
	var cp = new Ext.state.CookieProvider();
	//test cookies
	cp.set('test', 'cookietest');
	if (!cp.readCookies().test){
		alert("Warning: many features will not work as expected unless you enable cookies. Please enable cookies on your browser and refresh the page again.");
	}
	cp.clear('test');
	Ext.state.Manager.setProvider(cp);
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
	biogps.initLogo();
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
				if (!_reuse_exist_tab('infotab_about'))
					biogps.showInfoPage('about');
                biogps.setTitle(cmd);
				break;
			case 'terms':
				if (!_reuse_exist_tab('infotab_terms'))
					biogps.showInfoPage('terms');
                biogps.setTitle(cmd);
                break;
			case 'help':
				if (!_reuse_exist_tab('infotab_help'))
					biogps.showInfoPage('help');
                biogps.setTitle(cmd);
                break;
            case 'faq':
				if (!_reuse_exist_tab('infotab_faq'))
					biogps.showInfoPage('faq');
                biogps.setTitle(cmd);
                break;
            case 'downloads':
				if (!_reuse_exist_tab('infotab_downloads'))
					biogps.showInfoPage('downloads');
                biogps.setTitle(cmd);
                break;
			case 'search':
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
			case 'searchresult':
				_reuse_exist_tab('result_panel');
                biogps.setTitle(cmd);
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
				break;
			case 'pluginlibrary':
				if (!_reuse_exist_tab('pluginbrowse_panel')){
					biogps.renderPluginBrowsePanel(false, params); // Found at the bottom of this file.
                    biogps.setTitle(cmd);
				}
				else {
				    biogps.currentLibrary.dispatcher_by_params(params);
                    //setTitle will be called inside biogps.currentLibrary.hash_history (temp. solution)
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
    //biogps.ticker_msgs = [
    //            {text: 'Welcome to BioGPS site.', url: 'http://www.gnf.org'},
    //            {text: 'Check out tutorial screencasts &raquo;', action:function(){biogps.showInfoPage('help');}}
    //        ];

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

biogps.formatPermision= function(rolepermission){
	if (rolepermission) {
		if (rolepermission.first)
			rolepermission = rolepermission.first();	//Note: for now, use the first assigned role only.
		if (rolepermission == 'GNF Users')
			rolepermission = 'gnfusers';
		else if (rolepermission == 'BioGPS Users')
			rolepermission = 'biogpsusers';
		else
			rolepermission = 'myself';
	}
	else{
	    rolepermission = 'myself'
	}
	return rolepermission;
};

//biogps.AVAILABLE_SPECIES = ['human', 'mouse', 'rat'];  //this is assigned at index_ext.html template based on input URL
biogps.GENOMEASSEMBLY = {'hg18':'human',
                         'mm9': 'mouse',
                         'rn4': 'rat',
                         'dm3': 'drosophila'}

biogps.TAXONOMY_LIST = new Ext.data.SimpleStore({
					       fields: ['name', 'taxid'],
	  			           data :  [['Human', 9606],
					        		['Mouse', 10090],
					                ['Rat', 10116],
                                    ['drosophila', 7227]]
});

biogps.PLUGINKEYWORDS_common = [
{key: "{{EntrezGene}}", text: "Entrez GeneID"},
{key: "{{Symbol}}", text: "Symbol"},
{key: "{{EnsemblGene}}", text: "Ensembl GeneID"},
{key: "{{Unigene}}", text: "UniGene ID"},
{key: "{{Uniprot}}", text: "Uniprot ID"},
{key: "{{Refseq_mRNA}}", text: "RefSeq Transcript"},
{key: "{{Refseq_protein}}", text: "RefSeq Protein"},
{key: "{{PDB}}", text: "PDB ID"}
];
biogps.PLUGINKEYWORDS_other = [
//{key: "{{ApiDB_CryptoDB}}", text: "ApiDB_CryptoDB"},
//{key: "{{CGNC}}", text: "CGNC"},
//{key: "{{ECOCYC}}", text: "ECOCYC"},
//{key: "{{EcoGene}}", text: "EcoGene"},
//{key: "{{Ensembl}}", text: "Ensembl"},
{key: "{{FLYBASE}}", text: "FLYBASE", allowedSpecies: ['drosophila']},
//{key: "{{GeneDB}}", text: "GeneDB"},
{key: "{{assembly}}", text: "Genome Assembly"},
{key: "{{genomelocation}}", text: "Genomic Location"},
{key: "{{chr}}", text: "Chromosome"},
{key: "{{gstart}}", text: "Genomic Start Position"},
{key: "{{gend}}", text: "Genomic End Position"},
{key: "{{Aliases}}", text: "Aliases"},
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
{key: "{{TAIR}}", text: "TAIR", allowedSpecies: ['arabidopsis'] },
//{key: "{{UniProtKB/Swiss-Prot}}", text: "UniProtKB/Swiss-Prot"},
//{key: "{{VBRC}}", text: "VBRC"},
//{key: "{{VectorBase}}", text: "VectorBase"},
{key: "{{WormBase}}", text: "WormBase", allowedSpecies: ['c. elegans'] },
//{key: "{{Xenbase}}", text: "Xenbase"},
{key: "{{ZFIN}}", text: "ZFIN", allowedSpecies: ['zebrafish'] }
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
		container.load({url:'/plugin/browse',
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

/*!
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.Element
 */
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
/* END OF FILE: biogps/biogps_base.js */
/* ------------------------
 * BEGIN SOURCE FILE: ext/plugins/miframe-debug.js 
 */

/*!
 * ux.ManagedIFrame for ExtJS Library 3.1+
 * Copyright(c) 2008-2009 Active Group, Inc.
 * licensing@theactivegroup.com
 * http://licensing.theactivegroup.com
 */
     
 Ext.namespace('Ext.ux.plugin');
 Ext.onReady(function(){
    
   /* This important rule solves many of the <object/iframe>.reInit issues encountered
    * when setting display:none on an upstream(parent) element (on all Browsers except IE).
    * This default rule enables the new Panel:hideMode 'nosize'. The rule is designed to
    * set height/width to 0 cia CSS if hidden or collapsed.
    * Additional selectors also hide 'x-panel-body's within layouts to prevent
    * container and <object, img, iframe> bleed-thru.
    */
    var CSS = Ext.util.CSS;
    if(CSS){ 
        CSS.getRule('.x-hide-nosize') || //already defined?
            CSS.createStyleSheet('.x-hide-nosize{height:0px!important;width:0px!important;border:none!important;zoom:1;}.x-hide-nosize * {height:0px!important;width:0px!important;border:none!important;zoom:1;}');
        CSS.refreshCache();
    }
    
});

(function(){

      var El = Ext.Element, A = Ext.lib.Anim, supr = El.prototype; 
      var VISIBILITY = "visibility",
        DISPLAY = "display",
        HIDDEN = "hidden",
        NONE = "none";
        
      var fx = {};
    
      fx.El = {
	      	     
            /**
	         * Sets the CSS display property. Uses originalDisplay if the specified value is a boolean true.
	         * @param {Mixed} value Boolean value to display the element using its default display, or a string to set the display directly.
	         * @return {Ext.Element} this
	         */
	       setDisplayed : function(value) {
                var me=this;
                me.visibilityCls ? (me[value !== false ?'removeClass':'addClass'](me.visibilityCls)) :
	                supr.setDisplayed.call(me, value);
                return me;
	        },
            
            /**
	         * Returns true if display is not "none" or the visibilityCls has not been applied
	         * @return {Boolean}
	         */
	        isDisplayed : function() {
	            return !(this.hasClass(this.visibilityCls) || this.isStyle(DISPLAY, NONE));
	        },
	        // private
	        fixDisplay : function(){
	            var me = this;
	            supr.fixDisplay.call(me);
                me.visibilityCls && me.removeClass(me.visibilityCls); 
	        },
	
	        /**
	         * Checks whether the element is currently visible using both visibility, display, and nosize class properties.
             * @param {Boolean} deep (optional) True to walk the dom and see if parent elements are hidden (defaults to false)
             * @return {Boolean} True if the element is currently visible, else false
	         */
	        isVisible : function(deep) {
	            var vis = this.visible ||
				    (!this.isStyle(VISIBILITY, HIDDEN) && 
                        (this.visibilityCls ? 
                            !this.hasClass(this.visibilityCls) : 
                                !this.isStyle(DISPLAY, NONE))
                      );
				  
				  if (deep !== true || !vis) {
				    return vis;
				  }
				
				  var p = this.dom.parentNode,
                      bodyRE = /^body/i;
				
				  while (p && !bodyRE.test(p.tagName)) {
				    if (!Ext.fly(p, '_isVisible').isVisible()) {
				      return false;
				    }
				    p = p.parentNode;
				  }
				  return true;

	        },
            //Assert isStyle method for Ext 2.x
            isStyle: supr.isStyle || function(style, val) {
			    return this.getStyle(style) == val;
			}

	    };
        
        //Add basic capabilities to the Ext.Element.Flyweight class
        Ext.override(El.Flyweight, fx.El);

     /**
      * @class Ext.ux.plugin.VisibilityMode
      * @version 1.3.1
      * @author Doug Hendricks. doug[always-At]theactivegroup.com
      * @copyright 2007-2009, Active Group, Inc.  All rights reserved.
      * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a>
      * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
      * @singleton
      * @static
      * @desc This plugin provides an alternate mechanism for hiding Ext.Elements and a new hideMode for Ext.Components.<br />
      * <p>It is generally designed for use with all browsers <b>except</b> Internet Explorer, but may used on that Browser as well.
      * <p>If included in a Component as a plugin, it sets it's hideMode to 'nosize' and provides a new supported
      * CSS rule that sets the height and width of an element and all child elements to 0px (rather than
      * 'display:none', which causes DOM reflow to occur and re-initializes nested OBJECT, EMBED, and IFRAMES elements)
      * @example 
       var div = Ext.get('container');
       new Ext.ux.plugin.VisibilityMode().extend(div);
       //You can override the Element (instance) visibilityCls to any className you wish at any time
       div.visibilityCls = 'my-hide-class';
       div.hide() //or div.setDisplayed(false);
      
       // In Ext Layouts:      
       someContainer.add({
         xtype:'flashpanel',
         plugins: [new Ext.ux.plugin.VisibilityMode() ],
         ...
        });
    
       // or, Fix a specific Container only and all of it's child items:
       // Note: An upstream Container may still cause Reflow issues when hidden/collapsed
    
        var V = new Ext.ux.plugin.VisibilityMode({ bubble : false }) ;
        new Ext.TabPanel({
         plugins     : V,
         defaults    :{ plugins: V },
         items       :[....]
        });
     */
 Ext.ux.plugin.VisibilityMode = function(opt) {

    Ext.apply(this, opt||{});
    
    var CSS = Ext.util.CSS;

    if(CSS && !Ext.isIE && this.fixMaximizedWindow !== false && !Ext.ux.plugin.VisibilityMode.MaxWinFixed){
        //Prevent overflow:hidden (reflow) transitions when an Ext.Window is maximize.
        CSS.updateRule ( '.x-window-maximized-ct', 'overflow', '');
        Ext.ux.plugin.VisibilityMode.MaxWinFixed = true;  //only updates the CSS Rule once.
    }
    
   };


  Ext.extend(Ext.ux.plugin.VisibilityMode , Object, {

       /**
        * @cfg {Boolean} bubble If true, the VisibilityMode fixes are also applied to parent Containers which may also impact DOM reflow.
        * @default true
        */
      bubble              :  true,

      /**
      * @cfg {Boolean} fixMaximizedWindow If not false, the ext-all.css style rule 'x-window-maximized-ct' is disabled to <b>prevent</b> reflow
      * after overflow:hidden is applied to the document.body.
      * @default true
      */
      fixMaximizedWindow  :  true,
     
      /**
       *
       * @cfg {array} elements (optional) A list of additional named component members to also adjust visibility for.
       * <br />By default, the plugin handles most scenarios automatically.
       * @default null
       * @example ['bwrap','toptoolbar']
       */

      elements       :  null,

      /**
       * @cfg {String} visibilityCls A specific CSS classname to apply to Component element when hidden/made visible.
       * @default 'x-hide-nosize'
       */

      visibilityCls   : 'x-hide-nosize',

      /**
       * @cfg {String} hideMode A specific hideMode value to assign to affected Components.
       * @default 'nosize'
       */
      hideMode  :   'nosize' ,

      ptype     :  'uxvismode', 
      /**
      * Component plugin initialization method.
      * @param {Ext.Component} c The Ext.Component (or subclass) for which to apply visibilityMode treatment
      */
      init : function(c) {

        var hideMode = this.hideMode || c.hideMode,
            plugin = this,
            bubble = Ext.Container.prototype.bubble,
            changeVis = function(){

	            var els = [this.collapseEl, this.actionMode].concat(plugin.elements||[]);
	
	            Ext.each(els, function(el){
		            plugin.extend( this[el] || el );
	            },this);
	
	            var cfg = {
                    visFixed  : true,
                    animCollapse : false,
                    animFloat   : false,
		            hideMode  : hideMode,
		            defaults  : this.defaults || {}
	            };
	
	            cfg.defaults.hideMode = hideMode;
	            
	            Ext.apply(this, cfg);
	            Ext.apply(this.initialConfig || {}, cfg);
            
            };

         c.on('render', function(){

            // Bubble up the layout and set the new
            // visibility mode on parent containers
            // which might also cause DOM reflow when
            // hidden or collapsed.
            if(plugin.bubble !== false && this.ownerCt){

               bubble.call(this.ownerCt, function(){
                  this.visFixed || this.on('afterlayout', changeVis, this, {single:true} );
               });
             }

             changeVis.call(this);

          }, c, {single:true});

     },
     /**
      * @param {Element/Array} el The Ext.Element (or Array of Elements) to extend visibilityCls handling to.
      * @param {String} visibilityCls The className to apply to the Element when hidden.
      * @return this
      */
     extend : function(el, visibilityCls){
        el && Ext.each([].concat(el), function(e){
            
	        if(e && e.dom){
                 if('visibilityCls' in e)return;  //already applied or defined?
	             Ext.apply(e, fx.El);
	             e.visibilityCls = visibilityCls || this.visibilityCls;
	        }
        },this);
        return this;
     }

  });
  
  Ext.preg && Ext.preg('uxvismode', Ext.ux.plugin.VisibilityMode );
  /** @sourceURL=<uxvismode.js> */
  Ext.provide && Ext.provide('uxvismode');
})();/* global Ext El ElFrame ELD*/
/*
 * ******************************************************************************
 * This file is distributed on an AS IS BASIS WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * ***********************************************************************************
 * License: multidom.js is offered under an MIT License.
 * Donations are welcomed: http://donate.theactivegroup.com
 */

 /**
  * @class multidom
  * @version 2.11
  * @license MIT
  * @author Doug Hendricks. Forum ID: <a href="http://extjs.com/forum/member.php?u=8730">hendricd</a>
  * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
  * @copyright 2007-2010, Active Group, Inc. All rights reserved.
  * @description [Designed For Ext Core and ExtJs Frameworks (using ext-base adapter only) 3.0 or higher ONLY]
  * The multidom library extends (overloads) Ext Core DOM methods and functions to
  * provide document-targeted access to the documents loaded in external (FRAME/IFRAME)
  * documents.
  * <p>It maintains seperate DOM Element caches (and more) for each document instance encountered by the
  * framework, permitting safe access to DOM Elements across document instances that may share
  * the same Element id or name.  In essence, multidom extends the functionality provided by Ext Core
  * into any child document without having to load the Core library into the frame's global context.
  * <h3>Custom Element classes.</h3>
  * The Ext.get method is enhanced to support resolution of the custom Ext.Element implementations.
  * (The ux.ManagedIFrame 2 Element class is an example of such a class.)
  * <p>For example: If you were retrieving the Ext.Element instance for an IFRAME and the class
  * Ext.Element.IFRAME were defined:
  * <pre><code>Ext.get('myFrame')</pre></code>
  * would return an instance of Ext.Element.IFRAME for 'myFrame' if it were found.
  * @example
   // return the Ext.Element with an id 'someDiv' located in external document hosted by 'iframe'
   var iframe = Ext.get('myFrame');
   var div = Ext.get('someDiv', iframe.getFrameDocument()); //Firefox example
   if(div){
     div.center();
    }
   Note: ux.ManagedIFrame provides an equivalent 'get' method of it's own to access embedded DOM Elements
   for the document it manages.
   <pre><code>iframe.get('someDiv').center();</pre></code>

   Likewise, you can retrieve the raw Element of another document with:
   var el = Ext.getDom('myDiv', iframe.getFrameDocument());
 */

 (function(){

    /*
     * Ext.Element and Ext.lib.DOM enhancements.
     * Primarily provides the ability to interact with any document context
     * (not just the one Ext was loaded into).
     */
   var El = Ext.Element,
       ElFrame,
       ELD = Ext.lib.Dom,
       A = Ext.lib.Anim,
       Evm = Ext.EventManager,
       E = Ext.lib.Event,
       DOC = document,
       emptyFn = function(){},
       OP = Object.prototype,
       OPString = OP.toString,
       HTMLDoc = '[object HTMLDocument]';
       
   if(!Ext.elCache || parseInt( Ext.version.replace(/\./g,''),10) < 311 ) {
    alert ('Ext Release '+Ext.version+' is not supported');
   }

   /**
    * @private
    */
   Ext._documents= {}; 
   Ext._documents[Ext.id(document,'_doc')]=Ext.elCache;

    /**
    * @private
    * Resolve the Element cache for a given element/window/document context.
    */
    var resolveCache = ELD.resolveDocumentCache = function(el, cacheId){
        var doc = GETDOC(el),
            c = Ext.isDocument(doc) ? Ext.id(doc) : cacheId,
            cache = Ext._documents[c] || null, d, win;

         //see if the document instance is managed by FRAME
         if(!cache && doc && (win = doc.parentWindow || doc.defaultView)){  //Is it a frame document
              if(d = win.frameElement){
                   c = d.id || d.name;  //the id of the frame is the cacheKey
                }
         }
         return cache ||
            Ext._documents[c] ||
            (c ? Ext._documents[c] = {}: null);
     },
     clearCache = ELD.clearDocumentCache = function(cacheId){
       delete  Ext._documents[cacheId];
     };

   El.addMethods || ( El.addMethods = function(ov){ Ext.apply(El.prototype, ov||{}); });
   
   Ext.removeNode =  function(n){
         var dom = n ? n.dom || n : null;
         if(dom && dom.tagName != 'BODY'){
            var el, elc, elCache = resolveCache(dom), parent;

            //clear out any references if found in the El.cache(s)
            if((elc = elCache[dom.id]) && (el = elc.el) ){
                if(el.dom){
                    Ext.enableNestedListenerRemoval ? Evm.purgeElement(el.dom, true) : Evm.removeAll(el.dom);
                }
                delete elCache[dom.id];
                delete el.dom;
                delete el._context;
                el = null;
            }
            (parent = dom.parentElement || dom.parentNode) && parent.removeChild(dom);
            dom = null;
         }
    };

     var overload = function(pfn, fn ){
           var f = typeof pfn === 'function' ? pfn : function t(){};
           var ov = f._ovl; //call signature hash
           if(!ov){
               ov = { base: f};
               ov[f.length|| 0] = f;
               f= function t(){  //the proxy stub
                  var o = arguments.callee._ovl;
                  var fn = o[arguments.length] || o.base;
                  //recursion safety
                  return fn && fn != arguments.callee ? fn.apply(this,arguments): undefined;
               };
           }
           var fnA = [].concat(fn);
           for(var i=0,l=fnA.length; i<l; ++i){
             //ensures no duplicate call signatures, but last in rules!
             ov[fnA[i].length] = fnA[i];
           }
           f._ovl= ov;
           var t = null;
           return f;
       };

    Ext.applyIf( Ext, {
        overload : overload( overload,
           [
             function(fn){ return overload(null, fn);},
             function(obj, mname, fn){
                 return obj[mname] = overload(obj[mname],fn);}
          ]),

        isArray : function(v){
           return !!v && OPString.apply(v) == '[object Array]';
        },

        isObject:function(obj){
            return !!obj && typeof obj == 'object';
        },

        /**
         * HTMLDocument assertion with optional accessibility testing
         * @param {HTMLELement} el The DOM Element to test
         * @param {Boolean} testOrigin (optional) True to test "same-origin" access
         *
         */
        isDocument : function(el, testOrigin){
            var elm = el ? el.dom || el : null;
            var test = OPString.apply(elm) == HTMLDoc || (elm && elm.nodeType == 9);
            if(test && testOrigin){
                try{
                    test = !!elm.location;
                }
                catch(e){return false;}
            }
            return test;
        },

        isWindow : function(el){
          var elm = el ? el.dom || el : null;
          return elm ? !!elm.navigator || OPString.apply(elm) == "[object Window]" : false;
        },

        isIterable : function(v){
            //check for array or arguments
            if(Ext.isArray(v) || v.callee){
                return true;
            }
            //check for node list type
            if(/NodeList|HTMLCollection/.test(OPString.call(v))){
                return true;
            }
            //NodeList has an item and length property
            //IXMLDOMNodeList has nextNode method, needs to be checked first.
            return ((typeof v.nextNode != 'undefined' || v.item) && Ext.isNumber(v.length));
  
        },
        isElement : function(obj){
            return obj && Ext.type(obj)== 'element';
        },

        isEvent : function(obj){
            return OPString.apply(obj) == '[object Event]' || (Ext.isObject(obj) && !Ext.type(o.constructor) && (window.event && obj.clientX && obj.clientX == window.event.clientX));
        },

        isFunction: function(obj){
            return !!obj && typeof obj == 'function';
        },

        /**
         * Determine whether a specified DOMEvent is supported by a given HTMLElement or Object.
         * @param {String} type The eventName (without the 'on' prefix)
         * @param {HTMLElement/Object/String} testEl (optional) A specific HTMLElement/Object to test against, otherwise a tagName to test against.
         * based on the passed eventName is used, or DIV as default.
         * @return {Boolean} True if the passed object supports the named event.
         */
        isEventSupported : function(evName, testEl){
             var TAGNAMES = {
                  'select':'input',
                  'change':'input',
                  'submit':'form',
                  'reset':'form',
                  'load':'img',
                  'error':'img',
                  'abort':'img'
                },
                //Cached results
                cache = {},
                onPrefix = /^on/i,
                //Get a tokenized string of the form nodeName:type
                getKey = function(type, el){
                    var tEl = Ext.getDom(el);
                    return (tEl ?
                           (Ext.isElement(tEl) || Ext.isDocument(tEl) ?
                                tEl.nodeName.toLowerCase() :
                                    el.self ? '#window' : el || '#object')
                       : el || 'div') + ':' + type;
                };

            return function (evName, testEl) {
              evName = (evName || '').replace(onPrefix,'');
              var el, isSupported = false;
              var eventName = 'on' + evName;
              var tag = (testEl ? testEl : TAGNAMES[evName]) || 'div';
              var key = getKey(evName, tag);

              if(key in cache){
                //Use a previously cached result if available
                return cache[key];
              }

              el = Ext.isString(tag) ? DOC.createElement(tag): testEl;
              isSupported = (!!el && (eventName in el));

              isSupported || (isSupported = window.Event && !!(String(evName).toUpperCase() in window.Event));

              if (!isSupported && el) {
                el.setAttribute && el.setAttribute(eventName, 'return;');
                isSupported = Ext.isFunction(el[eventName]);
              }
              //save the cached result for future tests
              cache[key] = isSupported;
              el = null;
              return isSupported;
            };

        }()
    });


    /**
     * @private
     * Determine Ext.Element[tagName] or Ext.Element (default)
     */
    var assertClass = function(el){

        return El[(el.tagName || '-').toUpperCase()] || El;

      };

    var libFlyweight;
    function fly(el, doc) {
        if (!libFlyweight) {
            libFlyweight = new Ext.Element.Flyweight();
        }
        libFlyweight.dom = Ext.getDom(el, null, doc);
        return libFlyweight;
    }


    Ext.apply(Ext, {
    /*
     * Overload Ext.get to permit Ext.Element access to other document objects
     * This implementation maintains safe element caches for each document queried.
     *
     */

      get : El.get = function(el, doc){         //document targeted
            if(!el ){ return null; }

            Ext.isDocument(doc) || (doc = DOC);
            var ex, elm, id, cache = resolveCache(doc);
            if(typeof el == "string"){ // element id
                elm = Ext.getDom(el, null, doc);
                if(!elm) return null;
                if(cache[el] && cache[el].el){
                    ex = cache[el].el;
                    ex.dom = elm;
                }else{
                    ex = El.addToCache(new (assertClass(elm))(elm, null, doc));
                }
                return ex;
            
            }else if( el instanceof El ){ 

                cache = resolveCache(el);
                el.dom = el.getDocument().getElementById(el.id) || el.dom; // refresh dom element in case no longer valid,
                                                              // catch case where it hasn't been appended
                if(el.dom){
                    (cache[el.id] || 
                       (cache[el.id] = {data : {}, events : {}}
                       )).el = el; // in case it was created directly with Element(), let's cache it
                }
                return el;
                
            }else if(el.tagName || Ext.isWindow(el)){ // dom element
                cache = resolveCache(el);
                id = Ext.id(el);
                if(cache[id] && (ex = cache[id].el)){
                    ex.dom = el;
                }else{
                    ex = El.addToCache(new (assertClass(el))(el, null, doc), null, cache); 
                    el.navigator && (cache[id].skipGC = true);
                }
                return ex;

            }else if(Ext.isDocument(el)){

                if(!Ext.isDocument(el, true)){ return false; }  //is it accessible
                cache = resolveCache(el);

                if(cache[Ext.id(el)] && cache[el.id].el){
                    return cache[el.id].el;
                }
                // create a bogus element object representing the document object
                var f = function(){};
                f.prototype = El.prototype;
                var docEl = new f();
                docEl.dom = el;
                docEl.id = Ext.id(el,'_doc');
                docEl._isDoc = true;

                El.addToCache( docEl, null, cache);
                cache[docEl.id].skipGC = true;
                return docEl;
                        
             }else if(el.isComposite){
                return el;

            }else if(Ext.isArray(el)){
                return Ext.get(doc,doc).select(el);
            }
           return null;

    },

     /**
      * Ext.getDom to support targeted document contexts
      */
     getDom : function(el, strict, doc){
        var D = doc || DOC;
        if(!el || !D){
            return null;
        }
        if (el.dom){
            return el.dom;
        } else {
            if (Ext.isString(el)) {
                var e = D.getElementById(el);
                // IE returns elements with the 'name' and 'id' attribute.
                // we do a strict check to return the element with only the id attribute
                if (e && Ext.isIE && strict) {
                    if (el == e.getAttribute('id')) {
                        return e;
                    } else {
                        return null;
                    }
                }
                return e;
            } else {
                return el;
            }
        }
            
     },
     /**
     * Returns the current/specified document body as an {@link Ext.Element}.
     * @param {HTMLDocument} doc (optional)
     * @return Ext.Element The document's body
     */
     getBody : function(doc){
            var D = ELD.getDocument(doc) || DOC;
            return Ext.get(D.body || D.documentElement);
       },

     getDoc :Ext.overload([
       Ext.getDoc,
       function(doc){ return Ext.get(doc,doc); }
       ])
   });

   // private method for getting and setting element data
    El.data = function(el, key, value){
        el = El.get(el);
        if (!el) {
            return null;
        }
        var c = resolveCache(el)[el.id].data;
        if(arguments.length == 2){
            return c[key];
        }else{
            return (c[key] = value);
        }
    };
    
    El.addToCache = function(el, id, cache ){
	    id = id || el.id;    
        var C = cache || resolveCache(el);
	    C[id] = {
	        el:  el,
	        data: {},
	        events: {}
	    };
	    return el;
	};

    var propCache = {},
        camelRe = /(-[a-z])/gi,
        camelFn = function(m, a){ return a.charAt(1).toUpperCase(); },
        opacityRe = /alpha\(opacity=(.*)\)/i,
        trimRe = /^\s+|\s+$/g,
        marginrightRe = /marginRight/,
        propFloat = Ext.isIE ? 'styleFloat' : 'cssFloat',
        view = DOC.defaultView,
        VISMODE = 'visibilityMode',
        ELDISPLAY = El.DISPLAY,
        ORIGINALDISPLAY = 'originalDisplay',
        PADDING = "padding",
        MARGIN = "margin",
        BORDER = "border",
        LEFT = "-left",
        RIGHT = "-right",
        TOP = "-top",
        BOTTOM = "-bottom",
        WIDTH = "-width",
        MATH = Math,
        OPACITY = "opacity",
        VISIBILITY = "visibility",
        DISPLAY = "display",
        HIDDEN = "hidden",
        NONE = "none", 
        ISCLIPPED = 'isClipped',
        OVERFLOW = 'overflow',
        OVERFLOWX = 'overflow-x',
        OVERFLOWY = 'overflow-y',
        ORIGINALCLIP = 'originalClip',
        XMASKED = "x-masked",
        XMASKEDRELATIVE = "x-masked-relative",
        // special markup used throughout Ext when box wrapping elements
        borders = {l: BORDER + LEFT + WIDTH, r: BORDER + RIGHT + WIDTH, t: BORDER + TOP + WIDTH, b: BORDER + BOTTOM + WIDTH},
        paddings = {l: PADDING + LEFT, r: PADDING + RIGHT, t: PADDING + TOP, b: PADDING + BOTTOM},
        margins = {l: MARGIN + LEFT, r: MARGIN + RIGHT, t: MARGIN + TOP, b: MARGIN + BOTTOM},
        data = El.data,
        GETDOM = Ext.getDom,
        GET = Ext.get,
        DH = Ext.DomHelper,
        propRe = /^(?:scope|delay|buffer|single|stopEvent|preventDefault|stopPropagation|normalized|args|delegate)$/,
        CSS = Ext.util.CSS,  //Not available in Ext Core.
        getDisplay = function(dom){
            var d = data(dom, ORIGINALDISPLAY);
            if(d === undefined){
                data(dom, ORIGINALDISPLAY, d = '');
            }
            return d;
        },
        getVisMode = function(dom){
            var m = data(dom, VISMODE);
            if(m === undefined){
                data(dom, VISMODE, m = 1)
            }
            return m;
        };

    function chkCache(prop) {
        return propCache[prop] || (propCache[prop] = prop == 'float' ? propFloat : prop.replace(camelRe, camelFn));
    };


    El.addMethods({
        /**
         * Resolves the current document context of this Element
         */
        getDocument : function(){
           return this._context || (this._context = GETDOC(this));
        },

        /**
      * Removes this element from the DOM and deletes it from the cache
      * @param {Boolean} cleanse (optional) Perform a cleanse of immediate childNodes as well.
      * @param {Boolean} deep (optional) Perform a deep cleanse of all nested childNodes as well.
      */

        remove : function(cleanse, deep){
          var dom = this.dom;
          this.isMasked() && this.unmask();
          if(dom){
            
            Ext.removeNode(dom);
            delete this._context;
            delete this.dom;
          }
        },

         /**
         * Appends the passed element(s) to this element
         * @param {String/HTMLElement/Array/Element/CompositeElement} el
         * @param {Document} doc (optional) specific document context for the Element search
         * @return {Ext.Element} this
         */
        appendChild: function(el, doc){
            return GET(el, doc || this.getDocument()).appendTo(this);
        },

        /**
         * Appends this element to the passed element
         * @param {Mixed} el The new parent element
         * @param {Document} doc (optional) specific document context for the Element search
         * @return {Ext.Element} this
         */
        appendTo: function(el, doc){
            GETDOM(el, false, doc || this.getDocument()).appendChild(this.dom);
            return this;
        },

        /**
         * Inserts this element before the passed element in the DOM
         * @param {Mixed} el The element before which this element will be inserted
         * @param {Document} doc (optional) specific document context for the Element search
         * @return {Ext.Element} this
         */
        insertBefore: function(el, doc){
            (el = GETDOM(el, false, doc || this.getDocument())).parentNode.insertBefore(this.dom, el);
            return this;
        },

        /**
         * Inserts this element after the passed element in the DOM
         * @param {Mixed} el The element to insert after
         * @param {Document} doc (optional) specific document context for the Element search
         * @return {Ext.Element} this
         */
        insertAfter: function(el, doc){
            (el = GETDOM(el, false, doc || this.getDocument())).parentNode.insertBefore(this.dom, el.nextSibling);
            return this;
        },

        /**
         * Inserts (or creates) an element (or DomHelper config) as the first child of this element
         * @param {Mixed/Object} el The id or element to insert or a DomHelper config to create and insert
         * @param {Document} doc (optional) specific document context for the Element search
         * @return {Ext.Element} The new child
         */
        insertFirst: function(el, returnDom){
            el = el || {};
            if(el.nodeType || el.dom || typeof el == 'string'){ // element
                el = GETDOM(el);
                this.dom.insertBefore(el, this.dom.firstChild);
                return !returnDom ? GET(el) : el;
            }else{ // dh config
                return this.createChild(el, this.dom.firstChild, returnDom);
            }
        },

        /**
         * Replaces the passed element with this element
         * @param {Mixed} el The element to replace
         * @param {Document} doc (optional) specific document context for the Element search
         * @return {Ext.Element} this
         */
        replace: function(el, doc){
            el = GET(el, doc || this.getDocument());
            this.insertBefore(el);
            el.remove();
            return this;
        },

        /**
         * Replaces this element with the passed element
         * @param {Mixed/Object} el The new element or a DomHelper config of an element to create
         * @param {Document} doc (optional) specific document context for the Element search
         * @return {Ext.Element} this
         */
        replaceWith: function(el, doc){
            var me = this;
            if(el.nodeType || el.dom || typeof el == 'string'){
                el = GETDOM(el, false, doc || me.getDocument());
                me.dom.parentNode.insertBefore(el, me.dom);
            }else{
                el = DH.insertBefore(me.dom, el);
            }
            var C = resolveCache(me);
            Ext.removeNode(me.dom);
            me.id = Ext.id(me.dom = el);

            El.addToCache(me.isFlyweight ? new (assertClass(me.dom))(me.dom, null, C) : me);     
            return me;
        },


        /**
         * Inserts an html fragment into this element
         * @param {String} where Where to insert the html in relation to this element - beforeBegin, afterBegin, beforeEnd, afterEnd.
         * @param {String} html The HTML fragment
         * @param {Boolean} returnEl (optional) True to return an Ext.Element (defaults to false)
         * @return {HTMLElement/Ext.Element} The inserted node (or nearest related if more than 1 inserted)
         */
        insertHtml : function(where, html, returnEl){
            var el = DH.insertHtml(where, this.dom, html);
            return returnEl ? Ext.get(el, GETDOC(el)) : el;
        },
        
        /**
         * Sets the element's visibility mode. When setVisible() is called it
         * will use this to determine whether to set the visibility or the display property.
         * @param {Number} visMode Ext.Element.VISIBILITY or Ext.Element.DISPLAY
         * @return {Ext.Element} this
         */
        setVisibilityMode : function(visMode){  
            data(this.dom, VISMODE, visMode);
            return this;
        },
        
        /**
         * Sets the visibility of the element (see details). If the visibilityMode is set to Element.DISPLAY, it will use
         * the display property to hide the element, otherwise it uses visibility. The default is to hide and show using the visibility property.
         * @param {Boolean} visible Whether the element is visible
         * @param {Boolean/Object} animate (optional) True for the default animation, or a standard Element animation config object
         * @return {Ext.Element} this
         */
        setVisible : function(visible, animate){
            var me = this,
                dom = me.dom,
                isDisplay = getVisMode(this.dom) == ELDISPLAY;
                
            if (!animate || !me.anim) {
                if(isDisplay){
                    me.setDisplayed(visible);
                }else{
                    me.fixDisplay();
                    dom.style.visibility = visible ? "visible" : HIDDEN;
                }
            }else{
                // closure for composites            
                if(visible){
                    me.setOpacity(.01);
                    me.setVisible(true);
                }
                me.anim({opacity: { to: (visible?1:0) }},
                        me.preanim(arguments, 1),
                        null,
                        .35,
                        'easeIn',
                        function(){
                             if(!visible){
                                 dom.style[isDisplay ? DISPLAY : VISIBILITY] = (isDisplay) ? NONE : HIDDEN;                     
                                 Ext.fly(dom).setOpacity(1);
                             }
                        });
            }
            return me;
        },
        /**
         * Sets the CSS display property. Uses originalDisplay if the specified value is a boolean true.
         * @param {Mixed} value Boolean value to display the element using its default display, or a string to set the display directly.
         * @return {Ext.Element} this
         */
        setDisplayed : function(value) {            
            if(typeof value == "boolean"){
               value = value ? getDisplay(this.dom) : NONE;
            }
            this.setStyle(DISPLAY, value);
            return this;
        },
        
        // private
        fixDisplay : function(){
            var me = this;
            if(me.isStyle(DISPLAY, NONE)){
                me.setStyle(VISIBILITY, HIDDEN);
                me.setStyle(DISPLAY, getDisplay(this.dom)); // first try reverting to default
                if(me.isStyle(DISPLAY, NONE)){ // if that fails, default to block
                    me.setStyle(DISPLAY, "block");
                }
            }
        },
        
        /**
         * Convenience method for setVisibilityMode(Element.DISPLAY)
         * @param {String} display (optional) What to set display to when visible
         * @return {Ext.Element} this
         */
        enableDisplayMode : function(display){      
            this.setVisibilityMode(El.DISPLAY);
            if(!Ext.isEmpty(display)){
                data(this.dom, ORIGINALDISPLAY, display);
            }
            return this;
        },
        
        scrollIntoView : function(container, hscroll){
                var d = this.getDocument();
                var c = Ext.getDom(container, null, d) || Ext.getBody(d).dom;
                var el = this.dom;
                var o = this.getOffsetsTo(c),
                    s = this.getScroll(),
                    l = o[0] + s.left,
                    t = o[1] + s.top,
                    b = t + el.offsetHeight,
                    r = l + el.offsetWidth;
                var ch = c.clientHeight;
                var ct = parseInt(c.scrollTop, 10);
                var cl = parseInt(c.scrollLeft, 10);
                var cb = ct + ch;
                var cr = cl + c.clientWidth;
                if(el.offsetHeight > ch || t < ct){
                    c.scrollTop = t;
                }else if(b > cb){
                    c.scrollTop = b-ch;
                }
                c.scrollTop = c.scrollTop; // corrects IE, other browsers will ignore
                if(hscroll !== false){
                    if(el.offsetWidth > c.clientWidth || l < cl){
                        c.scrollLeft = l;
                    }else if(r > cr){
                        c.scrollLeft = r-c.clientWidth;
                    }
                    c.scrollLeft = c.scrollLeft;
                }
                return this;
        },

        contains : function(el){
            try {
                return !el ? false : ELD.isAncestor(this.dom, el.dom ? el.dom : el);
            } catch(e) {
                return false;
            }
        },

        /**
         * Returns the current scroll position of the element.
         * @return {Object} An object containing the scroll position in the format {left: (scrollLeft), top: (scrollTop)}
         */
        getScroll : function(){
            var d = this.dom,
            doc = this.getDocument(),
            body = doc.body,
            docElement = doc.documentElement,
            l,
            t,
            ret;

            if(Ext.isDocument(d) || d == body){
                if(Ext.isIE && ELD.docIsStrict(doc)){
                    l = docElement.scrollLeft;
                    t = docElement.scrollTop;
                }else{
                    l = window.pageXOffset;
                    t = window.pageYOffset;
                }
                ret = {left: l || (body ? body.scrollLeft : 0), top: t || (body ? body.scrollTop : 0)};
            }else{
                ret = {left: d.scrollLeft, top: d.scrollTop};
            }
            return ret;
        },
        /**
         * Normalizes currentStyle and computedStyle.
         * @param {String} property The style property whose value is returned.
         * @return {String} The current value of the style property for this element.
         */
        getStyle : function(){
            var getStyle =
             view && view.getComputedStyle ?
                function GS(prop){
                    var el = !this._isDoc ? this.dom : null,
                        v,
                        cs,
                        out,
                        display,
                        wk = Ext.isWebKit,
                        display;

                    if(!el || !el.style) return null;
                    prop = chkCache(prop);
                    // Fix bug caused by this: https://bugs.webkit.org/show_bug.cgi?id=13343
                    if(wk && marginrightRe.test(prop)){
                        display = this.getStyle(DISPLAY);
                        el.style.display = 'inline-block';
                    }
                    out =  (v = el.style[prop]) ? v :
                           (cs = view.getComputedStyle(el, '')) ? cs[prop] : null;
                     // Webkit returns rgb values for transparent.
                    if(wk){
                        if(out == 'rgba(0, 0, 0, 0)'){
                            out = 'transparent';
                        }else if(display){
                            el.style.display = display;
                        }
                    }
                    return out;
                } :
                function GS(prop){ //IE
                   var el = !this._isDoc ? this.dom : null,
                        m,
                        cs;
                    if(!el || !el.style) return null;
                    if (prop == OPACITY) {
                        if (el.style.filter.match) {
                            if(m = el.style.filter.match(opacityRe)){
                                var fv = parseFloat(m[1]);
                                if(!isNaN(fv)){
                                    return fv ? fv / 100 : 0;
                                }
                            }
                        }
                        return 1;
                    }
                    prop = chkCache(prop);
                    return el.style[prop] || ((cs = el.currentStyle) ? cs[prop] : null);
                };
                var GS = null;
                return getStyle;
        }(),
        /**
         * Wrapper for setting style properties, also takes single object parameter of multiple styles.
         * @param {String/Object} property The style property to be set, or an object of multiple styles.
         * @param {String} value (optional) The value to apply to the given property, or null if an object was passed.
         * @return {Ext.Element} this
         */
        setStyle : function(prop, value){
            if(this._isDoc || Ext.isDocument(this.dom)) return this;
            var tmp,
                style,
                camel;
            if (!Ext.isObject(prop)) {
                tmp = {};
                tmp[prop] = value;
                prop = tmp;
            }
            for (style in prop) {
                value = prop[style];
                style == OPACITY ?
                    this.setOpacity(value) :
                    this.dom.style[chkCache(style)] = value;
            }
            return this;
        },
        /**
        * Centers the Element in either the viewport, or another Element.
        * @param {Mixed} centerIn (optional) The element in which to center the element.
        */
        center : function(centerIn){
            return this.alignTo(centerIn || this.getDocument(), 'c-c');
        },
        
        /**
         * Puts a mask over this element to disable user interaction. Requires core.css.
         * This method can only be applied to elements which accept child nodes.
         * @param {String} msg (optional) A message to display in the mask
         * @param {String} msgCls (optional) A css class to apply to the msg element
         * @return {Element} The mask element
         */
        mask : function(msg, msgCls){
            var me = this,
                dom = me.dom,
                dh = Ext.DomHelper,
                EXTELMASKMSG = "ext-el-mask-msg",
                el, 
                mask;
                
            if(me.getStyle("position") == "static"){
                me.addClass(XMASKEDRELATIVE);
            }
            if((el = data(dom, 'maskMsg'))){
                el.remove();
            }
            if((el = data(dom, 'mask'))){
                el.remove();
            }
    
            mask = dh.append(dom, {cls : "ext-el-mask"}, true);
            data(dom, 'mask', mask);
    
            me.addClass(XMASKED);
            mask.setDisplayed(true);
            if(typeof msg == 'string'){
                var mm = dh.append(dom, {cls : EXTELMASKMSG, cn:{tag:'div'}}, true);
                data(dom, 'maskMsg', mm);
                mm.dom.className = msgCls ? EXTELMASKMSG + " " + msgCls : EXTELMASKMSG;
                mm.dom.firstChild.innerHTML = msg;
                mm.setDisplayed(true);
                mm.center(me);
            }
            if(Ext.isIE && !(Ext.isIE7 && Ext.isStrict) && me.getStyle('height') == 'auto'){ // ie will not expand full height automatically
                mask.setSize(undefined, me.getHeight());
            }
            return mask;
        },
    
        /**
         * Removes a previously applied mask.
         */
        unmask : function(){
            var me = this,
                dom = me.dom,
                mask = data(dom, 'mask'),
                maskMsg = data(dom, 'maskMsg');
            if(mask){
                if(maskMsg){
                    maskMsg.remove();
                    data(dom, 'maskMsg', undefined);
                }
                mask.remove();
                data(dom, 'mask', undefined);
            }
            me.removeClass([XMASKED, XMASKEDRELATIVE]);
        },
        
        /**
         * Returns true if this element is masked
         * @return {Boolean}
         */
        isMasked : function(){
            var m = data(this.dom, 'mask');
            return m && m.isVisible();
        },

        /**
        * Calculates the x, y to center this element on the screen
        * @return {Array} The x, y values [x, y]
        */
        getCenterXY : function(){
            return this.getAlignToXY(this.getDocument(), 'c-c');
        },
        /**
         * Gets the x,y coordinates specified by the anchor position on the element.
         * @param {String} anchor (optional) The specified anchor position (defaults to "c").  See {@link #alignTo}
         * for details on supported anchor positions.
         * @param {Boolean} local (optional) True to get the local (element top/left-relative) anchor position instead
         * of page coordinates
         * @param {Object} size (optional) An object containing the size to use for calculating anchor position
         * {width: (target width), height: (target height)} (defaults to the element's current size)
         * @return {Array} [x, y] An array containing the element's x and y coordinates
         */
        getAnchorXY : function(anchor, local, s){
            //Passing a different size is useful for pre-calculating anchors,
            //especially for anchored animations that change the el size.
            anchor = (anchor || "tl").toLowerCase();
            s = s || {};

            var me = this,  doc = this.getDocument(),
                vp = me.dom == doc.body || me.dom == doc,
                w = s.width || vp ? ELD.getViewWidth(false,doc) : me.getWidth(),
                h = s.height || vp ? ELD.getViewHeight(false,doc) : me.getHeight(),
                xy,
                r = Math.round,
                o = me.getXY(),
                scroll = me.getScroll(),
                extraX = vp ? scroll.left : !local ? o[0] : 0,
                extraY = vp ? scroll.top : !local ? o[1] : 0,
                hash = {
                    c  : [r(w * .5), r(h * .5)],
                    t  : [r(w * .5), 0],
                    l  : [0, r(h * .5)],
                    r  : [w, r(h * .5)],
                    b  : [r(w * .5), h],
                    tl : [0, 0],
                    bl : [0, h],
                    br : [w, h],
                    tr : [w, 0]
                };

            xy = hash[anchor];
            return [xy[0] + extraX, xy[1] + extraY];
        },

        /**
         * Anchors an element to another element and realigns it when the window is resized.
         * @param {Mixed} element The element to align to.
         * @param {String} position The position to align to.
         * @param {Array} offsets (optional) Offset the positioning by [x, y]
         * @param {Boolean/Object} animate (optional) True for the default animation or a standard Element animation config object
         * @param {Boolean/Number} monitorScroll (optional) True to monitor body scroll and reposition. If this parameter
         * is a number, it is used as the buffer delay (defaults to 50ms).
         * @param {Function} callback The function to call after the animation finishes
         * @return {Ext.Element} this
         */
        anchorTo : function(el, alignment, offsets, animate, monitorScroll, callback){
            var me = this,
                dom = me.dom;

            function action(){
                fly(dom).alignTo(el, alignment, offsets, animate);
                Ext.callback(callback, fly(dom));
            };

            Ext.EventManager.onWindowResize(action, me);

            if(!Ext.isEmpty(monitorScroll)){
                Ext.EventManager.on(window, 'scroll', action, me,
                    {buffer: !isNaN(monitorScroll) ? monitorScroll : 50});
            }
            action.call(me); // align immediately
            return me;
        },

        /**
         * Returns the current scroll position of the element.
         * @return {Object} An object containing the scroll position in the format {left: (scrollLeft), top: (scrollTop)}
         */
        getScroll : function(){
            var d = this.dom,
                doc = this.getDocument(),
                body = doc.body,
                docElement = doc.documentElement,
                l,
                t,
                ret;

            if(d == doc || d == body){
                if(Ext.isIE && ELD.docIsStrict(doc)){
                    l = docElement.scrollLeft;
                    t = docElement.scrollTop;
                }else{
                    l = window.pageXOffset;
                    t = window.pageYOffset;
                }
                ret = {left: l || (body ? body.scrollLeft : 0), top: t || (body ? body.scrollTop : 0)};
            }else{
                ret = {left: d.scrollLeft, top: d.scrollTop};
            }
            return ret;
        },

        /**
         * Gets the x,y coordinates to align this element with another element. See {@link #alignTo} for more info on the
         * supported position values.
         * @param {Mixed} element The element to align to.
         * @param {String} position The position to align to.
         * @param {Array} offsets (optional) Offset the positioning by [x, y]
         * @return {Array} [x, y]
         */
        getAlignToXY : function(el, p, o){
            var doc;
            el = Ext.get(el, doc = this.getDocument());

            if(!el || !el.dom){
                throw "Element.getAlignToXY with an element that doesn't exist";
            }

            o = o || [0,0];
            p = (p == "?" ? "tl-bl?" : (!/-/.test(p) && p != "" ? "tl-" + p : p || "tl-bl")).toLowerCase();

            var me = this,
                d = me.dom,
                a1,
                a2,
                x,
                y,
                //constrain the aligned el to viewport if necessary
                w,
                h,
                r,
                dw = ELD.getViewWidth(false,doc) -10, // 10px of margin for ie
                dh = ELD.getViewHeight(false,doc)-10, // 10px of margin for ie
                p1y,
                p1x,
                p2y,
                p2x,
                swapY,
                swapX,
                docElement = doc.documentElement,
                docBody = doc.body,
                scrollX = (docElement.scrollLeft || docBody.scrollLeft || 0)+5,
                scrollY = (docElement.scrollTop || docBody.scrollTop || 0)+5,
                c = false, //constrain to viewport
                p1 = "",
                p2 = "",
                m = p.match(/^([a-z]+)-([a-z]+)(\?)?$/);

            if(!m){
               throw "Element.getAlignToXY with an invalid alignment " + p;
            }

            p1 = m[1];
            p2 = m[2];
            c = !!m[3];

            //Subtract the aligned el's internal xy from the target's offset xy
            //plus custom offset to get the aligned el's new offset xy
            a1 = me.getAnchorXY(p1, true);
            a2 = el.getAnchorXY(p2, false);

            x = a2[0] - a1[0] + o[0];
            y = a2[1] - a1[1] + o[1];

            if(c){
               w = me.getWidth();
               h = me.getHeight();
               r = el.getRegion();
               //If we are at a viewport boundary and the aligned el is anchored on a target border that is
               //perpendicular to the vp border, allow the aligned el to slide on that border,
               //otherwise swap the aligned el to the opposite border of the target.
               p1y = p1.charAt(0);
               p1x = p1.charAt(p1.length-1);
               p2y = p2.charAt(0);
               p2x = p2.charAt(p2.length-1);
               swapY = ((p1y=="t" && p2y=="b") || (p1y=="b" && p2y=="t"));
               swapX = ((p1x=="r" && p2x=="l") || (p1x=="l" && p2x=="r"));


               if (x + w > dw + scrollX) {
                    x = swapX ? r.left-w : dw+scrollX-w;
               }
               if (x < scrollX) {
                   x = swapX ? r.right : scrollX;
               }
               if (y + h > dh + scrollY) {
                    y = swapY ? r.top-h : dh+scrollY-h;
                }
               if (y < scrollY){
                   y = swapY ? r.bottom : scrollY;
               }
            }

            return [x,y];
        },
            // private ==>  used outside of core
        adjustForConstraints : function(xy, parent, offsets){
            return this.getConstrainToXY(parent || this.getDocument(), false, offsets, xy) ||  xy;
        },

        // private ==>  used outside of core
        getConstrainToXY : function(el, local, offsets, proposedXY){
            var os = {top:0, left:0, bottom:0, right: 0};

            return function(el, local, offsets, proposedXY){
                var doc = this.getDocument();
                el = Ext.get(el, doc);
                offsets = offsets ? Ext.applyIf(offsets, os) : os;

                var vw, vh, vx = 0, vy = 0;
                if(el.dom == doc.body || el.dom == doc){
                    vw = ELD.getViewWidth(false,doc);
                    vh = ELD.getViewHeight(false,doc);
                }else{
                    vw = el.dom.clientWidth;
                    vh = el.dom.clientHeight;
                    if(!local){
                        var vxy = el.getXY();
                        vx = vxy[0];
                        vy = vxy[1];
                    }
                }

                var s = el.getScroll();

                vx += offsets.left + s.left;
                vy += offsets.top + s.top;

                vw -= offsets.right;
                vh -= offsets.bottom;

                var vr = vx+vw;
                var vb = vy+vh;

                var xy = proposedXY || (!local ? this.getXY() : [this.getLeft(true), this.getTop(true)]);
                var x = xy[0], y = xy[1];
                var w = this.dom.offsetWidth, h = this.dom.offsetHeight;

                // only move it if it needs it
                var moved = false;

                // first validate right/bottom
                if((x + w) > vr){
                    x = vr - w;
                    moved = true;
                }
                if((y + h) > vb){
                    y = vb - h;
                    moved = true;
                }
                // then make sure top/left isn't negative
                if(x < vx){
                    x = vx;
                    moved = true;
                }
                if(y < vy){
                    y = vy;
                    moved = true;
                }
                return moved ? [x, y] : false;
            };
        }(),
        /**
        * Calculates the x, y to center this element on the screen
        * @return {Array} The x, y values [x, y]
        */
        getCenterXY : function(){
            return this.getAlignToXY(Ext.getBody(this.getDocument()), 'c-c');
        },
       
        /**
        * Centers the Element in either the viewport, or another Element.
        * @param {Mixed} centerIn (optional) The element in which to center the element.
        */
        center : function(centerIn){
            return this.alignTo(centerIn || Ext.getBody(this.getDocument()), 'c-c');
        } ,

        /**
         * Looks at this node and then at parent nodes for a match of the passed simple selector (e.g. div.some-class or span:first-child)
         * @param {String} selector The simple selector to test
         * @param {Number/Mixed} maxDepth (optional) The max depth to search as a number or element (defaults to 50 || document.body)
         * @param {Boolean} returnEl (optional) True to return a Ext.Element object instead of DOM node
         * @return {HTMLElement} The matching DOM node (or null if no match was found)
         */
        findParent : function(simpleSelector, maxDepth, returnEl){
            var p = this.dom,
                D = this.getDocument(),
                b = D.body,
                depth = 0,
                stopEl;
            if(Ext.isGecko && OPString.call(p) == '[object XULElement]') {
                return null;
            }
            maxDepth = maxDepth || 50;
            if (isNaN(maxDepth)) {
                stopEl = Ext.getDom(maxDepth, null, D);
                maxDepth = Number.MAX_VALUE;
            }
            while(p && p.nodeType == 1 && depth < maxDepth && p != b && p != stopEl){
                if(Ext.DomQuery.is(p, simpleSelector)){
                    return returnEl ? Ext.get(p, D) : p;
                }
                depth++;
                p = p.parentNode;
            }
            return null;
        },
        /**
         *  Store the current overflow setting and clip overflow on the element - use <tt>{@link #unclip}</tt> to remove
         * @return {Ext.Element} this
         */
        clip : function(){
            var me = this,
                dom = me.dom;
                
            if(!data(dom, ISCLIPPED)){
                data(dom, ISCLIPPED, true);
                data(dom, ORIGINALCLIP, {
                    o: me.getStyle(OVERFLOW),
                    x: me.getStyle(OVERFLOWX),
                    y: me.getStyle(OVERFLOWY)
                });
                me.setStyle(OVERFLOW, HIDDEN);
                me.setStyle(OVERFLOWX, HIDDEN);
                me.setStyle(OVERFLOWY, HIDDEN);
            }
            return me;
        },
    
        /**
         *  Return clipping (overflow) to original clipping before <tt>{@link #clip}</tt> was called
         * @return {Ext.Element} this
         */
        unclip : function(){
            var me = this,
                dom = me.dom;
                
            if(data(dom, ISCLIPPED)){
                data(dom, ISCLIPPED, false);
                var o = data(dom, ORIGINALCLIP);
                if(o.o){
                    me.setStyle(OVERFLOW, o.o);
                }
                if(o.x){
                    me.setStyle(OVERFLOWX, o.x);
                }
                if(o.y){
                    me.setStyle(OVERFLOWY, o.y);
                }
            }
            return me;
        },
        
        getViewSize : function(){
            var doc = this.getDocument(),
                d = this.dom,
                isDoc = (d == doc || d == doc.body);

            // If the body, use Ext.lib.Dom
            if (isDoc) {
                var extdom = Ext.lib.Dom;
                return {
                    width : extdom.getViewWidth(),
                    height : extdom.getViewHeight()
                }

            // Else use clientHeight/clientWidth
            } else {
                return {
                    width : d.clientWidth,
                    height : d.clientHeight
                }
            }
        },
        /**
        * <p>Returns the dimensions of the element available to lay content out in.<p>
        *
        * getStyleSize utilizes prefers style sizing if present, otherwise it chooses the larger of offsetHeight/clientHeight and offsetWidth/clientWidth.
        * To obtain the size excluding scrollbars, use getViewSize
        *
        * Sizing of the document body is handled at the adapter level which handles special cases for IE and strict modes, etc.
        */

        getStyleSize : function(){
            var me = this,
                w, h,
                doc = this.getDocument(),
                d = this.dom,
                isDoc = (d == doc || d == doc.body),
                s = d.style;

            // If the body, use Ext.lib.Dom
            if (isDoc) {
                var extdom = Ext.lib.Dom;
                return {
                    width : extdom.getViewWidth(),
                    height : extdom.getViewHeight()
                }
            }
            // Use Styles if they are set
            if(s.width && s.width != 'auto'){
                w = parseFloat(s.width);
                if(me.isBorderBox()){
                   w -= me.getFrameWidth('lr');
                }
            }
            // Use Styles if they are set
            if(s.height && s.height != 'auto'){
                h = parseFloat(s.height);
                if(me.isBorderBox()){
                   h -= me.getFrameWidth('tb');
                }
            }
            // Use getWidth/getHeight if style not set.
            return {width: w || me.getWidth(true), height: h || me.getHeight(true)};
        }
    });
    
    //Stop the existing collectorThread
    Ext.isDefined(El.collectorThreadId) && clearInterval(El.collectorThreadId);
    // private
	// Garbage collection - uncache elements/purge listeners on orphaned elements
	// so we don't hold a reference and cause the browser to retain them
	function garbageCollect(){
	    if(!Ext.enableGarbageCollector){
	        clearInterval(El.collectorThreadId);
	    } else {
	        var eid,
	            el,
	            d,
                o,
                EC = Ext.elCache;
	
	        for(eid in EC){
                o = EC[eid];
                if(o.skipGC){
	                continue;
	            }
	            el = o.el;
	            d = el.dom;
	            // -------------------------------------------------------
	            // Determining what is garbage:
	            // -------------------------------------------------------
	            // !d
	            // dom node is null, definitely garbage
	            // -------------------------------------------------------
	            // !d.parentNode
	            // no parentNode == direct orphan, definitely garbage
	            // -------------------------------------------------------
	            // !d.offsetParent && !document.getElementById(eid)
	            // display none elements have no offsetParent so we will
	            // also try to look it up by it's id. However, check
	            // offsetParent first so we don't do unneeded lookups.
	            // This enables collection of elements that are not orphans
	            // directly, but somewhere up the line they have an orphan
	            // parent.
	            // -------------------------------------------------------
	            
	            if(!d || !d.parentNode || (!d.offsetParent && !DOC.getElementById(eid))){
	                if(Ext.enableListenerCollection){
	                    Ext.EventManager.removeAll(d);
	                }
	                delete EC[eid];
	            }
	        
            }
	        // Cleanup IE COM Object Hash reference leaks 
	        if (Ext.isIE) {
	            var t = {};
	            for (eid in EC) {
	                t[eid] = EC[eid];
	            }
	            Ext.elCache = Ext._documents[Ext.id(document)] = t;
                t = null;
	        }
	    }
	}
    //Restart if enabled
    if(Ext.enableGarbageCollector){
	   El.collectorThreadId = setInterval(garbageCollect, 30000);
    }

    Ext.apply(ELD , {
        /**
         * Resolve the current document context of the passed Element
         */
        getDocument : function(el, accessTest){
          var dom= null;
          try{
            dom = Ext.getDom(el, null, null); //will fail if El.dom is non "same-origin" document
          }catch(ex){}

          var isDoc = Ext.isDocument(dom);
          if(isDoc){
            if(accessTest){
                return Ext.isDocument(dom, accessTest) ? dom : null;
            }
            return dom;
          }
          return dom ?
                dom.ownerDocument ||  //Element
                dom.document //Window
                : null;
        },

        /**
         * Return the Compatability Mode of the passed document or Element
         */
        docIsStrict : function(doc){
            return (Ext.isDocument(doc) ? doc : this.getDocument(doc)).compatMode == "CSS1Compat";
        },

        getViewWidth : Ext.overload ([
           ELD.getViewWidth || function(full){},
            function() { return this.getViewWidth(false);},
            function(full, doc) {
                return full ? this.getDocumentWidth(doc) : this.getViewportWidth(doc);
            }]
         ),

        getViewHeight : Ext.overload ([
            ELD.getViewHeight || function(full){},
            function() { return this.getViewHeight(false);},
            function(full, doc) {
                return full ? this.getDocumentHeight(doc) : this.getViewportHeight(doc);
            }]),

        getDocumentHeight: Ext.overload([
           ELD.getDocumentHeight || emptyFn,
           function(doc) {
            if(doc=this.getDocument(doc)){
              return Math.max(
                 !this.docIsStrict(doc) ? doc.body.scrollHeight : doc.documentElement.scrollHeight
                 , this.getViewportHeight(doc)
                 );
            }
            return undefined;
           }
         ]),

        getDocumentWidth: Ext.overload([
           ELD.getDocumentWidth || emptyFn,
           function(doc) {
              if(doc=this.getDocument(doc)){
                return Math.max(
                 !this.docIsStrict(doc) ? doc.body.scrollWidth : doc.documentElement.scrollWidth
                 , this.getViewportWidth(doc)
                 );
              }
              return undefined;
            }
        ]),

        getViewportHeight: Ext.overload([
           ELD.getViewportHeight || emptyFn,
           function(doc){
             if(doc=this.getDocument(doc)){
                if(Ext.isIE){
                    return this.docIsStrict(doc) ? doc.documentElement.clientHeight : doc.body.clientHeight;
                }else{
                    return doc.defaultView.innerHeight;
                }
             }
             return undefined;
           }
        ]),

        getViewportWidth: Ext.overload([
           ELD.getViewportWidth || emptyFn,
           function(doc) {
              if(doc=this.getDocument(doc)){
                return !this.docIsStrict(doc) && !Ext.isOpera ? doc.body.clientWidth :
                   Ext.isIE ? doc.documentElement.clientWidth : doc.defaultView.innerWidth;
              }
              return undefined;
            }
        ]),

        getXY : Ext.overload([
            ELD.getXY || emptyFn,
            function(el, doc) {

                el = Ext.getDom(el, null, doc);
                var D= this.getDocument(el),
                    bd = D ? (D.body || D.documentElement): null;

                if(!el || !bd || el == bd){ return [0, 0]; }
                return this.getXY(el);
            }
          ])
                
                
    });

    var GETDOC = ELD.getDocument,
        flies = El._flyweights;

    /**
     * @private
     * Add Ext.fly support for targeted document contexts
     */

    Ext.fly = El.fly = function(el, named, doc){
        var ret = null;
        named = named || '_global';

        if (el = Ext.getDom(el, null, doc)) {
            (ret = flies[named] = (flies[named] || new El.Flyweight())).dom = el;
            Ext.isDocument(el) && (ret._isDoc = true);
        }
        return ret;
    };

    var flyFn = function(){};
    flyFn.prototype = El.prototype;

    // dom is optional
    El.Flyweight = function(dom){
        this.dom = dom;
    };

    El.Flyweight.prototype = new flyFn();
    El.Flyweight.prototype.isFlyweight = true;
    
    function addListener(el, ename, fn, task, wrap, scope){
        el = Ext.getDom(el);
        if(!el){ return; }

        var id = Ext.get(el).id,
            es = (resolveCache(el)[id]||{}).events || {},
            wfn;

        wfn = E.on(el, ename, wrap);
        es[ename] = es[ename] || [];
        es[ename].push([fn, wrap, scope, wfn, task]);

        // this is a workaround for jQuery and should somehow be removed from Ext Core in the future
        // without breaking ExtJS.
        if(ename == "mousewheel" && el.addEventListener){ 
            var args = ["DOMMouseScroll", wrap, false];
            el.addEventListener.apply(el, args);
            Ext.EventManager.addListener(window, 'beforeunload', function(){
                el.removeEventListener.apply(el, args);
            });
        }
        if(ename == "mousedown" && Ext.isDocument(el)){ // fix stopped mousedowns on the document
            Ext.EventManager.stoppedMouseDownEvent.addListener(wrap);
        }
    };

    function createTargeted(h, o){
        return function(){
            var args = Ext.toArray(arguments);
            if(o.target == Ext.EventObject.setEvent(args[0]).target){
                h.apply(this, args);
            }
        };
    };

    function createBuffered(h, o, task){
        return function(e){
            // create new event object impl so new events don't wipe out properties
            task.delay(o.buffer, h, null, [new Ext.EventObjectImpl(e)]);
        };
    };

    function createSingle(h, el, ename, fn, scope){
        return function(e){
            Ext.EventManager.removeListener(el, ename, fn, scope);
            h(e);
        };
    };

    function createDelayed(h, o, fn){
        return function(e){
            var task = new Ext.util.DelayedTask(h);
            (fn.tasks || (fn.tasks = [])).push(task);
            task.delay(o.delay || 10, h, null, [new Ext.EventObjectImpl(e)]);
        };
    };

    function listen(element, ename, opt, fn, scope){
        var o = !Ext.isObject(opt) ? {} : opt,
            el = Ext.getDom(element), task;

        fn = fn || o.fn;
        scope = scope || o.scope;

        if(!el){
            throw "Error listening for \"" + ename + '\". Element "' + element + '" doesn\'t exist.';
        }
        function h(e){
            // prevent errors while unload occurring
            if(!window.Ext){ return; }
            e = Ext.EventObject.setEvent(e);
            var t;
            if (o.delegate) {
                if(!(t = e.getTarget(o.delegate, el))){
                    return;
                }
            } else {
                t = e.target;
            }
            if (o.stopEvent) {
                e.stopEvent();
            }
            if (o.preventDefault) {
               e.preventDefault();
            }
            if (o.stopPropagation) {
                e.stopPropagation();
            }
            if (o.normalized) {
                e = e.browserEvent;
            }

            fn.call(scope || el, e, t, o);
        };
        if(o.target){
            h = createTargeted(h, o);
        }
        if(o.delay){
            h = createDelayed(h, o, fn);
        }
        if(o.single){
            h = createSingle(h, el, ename, fn, scope);
        }
        if(o.buffer){
            task = new Ext.util.DelayedTask(h);
            h = createBuffered(h, o, task);
        }

        addListener(el, ename, fn, task, h, scope);
        return h;
    };

    Ext.apply(Evm ,{
         addListener : Evm.on = function(element, eventName, fn, scope, options){
            if(Ext.isObject(eventName)){
                var o = eventName, e, val;
                for(e in o){
                    val = o[e];
                    if(!propRe.test(e)){
                        if(Ext.isFunction(val)){
                            // shared options
                            listen(element, e, o, val, o.scope);
                        }else{
                            // individual options
                            listen(element, e, val);
                        }
                    }
                }
            } else {
                listen(element, eventName, options, fn, scope);
            }
        },

        /**
         * Removes an event handler from an element.  The shorthand version {@link #un} is equivalent.  Typically
         * you will use {@link Ext.Element#removeListener} directly on an Element in favor of calling this version.
         * @param {String/HTMLElement} el The id or html element from which to remove the listener.
         * @param {String} eventName The name of the event.
         * @param {Function} fn The handler function to remove. <b>This must be a reference to the function passed into the {@link #addListener} call.</b>
         * @param {Object} scope If a scope (<b><code>this</code></b> reference) was specified when the listener was added,
         * then this must refer to the same object.
         */
        removeListener : Evm.un = function(element, eventName, fn, scope){
            var el = Ext.getDom(element);
            el && Ext.get(el);
            var elCache = el ? resolveCache(el) : {},
                f = el && ((elCache[el.id]||{events:{}}).events)[eventName] || [],
                wrap, i, l, k, wf, len, fnc;

            for (i = 0, len = f.length; i < len; i++) {
                /* 0 = Original Function,
                   1 = Event Manager Wrapped Function,
                   2 = Scope,
                   3 = Adapter Wrapped Function,
                   4 = Buffered Task
                */
                if (Ext.isArray(fnc = f[i]) && fnc[0] == fn && (!scope || fnc[2] == scope)) {
                    fnc[4] && fnc[4].cancel();
                    k = fn.tasks && fn.tasks.length;
                    if(k) {
                        while(k--) {
                            fn.tasks[k].cancel();
                        }
                        delete fn.tasks;
                    }
                    wrap = fnc[1];
                    
                    E.un(el, eventName, E.extAdapter ? fnc[3] : wrap);
                    
                    // jQuery workaround that should be removed from Ext Core
                    if(eventName == "mousewheel" && el.addEventListener && wrap){
                        el.removeEventListener("DOMMouseScroll", wrap, false);
                    }
        
                    if(eventName == "mousedown" && el == DOC && wrap){ // fix stopped mousedowns on the document
                        Ext.EventManager.stoppedMouseDownEvent.removeListener(wrap);
                    }
                    
                    f.splice(i,1);
                    if (f.length === 0) {
                        delete elCache[el.id].events[eventName];
                    }
                    
                    for (k in elCache[el.id].events) {
                        return false;
                    }
                    elCache[el.id].events = {};
                    return false;
                }
            }

            
        },

        /**
         * Removes all event handers from an element.  Typically you will use {@link Ext.Element#removeAllListeners}
         * directly on an Element in favor of calling this version.
         * @param {String/HTMLElement} el The id or html element from which to remove all event handlers.
         */
        removeAll : function(el){
            if (!(el = Ext.getDom(el))) {
                return;
            }
            var id = el.id,
                elCache = resolveCache(el)||{},
                es = elCache[id] || {},
                ev = es.events || {},
                f, i, len, ename, fn, k, wrap;

            for(ename in ev){
                if(ev.hasOwnProperty(ename)){
                    f = ev[ename];
                    /* 0 = Original Function,
                       1 = Event Manager Wrapped Function,
                       2 = Scope,
                       3 = Adapter Wrapped Function,
                       4 = Buffered Task
                    */
                    for (i = 0, len = f.length; i < len; i++) {
                        fn = f[i];
                        fn[4] && fn[4].cancel();
                        if(fn[0].tasks && (k = fn[0].tasks.length)) {
                            while(k--) {
                                fn[0].tasks[k].cancel();
                            }
                            delete fn.tasks;
                        }
                        
                        wrap =  fn[1];
                        E.un(el, ename, E.extAdapter ? fn[3] : wrap);

                        // jQuery workaround that should be removed from Ext Core
                        if(el.addEventListener && wrap && ename == "mousewheel"){
                            el.removeEventListener("DOMMouseScroll", wrap, false);
                        }

                        // fix stopped mousedowns on the document
                        if(wrap && el == DOC &&  ename == "mousedown"){
                            Ext.EventManager.stoppedMouseDownEvent.removeListener(wrap);
                        }
                    }
                }
            }
            elCache[id] && (elCache[id].events = {});
        },

        getListeners : function(el, eventName) {
            el = Ext.getDom(el);
            if (!el) {
                return;
            }
            var id = (Ext.get(el)||{}).id,
                elCache = resolveCache(el),
                es = ( elCache[id] || {} ).events || {};

            return es[eventName] || null;
        },

        purgeElement : function(el, recurse, eventName) {
            el = Ext.getDom(el);
            var id = el.id,
                elCache = resolveCache(el),
                es = (elCache[id] || {}).events || {},
                i, f, len;
            if (eventName) {
                if (es.hasOwnProperty(eventName)) {
                    f = es[eventName];
                    for (i = 0, len = f.length; i < len; i++) {
                        Evm.removeListener(el, eventName, f[i][0]);
                    }
                }
            } else {
                Evm.removeAll(el);
            }
            if (recurse && el && el.childNodes) {
                for (i = 0, len = el.childNodes.length; i < len; i++) {
                    Evm.purgeElement(el.childNodes[i], recurse, eventName);
                }
            }
        }
    });
    
    // deprecated, call from EventManager
    E.getListeners = function(el, eventName) {
       return Ext.EventManager.getListeners(el, eventName);
    };

    /** @sourceURL=<multidom.js> */
    Ext.provide && Ext.provide('multidom');
 })();/* global Ext */
/*
 * Copyright 2007-2010, Active Group, Inc.  All rights reserved.
 * ******************************************************************************
 * This file is distributed on an AS IS BASIS WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * ***********************************************************************************
 * @version 2.11
 * [For Ext 3.1.1 or higher only]
 *
 * License: ux.ManagedIFrame, ux.ManagedIFrame.Panel, ux.ManagedIFrame.Portlet, ux.ManagedIFrame.Window  
 * are licensed under the terms of the Open Source GPL 3.0 license:
 * http://www.gnu.org/licenses/gpl.html
 *
 * Commercial use is prohibited without a Commercial Developement License. See
 * http://licensing.theactivegroup.com.
 *
 * Donations are welcomed: http://donate.theactivegroup.com
 *
 */
 
(function(){
    
    var El = Ext.Element, 
        ElFrame, 
        ELD = Ext.lib.Dom,
        EMPTYFN = function(){},
        OP = Object.prototype,
        addListener = function () {
            var handler;
            if (window.addEventListener) {
                handler = function F(el, eventName, fn, capture) {
                    el.addEventListener(eventName, fn, !!capture);
                };
            } else if (window.attachEvent) {
                handler = function F(el, eventName, fn, capture) {
                    el.attachEvent("on" + eventName, fn);
                };
            } else {
                handler = function F(){};
            }
            var F = null; //Gbg collect
            return handler;
        }(),
       removeListener = function() {
            var handler;
            if (window.removeEventListener) {
                handler = function F(el, eventName, fn, capture) {
                    el.removeEventListener(eventName, fn, (capture));
                };
            } else if (window.detachEvent) {
                handler = function F(el, eventName, fn) {
                    el.detachEvent("on" + eventName, fn);
                };
            } else {
                handler = function F(){};
            }
            var F = null; //Gbg collect
            return handler;
        }();
 
  //assert multidom support: REQUIRED for Ext 3 or higher!
  if(typeof ELD.getDocument != 'function'){
     alert("MIF 2.1.1 requires multidom support" );
  }
  //assert Ext 3.1.1+ 
  if(!Ext.elCache || parseInt( Ext.version.replace(/\./g,''),10) < 311 ) {
    alert ('Ext Release '+Ext.version+' is not supported');
   }
  
  Ext.ns('Ext.ux.ManagedIFrame', 'Ext.ux.plugin');
  
  var MIM, MIF = Ext.ux.ManagedIFrame, MIFC;
  var frameEvents = ['documentloaded',
                     'domready',
                     'focus',
                     'blur',
                     'resize',
                     'scroll',
                     'unload',
                     'scroll',
                     'exception', 
                     'message',
                     'reset'];
                     
    var reSynthEvents = new RegExp('^('+frameEvents.join('|')+ ')', 'i');

    /**
     * @class Ext.ux.ManagedIFrame.Element
     * @extends Ext.Element
     * @version 2.1.1 
     * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a> 
     * @author Doug Hendricks. Forum ID: <a href="http://extjs.com/forum/member.php?u=8730">hendricd</a> 
     * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
     * @copyright 2007-2010, Active Group, Inc. All rights reserved.
     * @constructor Create a new Ext.ux.ManagedIFrame.Element directly. 
     * @param {String/HTMLElement} element
     * @param {Boolean} forceNew (optional) By default the constructor checks to see if there is already an instance of this element in the cache and if there is it returns the same instance. This will skip that check (useful for extending this class).
     * @param {DocumentElement} (optional) Document context uses to resolve an Element search by its id.
     */
     
    Ext.ux.ManagedIFrame.Element = Ext.extend(Ext.Element, {
                         
            constructor : function(element, forceNew, doc ){
                var d = doc || document;
                var elCache  = ELD.resolveDocumentCache(d);
                var dom = Ext.getDom(element, false, d);
                if(!dom || !(/^(iframe|frame)/i).test(dom.tagName)) { // invalid id/element
                    return null;
                }
                var id = Ext.id(dom);
                
                /**
                 * The DOM element
                 * @type HTMLElement
                 */
                this.dom = dom;
                
                /**
                 * The DOM element ID
                 * @type String
                 */
                this.id = id ;
                
                (elCache[id] || 
                   (elCache[id] = {
                     el: this,
                     events : {},
                     data : {}
                    })
                ).el = this;
                
                this.dom.name || (this.dom.name = this.id);
                 
                if(Ext.isIE){
                     document.frames && (document.frames[this.dom.name] || (document.frames[this.dom.name] = this.dom));
                 }
                 
                this.dom.ownerCt = this;
                MIM.register(this);

                if(!this._observable){
	                    (this._observable = new Ext.util.Observable()).addEvents(
	                    
	                    /**
	                     * Fires when the iFrame has reached a loaded/complete state.
	                     * @event documentloaded
	                     * @param {Ext.ux.MIF.Element} this
	                     */
	                    'documentloaded',
	                    
	                    /**
	                     * Fires ONLY when an iFrame's Document(DOM) has reach a
	                     * state where the DOM may be manipulated ('same origin' policy)
	                     * Note: This event is only available when overwriting the iframe
	                     * document using the update or load methods and "same-origin"
	                     * documents. Returning false from the eventHandler stops further event
	                     * (documentloaded) processing.
	                     * @event domready 
	                     * @param {Ext.ux.MIF.Element} this
	                     */
	
	                    'domready',
	                    
	                    /**
	                     * Fires when the frame actions raise an error
	                     * @event exception
	                     * @param {Ext.ux.MIF.Element} this.iframe
	                     * @param {Error/string} exception
	                     */
	                     'exception',
	                     
	                    /**
	                     * Fires when the frame's window is resized.  This event, when raised from a "same-origin" frame,
	                     * will send current height/width reports with the event.
	                     * @event resize
	                     * @param {Ext.ux.MIF.Element} this.iframe
	                     * @param {Object} documentSize A height/width object signifying the new document size
	                     * @param {Object} viewPortSize A height/width object signifying the size of the frame's viewport
	                     * @param {Object} viewSize A height/width object signifying the size of the frame's view
	                     */
	                     'resize',
	                     
	                    /**
	                     * Fires upon receipt of a message generated by window.sendMessage
	                     * method of the embedded Iframe.window object
	                     * @event message
	                     * @param {Ext.ux.MIF} this.iframe
	                     * @param {object}
	                     *            message (members: type: {string} literal "message", data
	                     *            {Mixed} [the message payload], domain [the document domain
	                     *            from which the message originated ], uri {string} the
	                     *            document URI of the message sender source (Object) the
	                     *            window context of the message sender tag {string} optional
	                     *            reference tag sent by the message sender
	                     * <p>Alternate event handler syntax for message:tag filtering Fires upon
	                     * receipt of a message generated by window.sendMessage method which
	                     * includes a specific tag value of the embedded Iframe.window object
	                     */
	                    'message',
	
	                    /**
	                     * Fires when the frame is blurred (loses focus).
	                     * @event blur
	                     * @param {Ext.ux.MIF} this
	                     * @param {Ext.Event}
	                     *            Note: This event is only available when overwriting the
	                     *            iframe document using the update method and to pages
	                     *            retrieved from a "same domain". Returning false from the
	                     *            eventHandler [MAY] NOT cancel the event, as this event is
	                     *            NOT ALWAYS cancellable in all browsers.
	                     */
	                     'blur',
	
	                    /**
	                     * Fires when the frame gets focus. Note: This event is only available
	                     * when overwriting the iframe document using the update method and to
	                     * pages retrieved from a "same domain". Returning false from the
	                     * eventHandler [MAY] NOT cancel the event, as this event is NOT ALWAYS
	                     * cancellable in all browsers.
	                     * @event focus
	                     * @param {Ext.ux.MIF.Element} this
	                     * @param {Ext.Event}
	                     *
	                    */
	                    'focus',
	
	                    /**
	                     * Note: This event is only available when overwriting the iframe
	                     * document using the update method and to pages retrieved from a "same-origin"
	                     * domain. Note: Opera does not raise this event.
	                     * @event unload * Fires when(if) the frames window object raises the unload event
	                     * @param {Ext.ux.MIF.Element} this.
	                     * @param {Ext.Event}
	                     */
	                     'unload',
	                     
	                     /**
	                     * Note: This event is only available when overwriting the iframe
	                     * document using the update method and to pages retrieved from a "same-origin"
	                     * domain.  To prevent numerous scroll events from being raised use the buffer listener 
	                     * option to limit the number of times the event is raised.
	                     * @event scroll 
	                     * @param {Ext.ux.MIF.Element} this.
	                     * @param {Ext.Event}
	                     */
	                     'scroll',
	                     
	                    /**
	                     * Fires when the iFrame has been reset to a neutral domain state (blank document).
	                     * @event reset
	                     * @param {Ext.ux.MIF.Element} this
	                     */
	                    'reset'
	                 );
	                    //  Private internal document state events.
	                 this._observable.addEvents('_docready','_docload');
                 } 
                 var H = Ext.isIE?'onreadystatechange':'onload';
                 // Hook the Iframes loaded and error state handlers
                 this.dom[H] = this.loadHandler.createDelegate(this);
                 this.dom['onerror'] = this.loadHandler.createDelegate(this);
                
            },

            /** @private
             * Removes the MIFElement interface from the FRAME Element.
             * It does NOT remove the managed FRAME from the DOM.  Use the {@link Ext.#ux.ManagedIFrame.Element-remove} method to perfom both functions.
             */
            destructor   :  function () {
                this.dom[Ext.isIE?'onreadystatechange':'onload'] = this.dom['onerror'] = EMPTYFN;
                MIM.deRegister(this);
                this.removeAllListeners();
                Ext.destroy(this.frameShim, this.DDM);
                this.hideMask(true);
                delete this.loadMask;
                this.reset(); 
                this.manager = null;
                this.dom.ownerCt = null;
            },
            
            /**
             * Deep cleansing childNode Removal
             * @param {Boolean} forceReclean (optional) By default the element
             * keeps track if it has been cleansed already so
             * you can call this over and over. However, if you update the element and
             * need to force a reclean, you can pass true.
             * @param {Boolean} deep (optional) Perform a deep cleanse of all childNodes as well.
             */
            cleanse : function(forceReclean, deep){
                if(this.isCleansed && forceReclean !== true){
                    return this;
                }
                var d = this.dom, n = d.firstChild, nx;
                while(d && n){
                     nx = n.nextSibling;
                     deep && Ext.fly(n).cleanse(forceReclean, deep);
                     Ext.removeNode(n);
                     n = nx;
                }
                this.isCleansed = true;
                return this;
            },

            /** (read-only) The last known URI set programmatically by the Component
             * @property  
             * @type {String|Function}
             */
            src     : null,

            /** (read-only) For "same-origin" frames only.  Provides a reference to
             * the Ext.util.CSS singleton to manipulate the style sheets of the frame's
             * embedded document.
             *
             * @property
             * @type Ext.util.CSS
             */
            CSS     : null,

            /** Provides a reference to the managing Ext.ux.MIF.Manager instance.
             *
             * @property
             * @type Ext.ux.MIF.Manager
             */
            manager : null,

            /**
              * Enables/disables internal cross-frame messaging interface
              * @cfg {Boolean} disableMessaging False to enable cross-frame messaging API
              * Default = true
              *
              */
            disableMessaging  :  true,

             /**
              * Maximum number of domready event detection retries for IE.  IE does not provide
              * a native DOM event to signal when the frames DOM may be manipulated, so a polling process
              * is used to determine when the documents BODY is available. <p> Certain documents may not contain
              * a BODY tag:  eg. MHT(rfc/822), XML, or other non-HTML content. Detection polling will stop after this number of 2ms retries 
              * or when the documentloaded event is raised.</p>
              * @cfg {Integer} domReadyRetries 
              * @default 7500 (* 2 = 15 seconds) 
              */
            domReadyRetries   :  7500,
            
            /**
             * True to set focus on the frame Window as soon as its document
             * reports loaded.  <p>(Many external sites use IE's document.createRange to create 
             * DOM elements, but to be successful, IE requires that the FRAME have focus before
             * such methods are called)</p>
             * @cfg focusOnLoad
             * @default true if IE
             */
            focusOnLoad   : Ext.isIE,
            
            /**
              * Enables/disables internal cross-frame messaging interface
              * @cfg {Boolean} disableMessaging False to enable cross-frame messaging API
              * Default = true
              *
              */
            eventsFollowFrameLinks   : true,

            /** @private */
            _domCache      : null,

            /**
             * Removes the FRAME from the DOM and deletes it from the cache
             */
            remove  : function(){
                this.destructor.apply(this, arguments);
                ElFrame.superclass.remove.apply(this,arguments);
            },
            
            /**
             * Return the ownerDocument property of the IFRAME Element.
             * (Note: This is not the document context of the FRAME's loaded document. 
             * See the getFrameDocument method for that.)
             */
            getDocument :  
                function(){ return this.dom ? this.dom.ownerDocument : document;},
            
            /**
	         * Loads the frame Element with the response from a form submit to the 
	         * specified URL with the ManagedIframe.Element as it's submit target.
	         *
	         * @param {Object} submitCfg A config object containing any of the following options:
	         * <pre><code>
	         *      myIframe.submitAsTarget({
	         *         form : formPanel.form,  //optional Ext.FormPanel, Ext form element, or HTMLFormElement
	         *         url: &quot;your-url.php&quot;,
             *         action : (see url) ,
	         *         params: {param1: &quot;foo&quot;, param2: &quot;bar&quot;}, // or URL encoded string or function that returns either
	         *         callback: yourFunction,  //optional, called with the signature (frame)
	         *         scope: yourObject, // optional scope for the callback
	         *         method: 'POST', //optional form.method 
             *         encoding : "multipart/form-data" //optional, default = HTMLForm default  
	         *      });
	         *
	         * </code></pre>
             * @return {Ext.ux.ManagedIFrame.Element} this
	         *
	         */
            submitAsTarget : function(submitCfg){
                var opt = submitCfg || {}, 
                D = this.getDocument(),
  	            form = Ext.getDom(
                       opt.form ? opt.form.form || opt.form: null, false, D) || 
                  Ext.DomHelper.append(D.body, { 
                    tag: 'form', 
                    cls : 'x-hidden x-mif-form',
                    encoding : 'multipart/form-data'
                  }),
                formFly = Ext.fly(form, '_dynaForm'),
                formState = {
                    target: form.target || '',
                    method: form.method || '',
                    encoding: form.encoding || '',
                    enctype: form.enctype || '',
                    action: form.action || '' 
                 },
                encoding = opt.encoding || form.encoding,
                method = opt.method || form.method || 'POST';
        
                formFly.set({
                   target  : this.dom.name,
                   method  : method,
                   encoding: encoding,
                   action  : opt.url || opt.action || form.action
                });
                
                if(method == 'POST' || !!opt.enctype){
                    formFly.set({enctype : opt.enctype || form.enctype || encoding});
                }
                
		        var hiddens, hd, ps;
                // add any additional dynamic params
		        if(opt.params && (ps = Ext.isFunction(opt.params) ? opt.params() : opt.params)){ 
		            hiddens = [];
                     
		            Ext.iterate(ps = typeof ps == 'string'? Ext.urlDecode(ps, false): ps, 
                        function(n, v){
		                    Ext.fly(hd = D.createElement('input')).set({
		                     type : 'hidden',
		                     name : n,
		                     value: v
                            });
		                    form.appendChild(hd);
		                    hiddens.push(hd);
		                });
		        }
		
		        opt.callback && 
                    this._observable.addListener('_docready',opt.callback, opt.scope,{single:true});
                     
                this._frameAction = true;
                this._targetURI = location.href;
		        this.showMask();
		        
		        //slight delay for masking
		        (function(){
                    
		            form.submit();
                    // remove dynamic inputs
		            hiddens && Ext.each(hiddens, Ext.removeNode, Ext);

                    //Remove if dynamically generated, restore state otherwise
		            if(formFly.hasClass('x-mif-form')){
                        formFly.remove();
                    }else{
                        formFly.set(formState);
                    }
                    delete El._flyweights['_dynaForm'];
                    formFly = null;
		            this.hideMask(true);
		        }).defer(100, this);
                
                return this;
		    },

            /**
             * @cfg {String} resetUrl Frame document reset string for use with the {@link #Ext.ux.ManagedIFrame.Element-reset} method.
             * Defaults:<p> For IE on SSL domains - the current value of Ext.SSL_SECURE_URL<p> "about:blank" for all others.
             */
            resetUrl : (function(){
                return Ext.isIE && Ext.isSecure ? Ext.SSL_SECURE_URL : 'about:blank';
            })(),

            /**
             * Sets the embedded Iframe src property. Note: invoke the function with
             * no arguments to refresh the iframe based on the current src value.
             *
             * @param {String/Function} url (Optional) A string or reference to a Function that
             *            returns a URI string when called
             * @param {Boolean} discardUrl (Optional) If not passed as <tt>false</tt>
             *            the URL of this action becomes the default SRC attribute
             *            for this iframe, and will be subsequently used in future
             *            setSrc calls (emulates autoRefresh by calling setSrc
             *            without params).
             * @param {Function} callback (Optional) A callback function invoked when the
             *            frame document has been fully loaded.
             * @param {Object} scope (Optional) scope by which the callback function is
             *            invoked.
             */
            setSrc : function(url, discardUrl, callback, scope) {
                var src = url || this.src || this.resetUrl;
                
                var O = this._observable;
                this._unHook();
                Ext.isFunction(callback) && O.addListener('_docload', callback, scope||this, {single:true});
                this.showMask();
                (discardUrl !== true) && (this.src = src);
                var s = this._targetURI = (Ext.isFunction(src) ? src() || '' : src);
                try {
                    this._frameAction = true; // signal listening now
                    this.dom.src = s;
                    this.checkDOM();
                } catch (ex) {
                    O.fireEvent.call(O, 'exception', this, ex);
                }
                return this;
            },

            /**
             * Sets the embedded Iframe location using its replace method (precluding a history update). 
             * Note: invoke the function with no arguments to refresh the iframe based on the current src value.
             *
             * @param {String/Function} url (Optional) A string or reference to a Function that
             *            returns a URI string when called
             * @param {Boolean} discardUrl (Optional) If not passed as <tt>false</tt>
             *            the URL of this action becomes the default SRC attribute
             *            for this iframe, and will be subsequently used in future
             *            setSrc calls (emulates autoRefresh by calling setSrc
             *            without params).
             * @param {Function} callback (Optional) A callback function invoked when the
             *            frame document has been fully loaded.
             * @param {Object} scope (Optional) scope by which the callback function is
             *            invoked.
             *
             */
            setLocation : function(url, discardUrl, callback, scope) {

                var src = url || this.src || this.resetUrl;
                var O = this._observable;
                this._unHook();
                Ext.isFunction(callback) && O.addListener('_docload', callback, scope||this, {single:true});
                this.showMask();
                var s = this._targetURI = (Ext.isFunction(src) ? src() || '' : src);
                if (discardUrl !== true) {
                    this.src = src;
                }
                try {
                    this._frameAction = true; // signal listening now
                    this.getWindow().location.replace(s);
                    this.checkDOM();
                } catch (ex) {
                    O.fireEvent.call(O,'exception', this, ex);
                }
                return this;
            },

            /**
             * Resets the frame to a neutral (blank document) state without
             * loadMasking.
             *
             * @param {String}
             *            src (Optional) A specific reset string (eg. 'about:blank')
             *            to use for resetting the frame.
             * @param {Function}
             *            callback (Optional) A callback function invoked when the
             *            frame reset is complete.
             * @param {Object}
             *            scope (Optional) scope by which the callback function is
             *            invoked.
             */
            reset : function(src, callback, scope) {
                
                this._unHook();
                var loadMaskOff = false,
                    s = src, 
                    win = this.getWindow(),
                    O = this._observable;
                    
                if(this.loadMask){
                    loadMaskOff = this.loadMask.disabled;
                    this.loadMask.disabled = false;
                 }
                this.hideMask(true);
                
                if(win){
                    this.isReset= true;
                    var cb = callback;
	                O.addListener('_docload',
	                  function(frame) {
	                    if(this.loadMask){
	                        this.loadMask.disabled = loadMaskOff;
	                    };
	                    Ext.isFunction(cb) &&  (cb = cb.apply(scope || this, arguments));
                        O.fireEvent("reset", this);
	                }, this, {single:true});
	            
                    Ext.isFunction(s) && ( s = src());
                    s = this._targetURI = Ext.isEmpty(s, true)? this.resetUrl: s;
                    win.location ? (win.location.href = s) : O.fireEvent('_docload', this);
                }
                
                return this;
            },

           /**
            * @private
            * Regular Expression filter pattern for script tag removal.
            * @cfg {regexp} scriptRE script removal RegeXp
            * Default: "/(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/gi"
            */
            scriptRE : /(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/gi,

            /**
             * Write(replacing) string content into the IFrames document structure
             * @param {String} content The new content
             * @param {Boolean} loadScripts
             * (optional) true to also render and process embedded scripts
             * @param {Function} callback (Optional) A callback function invoked when the
             * frame document has been written and fully loaded. @param {Object}
             * scope (Optional) scope by which the callback function is invoked.
             */
            update : function(content, loadScripts, callback, scope) {
                loadScripts = loadScripts || this.getUpdater().loadScripts || false;
                content = Ext.DomHelper.markup(content || '');
                content = loadScripts === true ? content : content.replace(this.scriptRE, "");
                var doc;
                if ((doc = this.getFrameDocument()) && !!content.length) {
                    this._unHook();
                    this.src = null;
                    this.showMask();
                    Ext.isFunction(callback) &&
                        this._observable.addListener('_docload', callback, scope||this, {single:true});
                    this._targetURI = location.href;
                    doc.open();
                    this._frameAction = true;
                    doc.write(content);
                    doc.close();
                    this.checkDOM();

                } else {
                    this.hideMask(true);
                    Ext.isFunction(callback) && callback.call(scope, this);
                }
                
                return this;
            },
            
            /**
             * Executes a Midas command on the current document, current selection, or the given range.
             * @param {String} command The command string to execute in the frame's document context.
             * @param {Booloean} userInterface (optional) True to enable user interface (if supported by the command)
             * @param {Mixed} value (optional)
             * @param {Boolean} validate If true, the command is validated to ensure it's invocation is permitted.
             * @return {Boolean} indication whether command execution succeeded
             */
            execCommand : function(command, userInterface, value, validate){
               var doc, assert;
               if ((doc = this.getFrameDocument()) && !!command) {
                  try{
                      Ext.isIE && this.getWindow().focus();
	                  assert = validate && Ext.isFunction(doc.queryCommandEnabled) ? 
	                    doc.queryCommandEnabled(command) : true;
                  
                      return assert && doc.execCommand(command, !!userInterface, value);
                  }catch(eex){return false;}
               }
               return false;
                
            },

            /**
             * Sets the current DesignMode attribute of the Frame's document
             * @param {Boolean/String} active True (or "on"), to enable designMode
             * 
             */
            setDesignMode : function(active){
               var doc;
               (doc = this.getFrameDocument()) && 
                 (doc.designMode = (/on|true/i).test(String(active))?'on':'off');
            },
            
            /**
            * Gets this element's Updater
            * 
            * @return {Ext.ux.ManagedIFrame.Updater} The Updater
            */
            getUpdater : function(){
               return this.updateManager || 
                    (this.updateManager = new MIF.Updater(this));
                
            },

            /**
             * Method to retrieve frame's history object.
             * @return {object} or null if permission was denied
             */
            getHistory  : function(){
                var h=null;
                try{ h=this.getWindow().history; }catch(eh){}
                return h;
            },
            
            /**
             * Method to retrieve embedded frame Element objects. Uses simple
             * caching (per frame) to consistently return the same object.
             * Automatically fixes if an object was recreated with the same id via
             * AJAX or DOM.
             *
             * @param {Mixed}
             *            el The id of the node, a DOM Node or an existing Element.
             * @return {Element} The Element object (or null if no matching element
             *         was found)
             */
            get : function(el) {
                var doc = this.getFrameDocument();
                return doc? Ext.get(el, doc) : doc=null;
            },

            /**
             * Gets the globally shared flyweight Element for the frame, with the
             * passed node as the active element. Do not store a reference to this
             * element - the dom node can be overwritten by other code.
             *
             * @param {String/HTMLElement}
             *            el The dom node or id
             * @param {String}
             *            named (optional) Allows for creation of named reusable
             *            flyweights to prevent conflicts (e.g. internally Ext uses
             *            "_internal")
             * @return {Element} The shared Element object (or null if no matching
             *         element was found)
             */
            fly : function(el, named) {
                var doc = this.getFrameDocument();
                return doc ? Ext.fly(el,named, doc) : null;
            },

            /**
             * Return the dom node for the passed string (id), dom node, or
             * Ext.Element relative to the embedded frame document context.
             *
             * @param {Mixed} el
             * @return HTMLElement
             */
            getDom : function(el) {
                var d;
                if (!el || !(d = this.getFrameDocument())) {
                    return (d=null);
                }
                return Ext.getDom(el, d);
            },
            
            /**
             * Creates a {@link Ext.CompositeElement} for child nodes based on the
             * passed CSS selector (the selector should not contain an id).
             *
             * @param {String} selector The CSS selector
             * @param {Boolean} unique (optional) True to create a unique Ext.Element for
             *            each child (defaults to false, which creates a single
             *            shared flyweight object)
             * @return {Ext.CompositeElement/Ext.CompositeElementLite} The composite element
             */
            select : function(selector, unique) {
                var d; return (d = this.getFrameDocument()) ? Ext.Element.select(selector,unique, d) : d=null;
            },

            /**
             * Selects frame document child nodes based on the passed CSS selector
             * (the selector should not contain an id).
             *
             * @param {String} selector The CSS selector
             * @return {Array} An array of the matched nodes
             */
            query : function(selector) {
                var d; return (d = this.getFrameDocument()) ? Ext.DomQuery.select(selector, d): null;
            },
            
            /**
             * Removes a DOM Element from the embedded document
             * @param {Element/String} node The node id or node Element to remove
             */
            removeNode : Ext.removeNode,
            
            /**
             * @private execScript sandbox and messaging interface
             */ 
            _renderHook : function() {
                this._windowContext = null;
                this.CSS = this.CSS ? this.CSS.destroy() : null;
                this._hooked = false;
                try {
                    if (this.writeScript('(function(){(window.hostMIF = parent.document.getElementById("'
                                    + this.id
                                    + '").ownerCt)._windowContext='
                                    + (Ext.isIE
                                            ? 'window'
                                            : '{eval:function(s){return new Function("return ("+s+")")();}}')
                                    + ';})()')) {
                        var w, p = this._frameProxy, D = this.getFrameDocument();
                        if(w = this.getWindow()){
                            p || (p = this._frameProxy = this._eventProxy.createDelegate(this));    
                            addListener(w, 'focus', p);
                            addListener(w, 'blur', p);
                            addListener(w, 'resize', p);
                            addListener(w, 'unload', p);
                            D && addListener(Ext.isIE ? w : D, 'scroll', p);
                        }
                        
                        D && (this.CSS = new Ext.ux.ManagedIFrame.CSS(D));
                       
                    }
                } catch (ex) {}
                return this.domWritable();
            },
            
             /** @private : clear all event listeners and Element cache */
            _unHook : function() {
                if (this._hooked) {
                    var id, el, c = this._domCache;
                    if(c){
                      for ( id in c ) {
                        el = c[id].el;
                        el && el.removeAllListeners && el.removeAllListeners();
                        el && (c[id].el = el = null);
                        delete c[id].data;
                        delete c[id];
                      }
                    }
                    
                    this._windowContext && (this._windowContext.hostMIF = null);
                    this._windowContext = null;
                
                    var w, p = this._frameProxy;
                    if(p && this.domWritable() && (w = this.getWindow())){
                        removeListener(w, 'focus', p);
                        removeListener(w, 'blur', p);
                        removeListener(w, 'resize', p);
                        removeListener(w, 'unload', p);
                        removeListener(Ext.isIE ? w : this.getFrameDocument(), 'scroll', p);
                    }
                }
                MIM._flyweights = {};
                this._domCache = null;
                ELD.clearDocumentCache && ELD.clearDocumentCache(this.id);
                this.CSS = this.CSS ? this.CSS.destroy() : null;
                this.domFired = this._frameAction = this.domReady = this._hooked = false;
            },
            
            /** @private */
            _windowContext : null,

            /**
             * If sufficient privilege exists, returns the frame's current document
             * as an HTMLElement.
             *
             * @return {HTMLElement} The frame document or false if access to document object was denied.
             */
            getFrameDocument : function() {
                var win = this.getWindow(), doc = null;
                try {
                    doc = (Ext.isIE && win ? win.document : null)
                            || this.dom.contentDocument
                            || window.frames[this.dom.name].document || null;
                } catch (gdEx) {
                    this._domCache = null;
                    
                    ELD.clearDocumentCache && ELD.clearDocumentCache(this.id);
                    return false; // signifies probable access restriction
                }
                doc = (doc && Ext.isFunction(ELD.getDocument)) ? ELD.getDocument(doc,true) : doc;
                
                if(doc){
                  this._domCache || (this._domCache = ELD.resolveDocumentCache(doc, this.id));
                }
                
                return doc;
            },

            /**
             * Returns the frame's current HTML document object as an
             * {@link Ext.Element}.
             * @return {Ext.Element} The document
             */
            getDoc : function() {
                var D = this.getFrameDocument();
                return Ext.get(D,D); 
            },
            
            /**
             * If sufficient privilege exists, returns the frame's current document
             * body as an HTMLElement.
             *
             * @return {HTMLElement} The frame document body or Null if access to
             *         document object was denied.
             */
            getBody : function() {
                var d;
                return (d = this.getFrameDocument()) ? this.get(d.body || d.documentElement) : null;
            },

            /**
             * Attempt to retrieve the frames current URI via frame's document object
             * @return {string} The frame document's current URI or the last know URI if permission was denied.
             */
            getDocumentURI : function() {
                var URI, d;
                try {
                    URI = this.src && (d = this.getFrameDocument()) ? d.location.href: null;
                } catch (ex) { // will fail on NON-same-origin domains
                }
                return URI || (Ext.isFunction(this.src) ? this.src() : this.src);
                // fallback to last known
            },

           /**
            * Attempt to retrieve the frames current URI via frame's Window object
            * @return {string} The frame document's current URI or the last know URI if permission was denied.
            */
            getWindowURI : function() {
                var URI, w;
                try {
                    URI = (w = this.getWindow()) ? w.location.href : null;
                } catch (ex) {
                } // will fail on NON-same-origin domains
                return URI || (Ext.isFunction(this.src) ? this.src() : this.src);
                // fallback to last known
            },

            /**
             * Returns the frame's current window object.
             *
             * @return {Window} The frame Window object.
             */
            getWindow : function() {
                var dom = this.dom, win = null;
                try {
                    win = dom.contentWindow || window.frames[dom.name] || null;
                } catch (gwEx) {}
                return win;
            },
            
            /**
             * Scrolls a frame document's child element into view within the passed container.
             * @param {String} child The id of the element to scroll into view. 
             * @param {Mixed} container (optional) The container element to scroll (defaults to the frame's document.body).  Should be a 
             * string (id), dom node, or Ext.Element.
             * @param {Boolean} hscroll (optional) False to disable horizontal scroll (defaults to true)
             * @return {Ext.ux.ManagedIFrame.Element} this 
             */ 
            scrollChildIntoView : function(child, container, hscroll){
                this.fly(child, '_scrollChildIntoView').scrollIntoView(this.getDom(container) || this.getBody().dom, hscroll);
                return this;
            },

            /**
             * Print the contents of the Iframes (if we own the document)
             * @return {Ext.ux.ManagedIFrame.Element} this 
             */
            print : function() {
                try {
                    var win;
                    if( win = this.getWindow()){
                        Ext.isIE && win.focus();
                        win.print();
                    }
                } catch (ex) {
                    throw new MIF.Error('printexception' , ex.description || ex.message || ex);
                }
                return this;
            },

            /**
             * Returns the general DOM modification capability (same-origin status) of the frame. 
             * @return {Boolean} accessible If True, the frame's inner DOM can be manipulated, queried, and
             * Event Listeners set.
             */
            domWritable : function() {
                return !!Ext.isDocument(this.getFrameDocument(),true) //test access
                    && !!this._windowContext;
            },

            /**
             * eval a javascript code block(string) within the context of the
             * Iframes' window object.
             * @param {String} block A valid ('eval'able) script source block.
             * @param {Boolean} useDOM  if true, inserts the function
             * into a dynamic script tag, false does a simple eval on the function
             * definition. (useful for debugging) <p> Note: will only work after a
             * successful iframe.(Updater) update or after same-domain document has
             * been hooked, otherwise an exception is raised.
             * @return {Mixed}  
             */
            execScript : function(block, useDOM) {
                try {
                    if (this.domWritable()) {
                        if (useDOM) {
                            this.writeScript(block);
                        } else {
                            return this._windowContext.eval(block);
                        }
                    } else {
                        throw new MIF.Error('execscript-secure-context');
                    }
                } catch (ex) {
                    this._observable.fireEvent.call(this._observable,'exception', this, ex);
                    return false;
                }
                return true;
            },

            /**
             * Write a script block into the iframe's document
             * @param {String} block A valid (executable) script source block.
             * @param {object} attributes Additional Script tag attributes to apply to the script
             * Element (for other language specs [vbscript, Javascript] etc.) <p>
             * Note: writeScript will only work after a successful iframe.(Updater)
             * update or after same-domain document has been hooked, otherwise an
             * exception is raised.
             */
            writeScript : function(block, attributes) {
                attributes = Ext.apply({}, attributes || {}, {
                            type : "text/javascript",
                            text : block
                        });
                try {
                    var head, script, doc = this.getFrameDocument();
                    if (doc && typeof doc.getElementsByTagName != 'undefined') {
                        if (!(head = doc.getElementsByTagName("head")[0])) {
                            // some browsers (Webkit, Safari) do not auto-create
                            // head elements during document.write
                            head = doc.createElement("head");
                            doc.getElementsByTagName("html")[0].appendChild(head);
                        }
                        if (head && (script = doc.createElement("script"))) {
                            for (var attrib in attributes) {
                                if (attributes.hasOwnProperty(attrib)
                                        && attrib in script) {
                                    script[attrib] = attributes[attrib];
                                }
                            }
                            return !!head.appendChild(script);
                        }
                    }
                } catch (ex) {
                    this._observable.fireEvent.call(this._observable, 'exception', this, ex);

                }finally{
                    script = head = null;
                }
                return false;
            },

            /**
             * Eval a function definition into the iframe window context.
             * @param {String/Object} fn Name of the function or function map
             * object: {name:'encodeHTML',fn:Ext.util.Format.htmlEncode}
             * @param {Boolean} useDOM  if true, inserts the fn into a dynamic script tag,
             * false does a simple eval on the function definition
             * @param {Boolean} invokeIt if true, the function specified is also executed in the
             * Window context of the frame. Function arguments are not supported.
             * @example <pre><code> var trim = function(s){ return s.replace(/^\s+|\s+$/g,''); }; 
             * iframe.loadFunction('trim');
             * iframe.loadFunction({name:'myTrim',fn:String.prototype.trim || trim});</code></pre>
             */
            loadFunction : function(fn, useDOM, invokeIt) {
                var name = fn.name || fn;
                var fnSrc = fn.fn || window[fn];
                name && fnSrc && this.execScript(name + '=' + fnSrc, useDOM); // fn.toString coercion
                invokeIt && this.execScript(name + '()'); // no args only
            },

            /**
             * @private
             * Evaluate the Iframes readyState/load event to determine its
             * 'load' state, and raise the 'domready/documentloaded' event when
             * applicable.
             */
            loadHandler : function(e, target) {
                
                var rstatus = (this.dom||{}).readyState || (e || {}).type ;
                
                if (this.eventsFollowFrameLinks || this._frameAction || this.isReset ) {
                                       
	                switch (rstatus) {
	                    case 'domready' : // MIF
                        case 'DOMFrameContentLoaded' :
	                    case 'domfail' : // MIF
	                        this._onDocReady (rstatus);
	                        break;
	                    case 'load' : // Gecko, Opera, IE
	                    case 'complete' :
	                        this._onDocLoaded(rstatus);
	                        break;
	                    case 'error':
	                        this._observable.fireEvent.apply(this._observable,['exception', this].concat(arguments));
	                        break;
	                    default :
	                }
                    this.frameState = rstatus;
                }
                
            },

            /**
             * @private
             * @param {String} eventName
             */
            _onDocReady  : function(eventName ){
                var w, obv = this._observable, D;
                if(!this.isReset && this.focusOnLoad && (w = this.getWindow())){
                    w.focus();
                }
                //raise internal event regardless of state.
                obv.fireEvent("_docready", this);
                
                (D = this.getDoc()) && (D.isReady = true);
               
                if ( !this.domFired && 
                     (this._hooked = this._renderHook())) {
                        // Only raise if sandBox injection succeeded (same origin)
                        this.domFired = true;
                        this.isReset || obv.fireEvent.call(obv, 'domready', this);
                }
                
                this.domReady = true;
                this.hideMask();
            },

            /**
             * @private
             * @param {String} eventName
             */
            _onDocLoaded  : function(eventName ){
                var obv = this._observable, w;
                this.domReady || this._onDocReady('domready');
                
                obv.fireEvent("_docload", this);  //invoke any callbacks
                this.isReset || obv.fireEvent("documentloaded", this);
                this.hideMask(true);
                this._frameAction = this.isReset = false;
            },

            /**
             * @private
             * Poll the Iframes document structure to determine DOM ready
             * state, and raise the 'domready' event when applicable.
             */
            checkDOM : function( win) {
                if ( Ext.isGecko ) { return; } 
                // initialise the counter
                var n = 0, frame = this, domReady = false,
                    b, l, d, 
                    max = this.domReadyRetries || 2500, //default max 5 seconds 
                    polling = false,
                    startLocation = (this.getFrameDocument() || {location : {}}).location.href;
                (function() { // DOM polling for IE and others
                    d = frame.getFrameDocument() || {location : {}};
                    // wait for location.href transition
                    polling = (d.location.href !== startLocation || d.location.href === frame._targetURI);
                    if ( frame.domReady) { return;}
                    domReady = polling && ((b = frame.getBody()) && !!(b.dom.innerHTML || '').length) || false;
                    // null href is a 'same-origin' document access violation,
                    // so we assume the DOM is built when the browser updates it
                    if (d.location.href && !domReady && (++n < max)) {
                        setTimeout(arguments.callee, 2); // try again
                        return;
                    }
                    frame.loadHandler({ type : domReady ? 'domready' : 'domfail'});
                })();
            },
            
            /**
            * @private 
            */
            filterEventOptionsRe: /^(?:scope|delay|buffer|single|stopEvent|preventDefault|stopPropagation|normalized|args|delegate)$/,

           /**
            * @private override to handle synthetic events vs DOM events
            */
            addListener : function(eventName, fn, scope, options){

                if(typeof eventName == "object"){
                    var o = eventName;
                    for(var e in o){
                        if(this.filterEventOptionsRe.test(e)){
                            continue;
                        }
                        if(typeof o[e] == "function"){
                            // shared options
                            this.addListener(e, o[e], o.scope,  o);
                        }else{
                            // individual options
                            this.addListener(e, o[e].fn, o[e].scope, o[e]);
                        }
                    }
                    return;
                }

                if(reSynthEvents.test(eventName)){
                    var O = this._observable; 
                    if(O){
                        O.events[eventName] || (O.addEvents(eventName)); 
                        O.addListener.call(O, eventName, fn, scope || this, options) ;}
                }else {
                    ElFrame.superclass.addListener.call(this, eventName,
                            fn, scope || this, options);
                }
                return this;
            },

            /**
             * @private override
             * Removes an event handler from this element.
             */
            removeListener : function(eventName, fn, scope){
                var O = this._observable;
                if(reSynthEvents.test(eventName)){
                    O && O.removeListener.call(O, eventName, fn, scope || this, options);
                }else {
                  ElFrame.superclass.removeListener.call(this, eventName, fn, scope || this);
              }
              return this;
            },

            /**
             * Removes all previous added listeners from this element
             * @private override
             */
            removeAllListeners : function(){
                Ext.EventManager.removeAll(this.dom);
                var O = this._observable;
                O && O.purgeListeners.call(this._observable);
                return this;
            },
            
            /**
             * Forcefully show the defined loadMask
             * @param {String} msg Mask text to display during the mask operation, defaults to previous defined
             * loadMask config value.
             * @param {String} msgCls The CSS class to apply to the loading message element (defaults to "x-mask-loading")
             * @param {String} maskCls The CSS class to apply to the mask element
             */
            showMask : function(msg, msgCls, maskCls) {
                var lmask = this.loadMask;
                if (lmask && !lmask.disabled ){
                    this.mask(msg || lmask.msg, msgCls || lmask.msgCls, maskCls || lmask.maskCls, lmask.maskEl);
                }
            },
            
            /**
             * Hide the defined loadMask 
             * @param {Boolean} forced True to hide the mask regardless of document ready/loaded state.
             */
            hideMask : function(forced) {
                var tlm = this.loadMask || {};
                if (forced || (tlm.hideOnReady && this.domReady)) {
                     this.unmask();
                }
            },
            
            /**
             * Puts a mask over the FRAME to disable user interaction. Requires core.css.
             * @param {String} msg (optional) A message to display in the mask
             * @param {String} msgCls (optional) A css class to apply to the msg element
             * @param {String} maskCls (optional) A css class to apply to the mask element
             * @param {String/Element} maskEl (optional) A targeted Element (parent of the IFRAME) to use the masking agent
             * @return {Element} The mask element
             */
            mask : function(msg, msgCls, maskCls, maskEl){
                this._mask && this.unmask();
                var p = Ext.get(maskEl) || this.parent('.ux-mif-mask-target') || this.parent();
                if(p.getStyle("position") == "static" && 
                    !p.select('iframe,frame,object,embed').elements.length){
                        p.addClass("x-masked-relative");
                }
                
                p.addClass("x-masked");
                
                this._mask = Ext.DomHelper.append(p, {cls: maskCls || "ux-mif-el-mask"} , true);
                this._mask.setDisplayed(true);
                this._mask._agent = p;
                
                if(typeof msg == 'string'){
                     this._maskMsg = Ext.DomHelper.append(p, {cls: msgCls || "ux-mif-el-mask-msg" , style: {visibility:'hidden'}, cn:{tag:'div', html:msg}}, true);
                     this._maskMsg
                        .setVisibilityMode(Ext.Element.VISIBILITY)
                        .center(p).setVisible(true);
                }
                if(Ext.isIE && !(Ext.isIE7 && Ext.isStrict) && this.getStyle('height') == 'auto'){ // ie will not expand full height automatically
                    this._mask.setSize(undefined, this._mask.getHeight());
                }
                return this._mask;
            },

            /**
             * Removes a previously applied mask.
             */
            unmask : function(){
                
                var a;
                if(this._mask){
                    (a = this._mask._agent) && a.removeClass(["x-masked-relative","x-masked"]);
                    if(this._maskMsg){
                        this._maskMsg.remove();
                        delete this._maskMsg;
                    }
                    this._mask.remove();
                    delete this._mask;
                }
             },

             /**
              * Creates an (frontal) transparent shim agent for the frame.  Used primarily for masking the frame during drag operations.
              * @return {Ext.Element} The new shim element.
              * @param {String} imgUrl Optional Url of image source to use during shimming (defaults to Ext.BLANK_IMAGE_URL).
              * @param {String} shimCls Optional CSS style selector for the shimming agent. (defaults to 'ux-mif-shim' ).
              * @return (HTMLElement} the shim element
              */
             createFrameShim : function(imgUrl, shimCls ){
                 this.shimCls = shimCls || this.shimCls || 'ux-mif-shim';
                 this.frameShim || (this.frameShim = this.next('.'+this.shimCls) ||  //already there ?
                  Ext.DomHelper.append(
                     this.dom.parentNode,{
                         tag : 'img',
                         src : imgUrl|| Ext.BLANK_IMAGE_URL,
                         cls : this.shimCls ,
                         galleryimg : "no"
                    }, true)) ;
                 this.frameShim && (this.frameShim.autoBoxAdjust = false); 
                 return this.frameShim;
             },
             
             /**
              * Toggles visibility of the (frontal) transparent shim agent for the frame.  Used primarily for masking the frame during drag operations.
              * @param {Boolean} show Optional True to activate the shim, false to hide the shim agent.
              */
             toggleShim : function(show){
                var shim = this.frameShim || this.createFrameShim();
                var cls = this.shimCls + '-on';
                !show && shim.removeClass(cls);
                show && !shim.hasClass(cls) && shim.addClass(cls);
             },

            /**
             * Loads this panel's iframe immediately with content returned from an XHR call.
             * @param {Object/String/Function} config A config object containing any of the following options:
             * <pre><code>
             *      frame.load({
             *         url: &quot;your-url.php&quot;,
             *         params: {param1: &quot;foo&quot;, param2: &quot;bar&quot;}, // or encoded string
             *         callback: yourFunction,
             *         scope: yourObject, // optional scope for the callback
             *         discardUrl: false,
             *         nocache: false,
             *         text: &quot;Loading...&quot;,
             *         timeout: 30,
             *         scripts: false,
             *         //optional custom renderer
             *         renderer:{render:function(el, response, updater, callback){....}}  
             *      });
             * </code></pre>
             * The only required property is url. The optional properties
             *            nocache, text and scripts are shorthand for
             *            disableCaching, indicatorText and loadScripts and are used
             *            to set their associated property on this panel Updater
             *            instance.
             * @return {Ext.ManagedIFrame.Element} this
             */
            load : function(loadCfg) {
                var um;
                if (um = this.getUpdater()) {
                    if (loadCfg && loadCfg.renderer) {
                        um.setRenderer(loadCfg.renderer);
                        delete loadCfg.renderer;
                    }
                    um.update.apply(um, arguments);
                }
                return this;
            },

             /** @private
              * Frame document event proxy
              */
             _eventProxy : function(e) {
                 if (!e) return;
                 e = Ext.EventObject.setEvent(e);
                 var be = e.browserEvent || e, er, args = [e.type, this];
                 
                 if (!be['eventPhase']
                         || (be['eventPhase'] == (be['AT_TARGET'] || 2))) {
                            
                     if(e.type == 'resize'){
	                    var doc = this.getFrameDocument();
	                    doc && (args.push(
	                        { height: ELD.getDocumentHeight(doc), width : ELD.getDocumentWidth(doc) },
	                        { height: ELD.getViewportHeight(doc), width : ELD.getViewportWidth(doc) },
	                        { height: ELD.getViewHeight(false, doc), width : ELD.getViewWidth(false, doc) }
	                      ));  
	                 }
                     
                     er =  this._observable ? 
                           this._observable.fireEvent.apply(this._observable, args.concat(
                              Array.prototype.slice.call(arguments,0))) 
                           : null;
                 
	                 // same-domain unloads should clear ElCache for use with the
	                 // next document rendering
	                 (e.type == 'unload') && this._unHook();
                     
                 }
                 return er;
            },
            
            /**
	         * dispatch a message to the embedded frame-window context (same-origin frames only)
	         * @name sendMessage
	         * @param {Mixed} message The message payload.  The payload can be any supported JS type. 
	         * @param {String} tag Optional reference tag 
	         * @param {String} origin Optional domain designation of the sender (defaults
	         * to document.domain).
	         */
	        sendMessage : function(message, tag, origin) {
	          //(implemented by mifmsg.js )
	        },
            
            /**
	         * Dispatch a cross-document message (per HTML5 specification) if the browser supports it natively.
	         * @name postMessage
	         * @param {String} message Required message payload (String only)
	         * @param {Array} ports Optional array of ports/channels. 
	         * @param {String} origin Optional domain designation of the sender (defaults
	         * to document.domain). 
	         * <p>Notes:  on IE8, this action is synchronous.
	         */
	        postMessage : function(message ,ports ,origin ){
	            //(implemented by mifmsg.js )
	        }

    });
   
    ElFrame = Ext.Element.IFRAME = Ext.Element.FRAME = Ext.ux.ManagedIFrame.Element;
    
      
    var fp = ElFrame.prototype;
    /**
     * @ignore
     */
    Ext.override ( ElFrame , {
          
    /**
     * Appends an event handler (shorthand for {@link #addListener}).
     * @param {String} eventName The type of event to handle
     * @param {Function} fn The handler function the event invokes
     * @param {Object} scope (optional) The scope (this element) of the handler function
     * @param {Object} options (optional) An object containing standard {@link #addListener} options
     * @member Ext.Element
     * @method on
     */
        on :  fp.addListener,
        
    /**
     * Removes an event handler from this element (shorthand for {@link #removeListener}).
     * @param {String} eventName the type of event to remove
     * @param {Function} fn the method the event invokes
     * @return {MIF.Element} this
     * @member Ext.Element
     * @method un
     */
        un : fp.removeListener,
        
        getUpdateManager : fp.getUpdater
    });

  /**
   * @class Ext.ux.ManagedIFrame.ComponentAdapter
   * @version 2.1.1 
   * @author Doug Hendricks. doug[always-At]theactivegroup.com
   * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
   * @copyright 2007-2010, Active Group, Inc.  All rights reserved.
   * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a>
   * @constructor
   * @desc
   * Abstract class.  This class should not be instantiated.
   */
  
   Ext.ux.ManagedIFrame.ComponentAdapter = function(){}; 
   Ext.ux.ManagedIFrame.ComponentAdapter.prototype = {
       
        /** @property */
        version : 2.01,
        
        /**
         * @cfg {String} defaultSrc the default src property assigned to the Managed Frame when the component is rendered.
         * @default null
         */
        defaultSrc : null,
        
        title      : '&#160;',
        
        /**
         * @cfg {String} unsupportedText Text to display when the IFRAMES/FRAMESETS are disabled by the browser.
         *
         */
        unsupportedText : 'Inline frames are NOT enabled\/supported by your browser.',
        
        hideMode   : !Ext.isIE && !!Ext.ux.plugin.VisibilityMode ? 'nosize' : 'display',
        
        animCollapse  : Ext.isIE ,

        animFloat  : Ext.isIE ,
        
        /**
         * @cfg {object} frameConfig Frames DOM configuration options
         * This optional configuration permits override of the IFRAME's DOM attributes
         * @example
          frameConfig : {
              name : 'framePreview',
              frameborder : 1,
              allowtransparency : true
             }
         */
        frameConfig  : null,
        
        /**
         * @cfg focusOnLoad True to set focus on the frame Window as soon as its document
         * reports loaded.  (Many external sites use IE's document.createRange to create 
         * DOM elements, but to be successfull IE requires that the FRAME have focus before
         * the method is called)
         * @default false
         */
        focusOnLoad   : false,
        
        /**
         * @property {Object} frameEl An {@link #Ext.ux.ManagedIFrame.Element} reference to rendered frame Element.
         */
        frameEl : null, 
  
        /**
         * @cfg {Boolean} useShim
         * True to use to create a transparent shimming agent for use in masking the frame during
         * drag operations.
         * @default false
         */
        useShim   : false,

        /**
         * @cfg {Boolean} autoScroll
         * True to use overflow:'auto' on the frame element and show scroll bars automatically when necessary,
         * false to clip any overflowing content (defaults to true).
         * @default true
         */
        autoScroll: true,
        
         /**
         * @cfg {String/Object} autoLoad
         * Loads this Components frame after the Component is rendered with content returned from an
         * XHR call or optionally from a form submission.  See {@link #Ext.ux.ManagedIFrame.ComponentAdapter-load} and {@link #Ext.ux.ManagedIFrame.ComponentAdapter-submitAsTarget} methods for
         * available configuration options.
         * @default null
         */
        autoLoad: null,
        
        /** @private */
        getId : function(){
             return this.id   || (this.id = "mif-comp-" + (++Ext.Component.AUTO_ID));
        },
        
        stateEvents : ['documentloaded'],
        
        stateful    : false,
        
        /**
         * Sets the autoScroll state for the frame.
         * @param {Boolean} auto True to set overflow:auto on the frame, false for overflow:hidden
         * @return {Ext.ux.ManagedIFrame.Component} this
         */
        setAutoScroll : function(auto){
            var scroll = Ext.value(auto, this.autoScroll === true);
            this.rendered && this.getFrame() &&  
                this.frameEl.setOverflow( (this.autoScroll = scroll) ? 'auto':'hidden');
            return this;
        },
        
        getContentTarget : function(){
            return this.getFrame();
        },
        
        /**
         * Returns the Ext.ux.ManagedIFrame.Element of the frame.
         * @return {Ext.ux.ManagedIFrame.Element} this.frameEl 
         */
        getFrame : function(){
             if(this.rendered){
                if(this.frameEl){ return this.frameEl;}
                var f = this.items && this.items.first ? this.items.first() : null;
                f && (this.frameEl = f.frameEl);
                return this.frameEl;
             }
             return null;
            },
        
        /**
         * Returns the frame's current window object.
         *
         * @return {Window} The frame Window object.
         */
        getFrameWindow : function() {
            return this.getFrame() ? this.frameEl.getWindow() : null;
        },

        /**
         * If sufficient privilege exists, returns the frame's current document
         * as an HTMLElement.
         *
         * @return {HTMLElement} The frame document or false if access to
         *         document object was denied.
         */
        getFrameDocument : function() {
            return this.getFrame() ? this.frameEl.getFrameDocument() : null;
        },

        /**
         * Get the embedded iframe's document as an Ext.Element.
         *
         * @return {Ext.Element object} or null if unavailable
         */
        getFrameDoc : function() {
            return this.getFrame() ? this.frameEl.getDoc() : null;
        },

        /**
         * If sufficient privilege exists, returns the frame's current document
         * body as an HTMLElement.
         *
         * @return {Ext.Element} The frame document body or Null if access to
         *         document object was denied.
         */
        getFrameBody : function() {
            return this.getFrame() ? this.frameEl.getBody() : null;
        },
        
        /**
         * Reset the embedded frame to a neutral domain state and clear its contents
          * @param {String}src (Optional) A specific reset string (eg. 'about:blank')
         *            to use for resetting the frame.
         * @param {Function} callback (Optional) A callback function invoked when the
         *            frame reset is complete.
         * @param {Object} scope (Optional) scope by which the callback function is
         *            invoked.
         * @return {Ext.ux.ManagedIFrame.Component} this
         */
        resetFrame : function() {
            this.getFrame() && this.frameEl.reset.apply(this.frameEl, arguments);
            return this;
        },
        
        /**
         * Loads the Components frame with the response from a form submit to the 
         * specified URL with the ManagedIframe.Element as it's submit target.
         * @param {Object} submitCfg A config object containing any of the following options:
         * <pre><code>
         *      mifPanel.submitAsTarget({
         *         form : formPanel.form,  //optional Ext.FormPanel, Ext form element, or HTMLFormElement
         *         url: &quot;your-url.php&quot;,
         *         params: {param1: &quot;foo&quot;, param2: &quot;bar&quot;}, // or a URL encoded string
         *         callback: yourFunction,  //optional
         *         scope: yourObject, // optional scope for the callback
         *         method: 'POST', //optional form.action (default:'POST')
         *         encoding : "multipart/form-data" //optional, default HTMLForm default
         *      });
         *
         * </code></pre>
         *
         * @return {Ext.ux.ManagedIFrame.Component} this
         */
        submitAsTarget  : function(submitCfg){
            this.getFrame() && this.frameEl.submitAsTarget.apply(this.frameEl, arguments);
            return this;
        },
        
        /**
         * Loads this Components's frame immediately with content returned from an
         * XHR call.
         *
         * @param {Object/String/Function} loadCfg A config object containing any of the following
         *            options:
         *
         * <pre><code>
         *      mifPanel.load({
         *         url: &quot;your-url.php&quot;,
         *         params: {param1: &quot;foo&quot;, param2: &quot;bar&quot;}, // or a URL encoded string
         *         callback: yourFunction,
         *         scope: yourObject, // optional scope for the callback
         *         discardUrl: false,
         *         nocache: false,
         *         text: &quot;Loading...&quot;,
         *         timeout: 30,
         *         scripts: false,
         *         submitAsTarget : false,  //optional true, to use Form submit to load the frame (see submitAsTarget method)
         *         renderer:{render:function(el, response, updater, callback){....}}  //optional custom renderer
         *      });
         *
         * </code></pre>
         *
         * The only required property is url. The optional properties
         *            nocache, text and scripts are shorthand for
         *            disableCaching, indicatorText and loadScripts and are used
         *            to set their associated property on this panel Updater
         *            instance.
         * @return {Ext.ux.ManagedIFrame.Component} this
         */
        load : function(loadCfg) {
            if(loadCfg && this.getFrame()){
                var args = arguments;
                this.resetFrame(null, function(){ 
                    loadCfg.submitAsTarget ?
                    this.submitAsTarget.apply(this,args):
                    this.frameEl.load.apply(this.frameEl,args);
                },this);
            }
            this.autoLoad = loadCfg;
            return this;
        },

        /** @private */
        doAutoLoad : function() {
            this.autoLoad && this.load(typeof this.autoLoad == 'object' ? 
                this.autoLoad : { url : this.autoLoad });
        },

        /**
         * Get the {@link #Ext.ux.ManagedIFrame.Updater} for this panel's iframe. Enables
         * Ajax-based document replacement of this panel's iframe document.
         *
         * @return {Ext.ux.ManagedIFrame.Updater} The Updater
         */
        getUpdater : function() {
            return this.getFrame() ? this.frameEl.getUpdater() : null;
        },
        
        /**
         * Sets the embedded Iframe src property. Note: invoke the function with
         * no arguments to refresh the iframe based on the current src value.
         *
         * @param {String/Function} url (Optional) A string or reference to a Function that
         *            returns a URI string when called
         * @param {Boolean} discardUrl (Optional) If not passed as <tt>false</tt>
         *            the URL of this action becomes the default SRC attribute
         *            for this iframe, and will be subsequently used in future
         *            setSrc calls (emulates autoRefresh by calling setSrc
         *            without params).
         * @param {Function} callback (Optional) A callback function invoked when the
         *            frame document has been fully loaded.
         * @param {Object} scope (Optional) scope by which the callback function is
         *            invoked.
         * @return {Ext.ux.ManagedIFrame.Component} this
         */
        setSrc : function(url, discardUrl, callback, scope) {
            this.getFrame() && this.frameEl.setSrc.apply(this.frameEl, arguments);
            return this;
        },

        /**
         * Sets the embedded Iframe location using its replace method. Note: invoke the function with
         * no arguments to refresh the iframe based on the current src value.
         *
         * @param {String/Function} url (Optional) A string or reference to a Function that
         *            returns a URI string when called
         * @param {Boolean} discardUrl (Optional) If not passed as <tt>false</tt>
         *            the URL of this action becomes the default SRC attribute
         *            for this iframe, and will be subsequently used in future
         *            setSrc calls (emulates autoRefresh by calling setSrc
         *            without params).
         * @param {Function} callback (Optional) A callback function invoked when the
         *            frame document has been fully loaded.
         * @param {Object} scope (Optional) scope by which the callback function is
         *            invoked.
         * @return {Ext.ux.ManagedIFrame.Component} this
         */
        setLocation : function(url, discardUrl, callback, scope) {
           this.getFrame() && this.frameEl.setLocation.apply(this.frameEl, arguments);
           return this;
        },

        /**
         * @private //Make it state-aware
         */
        getState : function() {
            var URI = this.getFrame() ? this.frameEl.getDocumentURI() || null : null;
            var state = this.supr().getState.call(this);
            state = Ext.apply(state || {}, 
                {defaultSrc : Ext.isFunction(URI) ? URI() : URI,
                 autoLoad   : this.autoLoad
                });
            return state;
        },
        
        /**
         * @private
         */
        setMIFEvents : function(){
            
            this.addEvents(

                    /**
                     * Fires when the iFrame has reached a loaded/complete state.
                     * @event documentloaded
                     * @memberOf Ext.ux.ManagedIFrame.ComponentAdapter
                     * @param {Ext.ux.ManagedIFrame.Element} frameEl
                     */
                    'documentloaded',  
                      
                    /**
                     * Fires ONLY when an iFrame's Document(DOM) has reach a
                     * state where the DOM may be manipulated (ie same domain policy)
                     * Note: This event is only available when overwriting the iframe
                     * document using the update method and to pages retrieved from a "same
                     * domain". Returning false from the eventHandler stops further event
                     * (documentloaded) processing.
                     * @event domready 
                     * @memberOf Ext.ux.ManagedIFrame.ComponentAdapter
                     * @param {Ext.ux.ManagedIFrame.Element} this.frameEl
                     */
                    'domready',
                    /**
                     * Fires when the frame actions raise an error
                     * @event exception
                     * @memberOf Ext.ux.ManagedIFrame.ComponentAdapter
                     * @param {Ext.ux.MIF.Element} frameEl
                     * @param {Error/string} exception
                     */
                    'exception',

                    /**
                     * Fires upon receipt of a message generated by window.sendMessage
                     * method of the embedded Iframe.window object
                     * @event message
                     * @memberOf Ext.ux.ManagedIFrame.ComponentAdapter
                     * @param {Ext.ux.ManagedIFrame.Element} this.frameEl
                     * @param {object}
                     *            message (members: type: {string} literal "message", data
                     *            {Mixed} [the message payload], domain [the document domain
                     *            from which the message originated ], uri {string} the
                     *            document URI of the message sender source (Object) the
                     *            window context of the message sender tag {string} optional
                     *            reference tag sent by the message sender
                     * <p>Alternate event handler syntax for message:tag filtering Fires upon
                     * receipt of a message generated by window.sendMessage method which
                     * includes a specific tag value of the embedded Iframe.window object
                     *
                     */
                    'message',

                    /**
                     * Fires when the frame is blurred (loses focus).
                     * @event blur
                     * @memberOf Ext.ux.ManagedIFrame.ComponentAdapter
                     * @param {Ext.ux.ManagedIFrame.Element} frameEl
                     * @param {Ext.Event} e Note: This event is only available when overwriting the
                     *            iframe document using the update method and to pages
                     *            retrieved from a "same domain". Returning false from the
                     *            eventHandler [MAY] NOT cancel the event, as this event is
                     *            NOT ALWAYS cancellable in all browsers.
                     */
                    'blur',

                    /**
                     * Fires when the frame gets focus. Note: This event is only available
                     * when overwriting the iframe document using the update method and to
                     * pages retrieved from a "same domain". Returning false from the
                     * eventHandler [MAY] NOT cancel the event, as this event is NOT ALWAYS
                     * cancellable in all browsers.
                     * @event focus
                     * @memberOf Ext.ux.ManagedIFrame.ComponentAdapter
                     * @param {Ext.ux.ManagedIFrame.Element} frameEl
                     * @param {Ext.Event} e
                     *
                    */
                    'focus',
                    
                     /**
                     * Note: This event is only available when overwriting the iframe
                     * document using the update method and to pages retrieved from a "same-origin"
                     * domain.  To prevent numerous scroll events from being raised use the <i>buffer</i> listener 
                     * option to limit the number of times the event is raised.
                     * @event scroll 
                     * @param {Ext.ux.MIF.Element} this.
                     * @param {Ext.Event}
                     */
                    'scroll',
                    
                    /**
                     * Fires when the frames window is resized. Note: This event is only available
                     * when overwriting the iframe document using the update method and to
                     * pages retrieved from a "same domain". 
                     * @event resize
                     * @memberOf Ext.ux.ManagedIFrame.ComponentAdapter
                     * @param {Ext.ux.ManagedIFrame.Element} frameEl
                     * @param {Ext.Event} e
                     * @param {Object} documentSize A height/width object signifying the new document size
                     * @param {Object} viewPortSize A height/width object signifying the size of the frame's viewport
                     * @param {Object} viewSize A height/width object signifying the size of the frame's view
                     *
                    */
                    'resize',
                    
                    /**
                     * Fires when(if) the frames window object raises the unload event
                     * Note: This event is only available when overwriting the iframe
                     * document using the update method and to pages retrieved from a "same-origin"
                     * domain. Note: Opera does not raise this event.
                     * @event unload 
                     * @memberOf Ext.ux.ManagedIFrame.ComponentAdapter
                     * @param {Ext.ux.ManagedIFrame.Element} frameEl
                     * @param {Ext.Event}
                     */
                    'unload',
                    
                    /**
                     * Fires when the iFrame has been reset to a neutral domain state (blank document).
                     * @event reset
                     * @param {Ext.ux.ManagedIFrame.Element} frameEl
                     */
                    'reset'
                );
        },
        
        /**
         * dispatch a message to the embedded frame-window context (same-origin frames only)
         * @name sendMessage
         * @memberOf Ext.ux.ManagedIFrame.Element
         * @param {Mixed} message The message payload.  The payload can be any supported JS type. 
         * @param {String} tag Optional reference tag 
         * @param {String} origin Optional domain designation of the sender (defaults
         * to document.domain).
         */
        sendMessage : function(message, tag, origin) {
       
          //(implemented by mifmsg.js )
        },
        //Suspend (and queue) host container events until the child MIF.Component is rendered.
        onAdd : function(C){
             C.relayTarget && this.suspendEvents(true); 
        },
        
        initRef: function() {
      
	        if(this.ref){
	            var t = this,
	                levels = this.ref.split('/'),
	                l = levels.length,
	                i;
	            for (i = 0; i < l; i++) {
	                if(t.ownerCt){
	                    t = t.ownerCt;
	                }
	            }
	            this.refName = levels[--i];
	            t[this.refName] || (t[this.refName] = this);
	            
	            this.refOwner = t;
	        }
	    }
      
   };
   
   /*
    * end Adapter
    */
   
  /**
   * @class Ext.ux.ManagedIFrame.Component
   * @extends Ext.BoxComponent
   * @version 2.1.1 
   * @author Doug Hendricks. doug[always-At]theactivegroup.com
   * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
   * @copyright 2007-2010, Active Group, Inc.  All rights reserved.
   * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a>
   * @constructor
   * @base Ext.ux.ManagedIFrame.ComponentAdapter
   * @param {Object} config The config object
   */
  Ext.ux.ManagedIFrame.Component = Ext.extend(Ext.BoxComponent , { 
            
            ctype     : "Ext.ux.ManagedIFrame.Component",
            
            /** @private */
            initComponent : function() {
               
                var C = {
	                monitorResize : this.monitorResize || (this.monitorResize = !!this.fitToParent),
	                plugins : (this.plugins ||[]).concat(
	                    this.hideMode === 'nosize' && Ext.ux.plugin.VisibilityMode ? 
		                    [new Ext.ux.plugin.VisibilityMode(
		                        {hideMode :'nosize',
		                         elements : ['bwrap']
		                        })] : [] )
                  };
                  
                MIF.Component.superclass.initComponent.call(
                  Ext.apply(this,
                    Ext.apply(this.initialConfig, C)
                    ));
                    
                this.setMIFEvents();
            },   

            /** @private */
            onRender : function(ct, position){
                
                //default child frame's name to that of MIF-parent id (if not specified on frameCfg).
                var frCfg = this.frameCfg || this.frameConfig || (this.relayTarget ? {name : this.relayTarget.id}: {}) || {};
                
                //backward compatability with MIF 1.x
                var frDOM = frCfg.autoCreate || frCfg;
                frDOM = Ext.apply({tag  : 'iframe', id: Ext.id()}, frDOM);
                
                var el = Ext.getDom(this.el);

                (el && el.tagName == 'iframe') || 
                  (this.autoEl = Ext.apply({
                                    name : frDOM.id,
                                    frameborder : 0
                                   }, frDOM ));
                 
                MIF.Component.superclass.onRender.apply(this, arguments);
               
                if(this.unsupportedText){
                    ct.child('noframes') || ct.createChild({tag: 'noframes', html : this.unsupportedText || null});  
                }   
                var frame = this.el ;
                
                var F;
                if( F = this.frameEl = (this.el ? new MIF.Element(this.el.dom, true): null)){
                    (F.ownerCt = (this.relayTarget || this)).frameEl = F;
                    F.addClass('ux-mif'); 
                    if (this.loadMask) {
                        //resolve possible maskEl by Element name eg. 'body', 'bwrap', 'actionEl'
                        var mEl = this.loadMask.maskEl;
                        F.loadMask = Ext.apply({
                                    disabled    : false,
                                    hideOnReady : false,
                                    msgCls      : 'ext-el-mask-msg x-mask-loading',  
                                    maskCls     : 'ext-el-mask'
                                },
                                {
                                  maskEl : F.ownerCt[String(mEl)] || F.parent('.' + String(mEl)) || F.parent('.ux-mif-mask-target') || mEl 
                                },
                                Ext.isString(this.loadMask) ? {msg:this.loadMask} : this.loadMask
                              );
                        Ext.get(F.loadMask.maskEl) && Ext.get(F.loadMask.maskEl).addClass('ux-mif-mask-target');
                    }
                    F.disableMessaging = Ext.value(frCfg.disableMessaging, true);
                    F._observable && 
                        (this.relayTarget || this).relayEvents(F._observable, frameEvents.concat(this._msgTagHandlers || []));
                    delete this.contentEl;
                 }
                 
            },
            
            /** @private */
            afterRender  : function(container) {
                MIF.Component.superclass.afterRender.apply(this,arguments);
                
                // only resize (to Parent) if the panel is NOT in a layout.
                // parentNode should have {style:overflow:hidden;} applied.
                if (this.fitToParent && !this.ownerCt) {
                    var pos = this.getPosition(), size = (Ext.get(this.fitToParent)
                            || this.getEl().parent()).getViewSize();
                    this.setSize(size.width - pos[0], size.height - pos[1]);
                }

                this.getEl().setOverflow('hidden'); //disable competing scrollers
                this.setAutoScroll();
                var F;
               /* Enable auto-Shims if the Component participates in (nested?)
                * border layout.
                * Setup event handlers on the SplitBars and region panels to enable the frame
                * shims when needed
                */
                if(F = this.frameEl){
                    var ownerCt = this.ownerCt;
                    while (ownerCt) {
                        ownerCt.on('afterlayout', function(container, layout) {
                            Ext.each(['north', 'south', 'east', 'west'],
                                    function(region) {
                                        var reg;
                                        if ((reg = layout[region]) && 
                                             reg.split && reg.split.dd &&
                                             !reg._splitTrapped) {
                                               reg.split.dd.endDrag = reg.split.dd.endDrag.createSequence(MIM.hideShims, MIM );
                                               reg.split.on('beforeresize',MIM.showShims,MIM);
                                               reg._splitTrapped = MIM._splitTrapped = true;
                                        }
                            }, this);
                        }, this, { single : true}); // and discard
                        ownerCt = ownerCt.ownerCt; // nested layouts?
                    }
                    /*
                     * Create an img shim if the component participates in a layout or forced
                     */
                    if(!!this.ownerCt || this.useShim ){ this.frameShim = F.createFrameShim(); }
                    this.getUpdater().showLoadIndicator = this.showLoadIndicator || false;
                    
                    //Resume Parent containers' events 
                    var resumeEvents = this.relayTarget && this.ownerCt ?                         
                       this.ownerCt.resumeEvents.createDelegate(this.ownerCt) : null;
                       
                    if(this.autoload){
                       this.doAutoLoad();
                    } else if(this.frameMarkup || this.html) {
                       F.update(this.frameMarkup || this.html, true, resumeEvents);
                       delete this.html;
                       delete this.frameMarkup;
                       return;
                    }else{
                       if(this.defaultSrc){
                            F.setSrc(this.defaultSrc, false);
                       }else{
                            /* If this is a no-action frame, reset it first, then resume parent events
                             * allowing access to a fully reset frame by upstream afterrender/layout events
                             */ 
                            F.reset(null, resumeEvents);
                            return;
                       }
                    }
                    resumeEvents && resumeEvents();
                }
            },
            
            /** @private */
            beforeDestroy : function() {
                var F;
                if(F = this.getFrame()){
                    F.remove();
                    this.frameEl = this.frameShim = null;
                }
                this.relayTarget && (this.relayTarget.frameEl = null);
                MIF.Component.superclass.beforeDestroy.call(this);
            }
    });

    Ext.override(MIF.Component, MIF.ComponentAdapter.prototype);
    Ext.reg('mif', MIF.Component);
   
    /*
    * end Component
    */
    
  /**
   * @private
   * this function renders a child MIF.Component to MIF.Panel and MIF.Window
   * designed to be called by the constructor of higher-level MIF.Components only.
   */
  function embed_MIF(config){
    
    config || (config={});
    config.layout = 'fit';
    config.items = {
             xtype    : 'mif',
               ref    : 'mifChild',
            useShim   : true,
           autoScroll : Ext.value(config.autoScroll , this.autoScroll),
          defaultSrc  : Ext.value(config.defaultSrc , this.defaultSrc),
         frameMarkup  : Ext.value(config.html , this.html),
            loadMask  : Ext.value(config.loadMask , this.loadMask),
         focusOnLoad  : Ext.value(config.focusOnLoad, this.focusOnLoad),
          frameConfig : Ext.value(config.frameConfig || config.frameCfg , this.frameConfig),
          relayTarget : this  //direct relay of events to the parent component
        };
    delete config.html; 
    this.setMIFEvents();
    return config; 
    
  };
    
  /**
   * @class Ext.ux.ManagedIFrame.Panel
   * @extends Ext.Panel
   * @version 2.1.1 
   * @author Doug Hendricks. doug[always-At]theactivegroup.com
   * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
   * @copyright 2007-2010, Active Group, Inc.  All rights reserved.
   * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a>
   * @constructor
   * @base Ext.ux.ManagedIFrame.ComponentAdapter
   * @param {Object} config The config object
   */

  Ext.ux.ManagedIFrame.Panel = Ext.extend( Ext.Panel , {
        ctype       : 'Ext.ux.ManagedIFrame.Panel',
        bodyCssClass: 'ux-mif-mask-target',
        constructor : function(config){
            MIF.Panel.superclass.constructor.call(this, embed_MIF.call(this, config));
         }
  });
  
  Ext.override(MIF.Panel, MIF.ComponentAdapter.prototype);
  Ext.reg('iframepanel', MIF.Panel);
    /*
    * end Panel
    */

    /**
     * @class Ext.ux.ManagedIFrame.Portlet
     * @extends Ext.ux.ManagedIFrame.Panel
     * @version 2.1.1 
     * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
     * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a> 
     * @author Doug Hendricks. Forum ID: <a href="http://extjs.com/forum/member.php?u=8730">hendricd</a> 
     * @copyright 2007-2010, Active Group, Inc. All rights reserved.
     * @constructor Create a new Ext.ux.ManagedIFramePortlet 
     * @param {Object} config The config object
     */

    Ext.ux.ManagedIFrame.Portlet = Ext.extend(Ext.ux.ManagedIFrame.Panel, {
                ctype      : "Ext.ux.ManagedIFrame.Portlet",
                anchor     : '100%',
                frame      : true,
                collapseEl : 'bwrap',
                collapsible: true,
                draggable  : true,
                cls        : 'x-portlet'
                
            });
            
    Ext.reg('iframeportlet', MIF.Portlet);
   /*
    * end Portlet
    */
    
  /**
   * @class Ext.ux.ManagedIFrame.Window
   * @extends Ext.Window
   * @version 2.1.1 
   * @author Doug Hendricks. 
   * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
   * @copyright 2007-2010, Active Group, Inc.  All rights reserved.
   * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a>
   * @constructor
   * @base Ext.ux.ManagedIFrame.ComponentAdapter
   * @param {Object} config The config object
   */
    
  Ext.ux.ManagedIFrame.Window = Ext.extend( Ext.Window , 
       {
            ctype       : "Ext.ux.ManagedIFrame.Window",
            bodyCssClass: 'ux-mif-mask-target',
            constructor : function(config){
			    MIF.Window.superclass.constructor.call(this, embed_MIF.call(this, config));
            }
    });
    Ext.override(MIF.Window, MIF.ComponentAdapter.prototype);
    Ext.reg('iframewindow', MIF.Window);
    
    /*
    * end Window
    */
    
    /**
     * @class Ext.ux.ManagedIFrame.Updater
     * @extends Ext.Updater
     * @version 2.1.1 
     * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
     * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a> 
     * @author Doug Hendricks. Forum ID: <a href="http://extjs.com/forum/member.php?u=8730">hendricd</a> 
     * @copyright 2007-2010, Active Group, Inc. All rights reserved.
     * @constructor Creates a new Ext.ux.ManagedIFrame.Updater instance.
     * @param {String/Object} el The element to bind the Updater instance to.
     */
    Ext.ux.ManagedIFrame.Updater = Ext.extend(Ext.Updater, {
    
       /**
         * Display the element's "loading" state. By default, the element is updated with {@link #indicatorText}. This
         * method may be overridden to perform a custom action while this Updater is actively updating its contents.
         */
        showLoading : function(){
            this.showLoadIndicator && this.el && this.el.mask(this.indicatorText);
            
        },
        
        /**
         * Hide the Frames masking agent.
         */
        hideLoading : function(){
            this.showLoadIndicator && this.el && this.el.unmask();
        },
        
        // private
        updateComplete : function(response){
            MIF.Updater.superclass.updateComplete.apply(this,arguments);
            this.hideLoading();
        },
    
        // private
        processFailure : function(response){
            MIF.Updater.superclass.processFailure.apply(this,arguments);
            this.hideLoading();
        }
        
    }); 
    
    
    var styleCamelRe = /(-[a-z])/gi;
    var styleCamelFn = function(m, a) {
        return a.charAt(1).toUpperCase();
    };
    
    /**
     * @class Ext.ux.ManagedIFrame.CSS
     * Stylesheet interface object
     * @version 2.1.1 
     * @author Doug Hendricks. doug[always-At]theactivegroup.com
     * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
     * @copyright 2007-2010, Active Group, Inc.  All rights reserved.
     * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a>
     */
    Ext.ux.ManagedIFrame.CSS = function(hostDocument) {
        var doc;
        if (hostDocument) {
            doc = hostDocument;
            return {
                rules : null,
                /** @private */
                destroy  :  function(){  return doc = null; },

                /**
                 * Creates a stylesheet from a text blob of rules. These rules
                 * will be wrapped in a STYLE tag and appended to the HEAD of
                 * the document.
                 *
                 * @param {String}
                 *            cssText The text containing the css rules
                 * @param {String} id An (optional) id to add to the stylesheet for later removal
                 * @return {StyleSheet}
                 */
                createStyleSheet : function(cssText, id) {
                    var ss;
                    if (!doc)return;
                    var head = doc.getElementsByTagName("head")[0];
                    var rules = doc.createElement("style");
                    rules.setAttribute("type", "text/css");
                    Ext.isString(id) && rules.setAttribute("id", id);

                    if (Ext.isIE) {
                        head.appendChild(rules);
                        ss = rules.styleSheet;
                        ss.cssText = cssText;
                    } else {
                        try {
                            rules.appendChild(doc.createTextNode(cssText));
                        } catch (e) {
                            rules.cssText = cssText;
                        }
                        head.appendChild(rules);
                        ss = rules.styleSheet
                                ? rules.styleSheet
                                : (rules.sheet || doc.styleSheets[doc.styleSheets.length - 1]);
                    }
                    this.cacheStyleSheet(ss);
                    return ss;
                },

                /**
                 * Removes a style or link tag by id
                 *
                 * @param {String}
                 *            id The id of the tag
                 */
                removeStyleSheet : function(id) {

                    if (!doc || !id)return;
                    var existing = doc.getElementById(id);
                    if (existing) {
                        existing.parentNode.removeChild(existing);
                    }
                },

                /**
                 * Dynamically swaps an existing stylesheet reference for a new
                 * one
                 *
                 * @param {String}
                 *            id The id of an existing link tag to remove
                 * @param {String}
                 *            url The href of the new stylesheet to include
                 */
                swapStyleSheet : function(id, url) {
                    if (!doc)return;
                    this.removeStyleSheet(id);
                    var ss = doc.createElement("link");
                    ss.setAttribute("rel", "stylesheet");
                    ss.setAttribute("type", "text/css");
                    Ext.isString(id) && ss.setAttribute("id", id);
                    ss.setAttribute("href", url);
                    doc.getElementsByTagName("head")[0].appendChild(ss);
                },

                /**
                 * Refresh the rule cache if you have dynamically added stylesheets
                 * @return {Object} An object (hash) of rules indexed by selector
                 */
                refreshCache : function() {
                    return this.getRules(true);
                },

                // private
                cacheStyleSheet : function(ss, media) {
                    this.rules || (this.rules = {});
                    
                     try{// try catch for cross domain access issue
			          
				          Ext.each(ss.cssRules || ss.rules || [], 
				            function(rule){ 
				              this.hashRule(rule, ss, media);
				          }, this);  
				          
				          //IE @imports
				          Ext.each(ss.imports || [], 
				           function(sheet){
				              sheet && this.cacheStyleSheet(sheet,this.resolveMedia([sheet, sheet.parentStyleSheet]));
				           }
				          ,this);
			          
			        }catch(e){}
                },
                 // @private
			   hashRule  :  function(rule, sheet, mediaOverride){
			      
			      var mediaSelector = mediaOverride || this.resolveMedia(rule);
			      
			      //W3C @media
			      if( rule.cssRules || rule.rules){
			          this.cacheStyleSheet(rule, this.resolveMedia([rule, rule.parentRule ]));
			      } 
			      
			       //W3C @imports
			      if(rule.styleSheet){ 
			         this.cacheStyleSheet(rule.styleSheet, this.resolveMedia([rule, rule.ownerRule, rule.parentStyleSheet]));
			      }
			      
			      rule.selectorText && 
			        Ext.each((mediaSelector || '').split(','), 
			           function(media){
			            this.rules[((media ? media.trim() + ':' : '') + rule.selectorText).toLowerCase()] = rule;
			        }, this);
			      
			   },
			
			   /**
			    * @private
			    * @param {Object/Array} rule CSS Rule (or array of Rules/sheets) to evaluate media types.
			    * @return a comma-delimited string of media types. 
			    */
			   resolveMedia  : function(rule){
			        var media;
			        Ext.each([].concat(rule),function(r){
			            if(r && r.media && r.media.length){
			                media = r.media;
			                return false;
			            }
			        });
			        return media ? (Ext.isIE ? String(media) : media.mediaText ) : '';
			     },

                /**
                 * Gets all css rules for the document
                 *
                 * @param {Boolean}
                 *            refreshCache true to refresh the internal cache
                 * @return {Object} An object (hash) of rules indexed by
                 *         selector
                 */
                getRules : function(refreshCache) {
                    if (!this.rules || refreshCache) {
                        this.rules = {};
                        if (doc) {
                            var ds = doc.styleSheets;
                            for (var i = 0, len = ds.length; i < len; i++) {
                                try {
                                    this.cacheStyleSheet(ds[i]);
                                } catch (e) {}
                            }
                        }
                    }
                    return this.rules;
                },

               /**
			    * Gets an an individual CSS rule by selector(s)
			    * @param {String/Array} selector The CSS selector or an array of selectors to try. The first selector that is found is returned.
			    * @param {Boolean} refreshCache true to refresh the internal cache if you have recently updated any rules or added styles dynamically
			    * @param {String} mediaSelector Name of optional CSS media context (eg. print, screen)
			    * @return {CSSRule} The CSS rule or null if one is not found
			    */
                getRule : function(selector, refreshCache, mediaSelector) {
                    var rs = this.getRules(refreshCache);

			        if(Ext.type(mediaSelector) == 'string'){
			            mediaSelector = mediaSelector.trim() + ':';
			        }else{
			            mediaSelector = '';
			        }
			
			        if(!Ext.isArray(selector)){
			            return rs[(mediaSelector + selector).toLowerCase()];
			        }
			        var select;
			        for(var i = 0; i < selector.length; i++){
			            select = (mediaSelector + selector[i]).toLowerCase();
			            if(rs[select]){
			                return rs[select];
			            }
			        }
			        return null;
                },

               /**
			    * Updates a rule property
			    * @param {String/Array} selector If it's an array it tries each selector until it finds one. Stops immediately once one is found.
			    * @param {String} property The css property
			    * @param {String} value The new value for the property
			    * @param {String} mediaSelector Name(s) of optional media contexts. Multiple may be specified, delimited by commas (eg. print,screen)
			    * @return {Boolean} true If a rule was found and updated
			    */
                updateRule : function(selector, property, value, mediaSelector){
    
			         Ext.each((mediaSelector || '').split(','), function(mediaSelect){    
			            if(!Ext.isArray(selector)){
			                var rule = this.getRule(selector, false, mediaSelect);
			                if(rule){
			                    rule.style[property.replace(camelRe, camelFn)] = value;
			                    return true;
			                }
			            }else{
			                for(var i = 0; i < selector.length; i++){
			                    if(this.updateRule(selector[i], property, value, mediaSelect)){
			                        return true;
			                    }
			                }
			            }
			            return false;
			         }, this);
                }
            };
        }
    };

    /**
     * @class Ext.ux.ManagedIFrame.Manager
     * @version 2.1.1 
	 * @author Doug Hendricks. doug[always-At]theactivegroup.com
	 * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
	 * @copyright 2007-2010, Active Group, Inc.  All rights reserved.
	 * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a>
	 * @singleton
     */
    Ext.ux.ManagedIFrame.Manager = function() {
        var frames = {};
        var implementation = {
            // private DOMFrameContentLoaded handler for browsers (Gecko, Webkit, Opera) that support it.
            _DOMFrameReadyHandler : function(e) {
                try {
                    var $frame ;
                    if ($frame = e.target.ownerCt){
                        $frame.loadHandler.call($frame,e);
                    }
                } catch (rhEx) {} //nested iframes will throw when accessing target.id
            },
            /**
             * @cfg {String} shimCls
             * @default "ux-mif-shim"
             * The default CSS rule applied to MIF image shims to toggle their visibility.
             */
            shimCls : 'ux-mif-shim',

            /** @private */
            register : function(frame) {
                frame.manager = this;
                frames[frame.id] = frames[frame.name] = {ref : frame };
                return frame;
            },
            /** @private */
            deRegister : function(frame) {
                delete frames[frame.id];
                delete frames[frame.name];
                
            },
            /**
             * Toggles the built-in MIF shim off on all visible MIFs
             * @methodOf Ext.ux.MIF.Manager
             *
             */
            hideShims : function() {
                var mm = MIF.Manager;
                mm.shimsApplied && Ext.select('.' + mm.shimCls, true).removeClass(mm.shimCls+ '-on');
                mm.shimsApplied = false;
            },

            /**
             * Shim ALL MIFs (eg. when a region-layout.splitter is on the move or before start of a drag operation)
             * @methodOf Ext.ux.MIF.Manager
             */
            showShims : function() {
                var mm = MIF.Manager;
                !mm.shimsApplied && Ext.select('.' + mm.shimCls, true).addClass(mm.shimCls+ '-on');
                mm.shimsApplied = true;
            },

            /**
             * Retrieve a MIF instance by its DOM ID
             * @methodOf Ext.ux.MIF.Manager
             * @param {Ext.ux.MIF/string} id
             */
            getFrameById : function(id) {
                return typeof id == 'string' ? (frames[id] ? frames[id].ref
                        || null : null) : null;
            },

            /**
             * Retrieve a MIF instance by its DOM name
             * @methodOf Ext.ux.MIF.Manager
             * @param {Ext.ux.MIF/string} name
             */
            getFrameByName : function(name) {
                return this.getFrameById(name);
            },

            /** @private */
            // retrieve the internal frameCache object
            getFrameHash : function(frame) {
                return frames[frame.id] || frames[frame.id] || null;
            },

            /** @private */
            _flyweights : {},

            /** @private */
            destroy : function() {
                if (document.addEventListener && !Ext.isOpera) {
                      window.removeEventListener("DOMFrameContentLoaded", this._DOMFrameReadyHandler , false);
                }
                delete this._flyweights;
            }
        };
        // for Gecko and any who might support it later 
        document.addEventListener && !Ext.isOpera &&
            window.addEventListener("DOMFrameContentLoaded", implementation._DOMFrameReadyHandler , false);

        Ext.EventManager.on(window, 'beforeunload', implementation.destroy, implementation);
        return implementation;
    }();
    
    MIM = MIF.Manager;
    MIM.showDragMask = MIM.showShims;
    MIM.hideDragMask = MIM.hideShims;
    
    /**
     * Shim all MIF's during a Window drag operation.
     */
    var winDD = Ext.Window.DD;
    Ext.override(winDD, {
       startDrag : winDD.prototype.startDrag.createInterceptor(MIM.showShims),
       endDrag   : winDD.prototype.endDrag.createInterceptor(MIM.hideShims)
    });

    //Previous release compatibility
    Ext.ux.ManagedIFramePanel = MIF.Panel;
    Ext.ux.ManagedIFramePortlet = MIF.Portlet;
    Ext.ux.ManagedIframe = function(el,opt){
        
        var args = Array.prototype.slice.call(arguments, 0),
            el = Ext.get(args[0]),
            config = args[0];

        if (el && el.dom && el.dom.tagName == 'IFRAME') {
            config = args[1] || {};
        } else {
            config = args[0] || args[1] || {};

            el = config.autoCreate ? Ext.get(Ext.DomHelper.append(
                    config.autoCreate.parent || Ext.getBody(), Ext.apply({
                        tag : 'iframe',
                        frameborder : 0,
                        cls : 'x-mif',
                        src : (Ext.isIE && Ext.isSecure)? Ext.SSL_SECURE_URL: 'about:blank'
                    }, config.autoCreate)))
                    : null;

            if(el && config.unsupportedText){
                Ext.DomHelper.append(el.dom.parentNode, {tag:'noframes',html: config.unsupportedText } );
            }
        }
        
        var mif = new MIF.Element(el,true);
        if(mif){
            Ext.apply(mif, {
                disableMessaging : Ext.value(config.disableMessaging , true),
                loadMask : !!config.loadMask ? Ext.apply({
                            msg : 'Loading..',
                            msgCls : 'x-mask-loading',
                            maskEl : null,
                            hideOnReady : false,
                            disabled : false
                        }, config.loadMask) : false,
                _windowContext : null,
                eventsFollowFrameLinks : Ext.value(config.eventsFollowFrameLinks ,true)
            });
            
            config.listeners && mif.on(config.listeners);
            
            if(!!config.html){
                mif.update(config.html);
            } else {
                !!config.src && mif.setSrc(config.src);
            }
        }
        
        return mif;   
    };

    /**
     * Internal Error class for ManagedIFrame Components
	 * @class Ext.ux.ManagedIFrame.Error
     * @extends Ext.Error
     * @version 2.1.1 
     * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
     * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a> 
     * @author Doug Hendricks. Forum ID: <a href="http://extjs.com/forum/member.php?u=8730">hendricd</a> 
     * @copyright 2007-2010, Active Group, Inc. All rights reserved.
	 * @constructor 
     * @param {String} message
     * @param {Mixed} arg optional argument to include in Error object.
	 */
	Ext.ux.ManagedIFrame.Error = Ext.extend(Ext.Error, {
	    constructor : function(message, arg) {
	        this.arg = arg;
	        Ext.Error.call(this, message);
	    },
	    name : 'Ext.ux.ManagedIFrame'
	});
    
	Ext.apply(Ext.ux.ManagedIFrame.Error.prototype, {
	    lang: {
	        'documentcontext-remove': 'An attempt was made to remove an Element from the wrong document context.',
	        'execscript-secure-context': 'An attempt was made at script execution within a document context with limited access permissions.',
	        'printexception': 'An Error was encountered attempting the print the frame contents (document access is likely restricted).'
	    }
	});
    
    /** @private */
    Ext.onReady(function() {
            // Generate CSS Rules but allow for overrides.
            var CSS = new Ext.ux.ManagedIFrame.CSS(document), rules = [];

            CSS.getRule('.ux-mif-fill')|| (rules.push('.ux-mif-fill{height:100%;width:100%;}'));
            CSS.getRule('.ux-mif-mask-target')|| (rules.push('.ux-mif-mask-target{position:relative;zoom:1;}'));
            CSS.getRule('.ux-mif-el-mask')|| (rules.push(
              '.ux-mif-el-mask {z-index: 100;position: absolute;top:0;left:0;-moz-opacity: 0.5;opacity: .50;*filter: alpha(opacity=50);width: 100%;height: 100%;zoom: 1;} ',
              '.ux-mif-el-mask-msg {z-index: 1;position: absolute;top: 0;left: 0;border:1px solid;background:repeat-x 0 -16px;padding:2px;} ',
              '.ux-mif-el-mask-msg div {padding:5px 10px 5px 10px;border:1px solid;cursor:wait;} '
              ));


            if (!CSS.getRule('.ux-mif-shim')) {
                rules.push('.ux-mif-shim {z-index:8500;position:absolute;top:0px;left:0px;background:transparent!important;overflow:hidden;display:none;}');
                rules.push('.ux-mif-shim-on{width:100%;height:100%;display:block;zoom:1;}');
                rules.push('.ext-ie6 .ux-mif-shim{margin-left:5px;margin-top:3px;}');
            }

            !!rules.length && CSS.createStyleSheet(rules.join(' '), 'mifCSS');
            
        });

    /** @sourceURL=<mif.js> */
    Ext.provide && Ext.provide('mif');
})();
/* END OF FILE: ext/plugins/miframe-debug.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/infobar.js 
 */

//biogps.signupwin = null;

biogps.staticpage_data = new Ext.util.MixedCollection();
biogps.staticpage_data.addAll(
        [{
            title: 'About BioGPS',
            id: 'about',
            content: '/about/?mode=div'
        },{
            title: 'Terms of Use',
            id: 'terms',
            content: '/terms/?mode=div'
        },{
            title: 'Help',
            id: 'help',
            content: '/help/?mode=div'
        },{
            title: 'FAQ',
            id: 'faq',
            content: '/faq/?mode=div'
        },{
            title: 'Downloads',
            id: 'downloads',
            content: '/downloads/?mode=div'
        },{
            title: 'Blog',
            id: 'blog',
            icon: '/assets/img/blogger_16.gif',
            url: 'http://biogps.blogspot.com/'
        }]
);



biogps.showInfoPage = function(pageid){
	//var data = Ext.get('infobar_'+pageid).infodata;
    var data = biogps.staticpage_data.get(pageid);
	if (data){
		var tab_container = Ext.getCmp('center_panel');
		var infotab_id = 'infotab_'+data.id;
			var infotab = tab_container.getItem(infotab_id);
			if (!infotab) {
				infotab = tab_container.add({ title:data.title,
							                   id:infotab_id,
							                   closable: true,
							                   autoScroll:true});
			}
			tab_container.setActiveTab(infotab)
			infotab.load({
			    url: data.content,
			    scripts: true
			});
	}
};

biogps.initInfobar = function(){

//	var data = [{
//    	    title: 'About BioGPS',
//    	    id: 'about',
//    		content: '/about/?mode=div'
//	    },{
//	        title: 'Terms of Use',
//	        id: 'terms',
//			content: '/terms/?mode=div'
//		},{
//		    title: 'Help',
//	        id: 'help',
//			content: '/help/?mode=div'
//		},{
//		    title: 'FAQ',
//	        id: 'faq',
//			content: '/faq/?mode=div'
//		},{
//		    title: 'Downloads',
//	        id: 'downloads',
//			content: '/downloads/?mode=div'
//		},{
//		    title: 'Blog',
//	        id: 'blog',
//            icon: '/assets/img/blogger_16.gif',
//	        url: 'http://biogps.blogspot.com/'
//	    }];

	var container = Ext.get('info_bar');

    for (var i=0;i<biogps.staticpage_data.length;i++){
        var data = biogps.staticpage_data.get(i);
        var _html = data.title;
        var _html = data.icon?data.title+String.format('&nbsp;<img src="{0}">', data.icon):data.title;
        if (data.url){
            var child = container.createChild({tag:'a', id:'infobar_'+data.id, style: "padding-right:20px", href: data.url, target: '_blank', html: _html});
        }
        else{
            var child = container.createChild({tag:'a', id:'infobar_'+data.id, style: "padding-right:20px", href: '#goto='+data.id, html: _html});

//	for (var i=0;i<data.length;i++){
//		var _html = data[i].title;
//		var _html = data[i].icon?data[i].title+String.format('&nbsp;<img src="{0}">', data[i].icon):data[i].title;
//		if (data[i].url){
//			var child = container.createChild({tag:'a', id:'infobar_'+data[i].id, style: "padding-right:20px", href: data[i].url, target: '_blank', html: _html});
//
//		}
//		else{
//			var child = container.createChild({tag:'a', id:'infobar_'+data[i].id, style: "padding-right:20px", href: '#goto='+data[i].id, html: _html});
//			child.infodata = data[i];
			child.on('click', function(e, t){
				e.stopEvent();
				//var d = Ext.get(t).infodata;
                var d = biogps.staticpage_data.get(t.id.substring('infobar_'.length));
				Ext.History.add('goto='+d.id);
				//biogps.showInfoPage(d.id);

				//tracking by Google Analytics
                _gaq.push(['_trackPageview', '/#'+d.id]);
                _gaq.push(['_trackEvent', 'BioGPS', d.id]);

			},this);
		}
	};


	//add biogps-annouce list sign-up
	//var child = container.createChild({tag:'a', style: "padding-right:20px", href: 'javascript:void(null);', html:"Sign up for email update&nbsp;<img src='/assets/img/new.gif' alt='new' />"});
    var child = container.createChild({tag:'a', style: "padding-right:20px", href: 'javascript:void(null);', html:"Email updates"});
	child.on('click', function(evt, target) {
		biogps.subscribeGoogleGroups(evt, Ext.get(target));
	}, this);
};
	//child.on('click', function(e, t){
	//	e.stopEvent();
	//	if (!biogps.signupwin){
	//		biogps.signupwin = new Ext.Window({
	//				title:'Sign up for email updates',
	//				layout: 'fit',
	//				width: 300,
	//				//height: 200,
	//				autoHeight: true,
	//				closeAction: 'hide',
	//				stateful: false,
	//				plain: true,
	//				items: new Ext.FormPanel({
	//				    id:'signupform',
	//					labelWidth: 75,
	//					autoHeight: true,
	//					bodyStyle:'padding:5px 5px 5px 5px',
	//					border : false,
	//					items:[{
	//		                    html: '<p><img width="16" height="16" src="/assets/img/icon-info.gif" align="left" hspace="5"><label class="x-form-item label">Entering your email address below will enable us to keep you informed of significant new features as they are added to BioGPS.</label><br><br></p>',
	//		                    border: false,
	//		                    labelSeparator:''
	//						   },{
	//						   	xtype:'textfield',
	//							width: 180,
	//		                	fieldLabel: "Your email",
	//		                	id:'signupfield_email',
	//		                	vtype: 'email',
	//		                	name: 'email',
	//		                	allowBlank:false}],
	//					buttons: [{
	//					            text:'Sign up',
	//					            handler: doEmailSignUp
	//					          },{
	//					            text: 'Close',
	//					            handler: function(){
	//					            			biogps.signupwin.hide();
	//					            		 }
	//		            		 }]
	//				})
	//		});
	//	}
	//	biogps.signupwin.show(Ext.get(t))
	//	biogps.signupwin.focus();
	//	Ext.getCmp('signupfield_email').focus();
	//},this);

//	doEmailSignUp = function(){
//		   if (!(Ext.getCmp('signupfield_email').isValid())){
//	             Ext.MessageBox.show({
//	                title:'Error',
//	                msg: 'Wrong input email! Correct and try again.',
//	                buttons: Ext.Msg.OK,
//	                icon: Ext.MessageBox.ERROR
//	            });
//	            Ext.getCmp('signupform').form.reset();
//		   }
//		   else {
//		   	   biogps.signupwin.body.mask('Sign up...');
//		       Ext.getCmp('signupform').getForm().submit({
//		        url:'/biogps_announce_signup.form',
//		        method:'POST',
//		        success: function(form, action){
//		        	biogps.signupwin.body.unmask();
//		        	biogps.signupwin.body.mask('Sign-up succeeded!');
//		        	setTimeout(function(){
//		        		biogps.signupwin.body.unmask();
//		        		biogps.signupwin.hide();
//		        		}, 1000);
//		        },
//		        failure: function(form, action){
//		        	 biogps.signupwin.body.unmask();
//		        	 biogps.formfailure(action,
//		        	                    errmsg = 'Sign-up failed! Try again.',
//		        	                    onclose= function(){
//		                							Ext.getCmp('signupform').form.reset();
//		                						})
//		        }
//		 	  });
//		   }
//		};
//
//
//};

biogps.subscribeGoogleGroups = function(evt, target){
	if (biogps.subscribepanel){
		biogps.subscribepanel.destroy();
		return;
	}
    biogps.subscribepanel = new Ext.ToolTip({
            target: target,
			bodyStyle: 'background-color:white; padding: 3px 3px 5px 5px;',
            //html: '<img src="https://groups.google.com/groups/img/3nb/groups_bar.gif" height=26 width=132 alt="Google Groups"><br /><form action="http://groups.google.com/group/biogps-announce/boxsubscribe" target="_blank">Email: <input type=text name=email><button style="font-size: 8pt" type=submit name="sub">Subscribe</button></form><p style="padding-top:5px;">You don\'t need to have a google account to subscribe, any valid email is acceptable.</p>',
            //html:'<img src="https://groups.google.com/groups/img/3nb/groups_bar.gif" height=26 width=132 alt="Google Groups"><br /><p>&quot;<a href="http://groups.google.com/group/biogps-announce" target="_blank"><b>biogps-announce</b></a>&quot;: (for announcement only)</p><form action="http://groups.google.com/group/biogps-announce/boxsubscribe" target="_blank">&nbsp;&nbsp;&nbsp;&nbsp;Email:<input type=text name=email><button style="font-size: 8pt" type=submit name="sub">Subscribe</button></form><p style="padding-top:5px;">&quot;<a href="http://groups.google.com/group/biogps" target="_blank"><b>biogps</b></a>&quot;: (for Q&A, discussion, feedback, etc.)</p><form action="http://groups.google.com/group/biogps/boxsubscribe" target="_blank">&nbsp;&nbsp;&nbsp;&nbsp;Email:<input type=text name=email><button style="font-size: 8pt" type=submit name="sub">Subscribe</button></form><p style="padding-top:5px;">You don\'t need to have a google account to subscribe, any valid email is acceptable.</p>',
            html:'<img src="http://groups.google.com/groups/img/3nb/groups_bar.gif" height=26 width=132 alt="Google Groups"><p style="padding-bottom:2px"><a href="http://groups.google.com/group/biogps-announce" target="_blank"><b>biogps-announce</b></a>: (low-volume list for news and announcements)</p><form action="http://groups.google.com/group/biogps-announce/boxsubscribe" target="_blank">&nbsp;&nbsp;&nbsp;&nbsp;Email: <input type=text name=email><button style="font-size: 8pt" type=submit name="sub"> Subscribe</button></form>',
            //title: 'Subscribe to BioGPS google groups',
			mouseOffset:  [0,25],
			showDelay: 10000000000,
			trackMouse: false,
            autoHide: false,
            closable: true,
            draggable:true
        });
	biogps.subscribepanel.on('destroy', function(){biogps.subscribepanel = null;});
	biogps.subscribepanel.on('hide', function(){biogps.subscribepanel.destroy();});
    if (evt.getXY){
        //if evt is a Ext eventObject
        biogps.subscribepanel.targetXY = evt.getXY();
    }
    else{
        //evt is a dom event.
        biogps.subscribepanel.targetXY = [evt.pageX, evt.pageY];
    }
	var _x = target.getX();
	var _y = target.getY() - 120;
	biogps.subscribepanel.showAt([_x, _y]);
};

/* END OF FILE: biogps/infobar.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/loginform.js 
 */

biogps.UserManager = function(config) {
	Ext.apply(this, config);   //config should be url, convert
	biogps.UserManager.superclass.constructor.call(this);
	this.userName = null;
	this.firstName = null;
	this.lastName = null;
	this.name = null;
	//this.is_superuser = false;
	this.can_share = false;
    this.is_gnf_user = false;
    this.is_nvs_user = false;

	this.profile = {};
	this.is_anonymoususer = true;

	this.authUrl = '/auth/login/';
	this.loginbarEl = 'login-bar';
	this.loginEl = 'login';
	this.logoutEl = 'logout';
	//this.logoutUrl = '/authx/logout/?ajax=1';
    this.logoutUrl = '/authx/logout/';
	//this.registerUrl = '/auth/register/';
	this.getuserdataUrl = '/authx/getuserdata';
    this.saveprofileUrl = '/authx/saveprofile';

	this.loginwin = null;      //the window object for login dialog
	this.addEvents({authenticateduser: true});    //fired when user is logged in at the start time
	this.addEvents({anonymoususer: true});        //fired when user is not logged in at the start time
	this.addEvents({login: true});                //fired whenever a successful login is done
	this.addEvents({logout: true});               //fired whenever a successful logout is done

};

Ext.extend(biogps.UserManager, Ext.util.Observable, {
	init: function(){
		this.on('authenticateduser', function(){
			biogps.dispatcher();
		})

		this.on('anonymoususer', function(){
			this.setAnonymousUser();
			biogps.dispatcher();
		})
		this.loadSavedUserData();
	},

	setAnonymousUser: function(){
		this.userName = null;
		this.firstName = null;
		this.lastName = null;
		this.name = null;
		//this.is_superuser = false;
		this.can_share = false;
        this.is_gnf_user = false;
        this.is_nvs_user = false;
		this.profile = {};
		this.profile.defaultlayout = biogps.LayoutMgr.defaultlayout_for_anonymoususer;
		//biogps.LayoutMgr.loadAllLayout();
        biogps.LayoutMgr.loadAllLayout({layout_id: biogps.alt_defaultlayout});
		this.is_anonymoususer = true;

		this.fireEvent('logout');   //in order to trigger fn registered with this.linkWithAuthentication

//		var mystuff_link= Ext.get('mystuff-link');
//		if (mystuff_link){
//			mystuff_link.mask();
//		}
	},

	doLogin : function(){
	       Ext.getCmp('loginform').getForm().submit({
	        url:this.authUrl,
	        method:'POST',
	        success: function(form, action){
	        	afterLogin(action.result.data);
	        },
	        failure: function(form, action){
	             Ext.MessageBox.hide();
	             Ext.MessageBox.show({
	                title:'Error',
	                msg: 'Network Error! Try again.',
	                buttons: Ext.Msg.OK,
	                icon: Ext.MessageBox.ERROR
	            });
	            Ext.getBody().dom.innerHTML = action.response.responseText;
	        }
		 });
		},

	loginSuccess: function(data){
		this.is_anonymoususer = false;
		this.userName = data.username;
		this.firstName = data.firstname;
		this.lastName = data.lastname;
		this.name = data.name;
		//this.is_superuser = data.is_superuser;
		this.can_share = data.can_share || false;
        this.is_gnf_user = data.is_gnf_user || false;
        this.is_nvs_user = data.is_nvs_user || false;
		if (isString(data.profile))
			this.profile = Ext.util.JSON.decode(data.profile);
		else
			this.profile = data.profile;
		//biogps.LayoutMgr.loadAllLayout();
        biogps.LayoutMgr.loadAllLayout({layout_id: biogps.alt_defaultlayout});
		/*
        Ext.get(this.loginbarEl).dom.innerHTML = "<span>Hello! " + (this.name || this.userName) + "&nbsp;[<a id='logout' href=''>Logout</a>]</span>";
		var logout_link = Ext.get('logout');
		logout_link.on('click', function(evt){
			evt.stopEvent();
			//biogps.usrMgr.logout();
			this.logout();
		},this);*/

        //Ext.get(this.loginbarEl).update('<a id="login" href="javascript:biogps.usrMgr.showLoginWin()">Login</a>&nbsp;/&nbsp;<a href="/auth/signup" target="_blank"<b>Sign up</b></a>');
        //var user_link = String.format('<span>Hello! {0}&nbsp;/&nbsp;<a href="/auth/" target="_blank">Account</a>&nbsp;/&nbsp;<a id="logout" href="javascript:biogps.usrMgr.logout()">Logout</a></span>',
        //                              this.name || this.userName);
        var user_link = String.format('<div>Hello!&nbsp;<a href="/auth/" title="Manage your account in a new window"><span id="login_div_username">{0}</span></a>&nbsp;/&nbsp;<a id="logout" href="javascript:biogps.usrMgr.logout()">Logout</a></div>',
                                       this.firstName || this.userName);
        Ext.get(this.loginbarEl).update(user_link, false, function(){
        	//reduce font-size for long text
        	var name_el = Ext.get('login_div_username');
        	if (name_el){
        		var scale = 100;
        		while(name_el.getTextWidth()>110 && scale>70){
    				scale = scale - 1;
    				name_el.setStyle({'font-size': scale.toString()+'%'});
        		}
        	}
        });
		this.fireEvent('login');

	},

	loginFail: function(){
		Ext.MessageBox.show({
		   title:'Error',
		   msg: 'Login failed! Please try again.',
		   buttons: Ext.Msg.OK,
		   icon: Ext.MessageBox.ERROR,
		   fn:function(){
		   		var form = Ext.getCmp('loginform').form
		   		form.reset();
		   		form.items.get(0).focus();
		   }
		});
	},

	updateUserInfo: function(){

	},

	saveUserProfile: function(config){
		//config accepts showmsg, msg, callback and scope
		if (config==null)
			config = {};
		config.showmsg = (config.showmsg == null)?true:config.showmsg;
		config.msg = (config.msg == null)?'Your profile was just saved!':config.msg;
		biogps.callRemoteService({url: this.saveprofileUrl,
		                          params: {userprofile: Ext.util.JSON.encode(this.profile)},
		                          fn: function(st){
			                         	var data = st.reader.jsonData;
										if (data.success){
											if (config.showmsg)
												biogps.showmsg('', config.msg);
											if (config.callback)
												config.callback.call(config.scope || this);
										}
										else{
											biogps.showmsg('','Your profile failed to save!');
										}
			                         },
			                       method: 'POST',
			                       scope: this});

	},

	addSharedLayout: function(layout_id){
		if (!this.profile.sharedlayouts.include(layout_id)){
			this.profile.sharedlayouts.push(layout_id);
			this.saveUserProfile({msg: 'Your "shared layouts" list was updated!',
								   callback: function(){
												biogps.LayoutMgr.loadAllLayout({noEventFired:true});
											},
								   scope: this});
		}
	},

	removeSharedLayout: function(layout_id){
		if (this.profile.sharedlayouts.include(layout_id)){
			this.profile.sharedlayouts.remove(layout_id);
			this.saveUserProfile({msg: 'Your "shared layouts" list was updated!',
								   callback: function(){
												biogps.LayoutMgr.loadAllLayout({noEventFired:true});
											},
								   scope: this});
		}
	},

	logout: function(){

		var st = new Ext.data.JsonStore({
				url: this.logoutUrl,
				fields:[],
				autoLoad: true
			});
		st.on('load', function(st){
						    //biogps.updatecsrf();
							this.setAnonymousUser();
							this.setLoginLink();
							this.setWelcomeLogout();
							this.fireEvent('logout');
					  }, this);
		st.on('loadexception', biogps.ajaxfailure2, this);
	},


	loadSavedUserData: function(){
		var container  = Ext.get(this.loginbarEl);
		//container.dom.innerHtml = '';
		var loader = container.createChild({tag: 'div', cls:'loading-indicator', html:'Checking user...'});

		var st = new Ext.data.JsonStore({
				url: this.getuserdataUrl,
				fields:[],
				autoLoad: true
			});
		st.on('load', function(st){
                        loader.remove();
						var userData = st.reader.jsonData;
						if (userData.username){
							this.is_anonymoususer = false;
							this.loginSuccess(userData);
							this.fireEvent('authenticateduser');
						}
						else {
							this.setLoginLink();
							this.is_anonymoususer = true;
							this.fireEvent('anonymoususer');
						}
					  }, this);
		st.on('loadexception', biogps.ajaxfailure, this);
	},

	setLoginLink: function(){
//		this.setLoginLink_inpage();
		this.setLoginLink_newpage();
	},

	setLoginLink_newpage: function(){
//		Ext.get(this.loginbarEl).dom.innerHTML = String.format('<a id="{0}" href="https://{1}/auth/login?goto={2}" target="_top">Login</a>',
//		                                                        this.loginEl,
//		                                                        window.location.host,
//		                                                        window.location.pathname+window.location.hash);
		Ext.get(this.loginbarEl).update('<div><a id="login" href="javascript:biogps.usrMgr.gotoLoginPage()">Login here</a>&nbsp;or&nbsp;<a href="/auth/signup">Sign up</a></div>');
	},

	gotoLoginPage: function(){
//		var login_url = '/auth/login?' + Ext.urlEncode({next: window.location.pathname+window.location.hash});
//		var login_url = '/auth/login?next=' + (window.location.pathname+window.location.hash).replace('#','%23').replace('&','%26');
		//var login_url = '/auth/login?next=' + encodeURIComponent(window.location.pathname+window.location.hash);
		var login_url = '/auth/login?next=' + encodeURIComponent(window.location.href);
		window.location = login_url;
	},

	setLoginLink_inpage: function(){
        Ext.get(this.loginbarEl).update('<a id="login" href="javascript:biogps.usrMgr.showLoginWin()"><b>Login here</b></a>&nbsp;or&nbsp;<a href="/auth/signup"><b>Sign up</b></a>');
		/*Ext.get(this.loginbarEl).dom.innerHTML = '<a id="'+this.loginEl+'" href="">Login&nbsp;/&nbsp;Create Account</a>';
		var login_link = Ext.get(this.loginEl);
		login_link.on('click', function(evt){
			evt.stopEvent();
			this.showLoginWin(login_link);
		},this);*/
	},
	
	setWelcomeLogout: function(){
	    Ext.get('welcome-loggedin').update('<h4>Logged Out</h4><p>Your session has ended.<br><br><a href="/auth/login/">Login again</a></p>');
	},

    maskForAnonymous: function(args){
        var targetEl = args.targetEl;
        var msg = args.msg;     //title msg in bold
        var msg2 = args.msg2;   //more optional msg

        var _msg = "<b>"+msg+"</b>";
        _msg += "<br />Either <a href='javascript:biogps.usrMgr.gotoLoginPage()';>login</a> or <a href='/auth/signup'>create a free account</a>.<br />";
        if (msg2) _msg += "<br />"+msg2;
        targetEl.mask(_msg,'maskBox');
    },

	showLoginWin: function(targetEl){
		var _targetel = targetEl || Ext.get(this.loginEl);
		if (!this.loginwin){
			this.loginwin = new biogps.LoginWin();
		}
		this.loginwin.show(_targetel);
	},

	linkWithAuthentication: function(fn, scope){
		//link a fn to be called whenever login or logout is performed.
		this.on('login', fn, scope);
		this.on('logout',fn, scope);
	},

	unlinkWithAuthentication: function(fn, scope){
		this.un('login', fn, scope);
		this.un('logout',fn, scope);
	}
});

biogps.usrMgr = new biogps.UserManager();
/*
biogps.LoginWin = function(config) {
	Ext.apply(this, config);

	this.loginform  = new Ext.FormPanel({
	    id:'loginform',
	    title: 'Login',
		labelWidth: 75,
		autoHeight: true,
		bodyStyle:'padding:5px 5px 5px 5px',
		width: 320,
		border: false,
//		submitHandler: function(){this.doLogin()},
		items:[{
			xtype:'fieldset',
            title: 'BioGPS user account',
    		autoHeight:true,
			items:[{
					xtype:'textfield',
                	fieldLabel: "Username",
                	id:'loginfield_username',
                	name: 'username',
                	width: 210,
                	allowBlank:true
			},{
					xtype:'textfield',
					fieldLabel: "Password",
					id:'loginfield_password',
                	name: 'password',
                	width: 210,
                	inputType: "password",

                	allowBlank:false
			},{
                    xtype:'checkbox',
                    boxLabel: "Remember me on this computer.",
                    name:'remember',
                    border: false,
                    labelSeparator:''
			}]
		}],
        buttons: [{
            text:'Login',
            id: 'login_button',
            handler: function(){this.doLogin()},
            scope:this
        },{
            text: 'Close',
            handler: function(){
                this.hide();
            },
            scope: this
        }]
	});
	this.registerform = new Ext.FormPanel({
		id: 'registerform',
		title: 'Create Account',
		labelWidth: 75,
		width: 320,
		autoHeight: true,
		bodyStyle:'padding:5px 5px 5px 5px',
		border : false,
//		submitHandler: this.doRegister,
		items:[{
			xtype:'fieldset',
            title: 'New BioGPS user',
    		autoHeight:true,
    		defaults: {width: "210"},
    		defaultType: 'textfield',
			items:[{
                	fieldLabel: "Username*",
                	id:'registerfield_username',
                	name: 'username',
                	maxLength: 30,
					plugins:[Ext.ux.plugins.RemoteValidator],
					rvOptions: {
						url:'auth/checkusername/',
						method: 'POST'
					},
                	allowBlank:false
			},{
					fieldLabel: "Password*",
					id:'registerfield_password',
                	name: 'password',
                	inputType: "password",
                	allowBlank:false
			},{
					fieldLabel: "Retype password*",
					id:'registerfield_password2',
                	name: 'password2',
                	inputType: "password",
                	invalidText: 'unmatched password!',
                	validator: function(value){return(value==this.ownerCt.ownerCt.form.getValues().password);},
                	allowBlank:false
			},{
                    fieldLabel: "Email*",
                    id:'registerfield_email',
                    vtype:'email',
                    name:'email',
                    allowBlank:false
			}]
		}],
        buttons: [{
            text:'Create',
            id: 'register_button',
            handler: this.doRegister,
            scope: this
        },{
            text: 'Close',
	            handler: function(){
	                this.hide();
	            },
	            scope: this
	        }]
	});

	this.tab = new Ext.TabPanel({
		id: 'logintab',
		activeTab: 0,
		deferredRender: false,
		plain: true,
		width: 360,
		autoHeight: true,
		border: false,
		listeners: {tabchange : function(tab, evt){
								if ((tab.getActiveTab().form) && tab.getActiveTab().form.items.get(0)){
									tab.getActiveTab().form.items.get(0).focus();
								}}
					},
		//defaults:{autoHeight:true, bodyStyle:'padding:10px'},
		items: [this.loginform,
		        this.registerform]
	});

	biogps.LoginWin.superclass.constructor.call(this, {
	    title: 'BioGPS User',
		layout: 'fit',
		width: 360,
		height: 200,
		autoHeight: true,
		plain: true,
		modal: true,
		closeAction:'hide',
		listeners: {show: {buffer : 10,		// Ref:http://extjs.com/forum/showthread.php?t=43270
						   fn: function(win){
								this.loginform.form.items.get(0).focus();
								var kmap = new Ext.KeyMap(win.items.get(0).getEl(),{
									key: 13,   //Enter key
									stopEvent: true,
									fn: function(){
										var activetab = this.tab.getActiveTab().id;
										switch (activetab){
											case 'loginform':
												this.doLogin();
												break;
											case 'registerform':
												this.doRegister();
												break;
										}
									},
									scope: win});

		}}},
		items:this.tab
	});
};
Ext.extend(biogps.LoginWin, Ext.Window, {
	doLogin: function(){
			   //if (!(Ext.getCmp('loginfield_username').isValid() && Ext.getCmp('loginfield_password').isValid())){
				if (!this.loginform.form.isValid()){
		             Ext.MessageBox.show({
		                title:'Error',
		                msg: 'Wrong input! Correct and try again.',
		                buttons: Ext.Msg.OK,
		                icon: Ext.MessageBox.ERROR
		            });
			   }
			   else {
			   	   this.body.mask('Authenticating...');
			       //Ext.getCmp('loginform').getForm().submit({
			   	   this.loginform.form.submit({
			        url:biogps.usrMgr.authUrl,
			        method:'POST',
			        success: function(form, action){
			        	this.body.unmask();
			        	//afterLogin(action.result.data);
			        	var data = action.result.data;
						if (data.name != 'Bad Login'){
							this.hide();
							biogps.usrMgr.loginSuccess(data);
						}
						else {
							biogps.usrMgr.loginFail();
						}
			        },
			        failure: function(form, action){
			        	 this.body.unmask();
						 biogps.formfailure(action,
						 					'Network Error! Try again.',
						 					function(){form.reset();});
			        },
//			        failure: function(form, action){
//			        	 this.body.unmask();
//			             Ext.MessageBox.hide();
//			             Ext.MessageBox.show({
//			                title:'Error',
//			                msg: 'Network Error! Try again.',
//			                buttons: Ext.Msg.OK,
//			                icon: Ext.MessageBox.ERROR
//			            });
//			            Ext.getBody().dom.innerHTML = action.response.responseText;
//			        },
			        scope: this
    		 	  });
			   }
	},

	doRegister: function(){
	   //var rgform = Ext.getCmp('registerform').form;
	   var rgform = this.registerform.form;
	   if (!rgform.isValid()){
             Ext.MessageBox.show({
                title:'Error',
                msg: 'Wrong input! Correct and try again.',
                buttons: Ext.Msg.OK,
                icon: Ext.MessageBox.ERROR
            });
            //rgform.reset();
	   }
	   else {
	   	   this.body.mask('Submitting your application...');
	       rgform.submit({
		        url:biogps.usrMgr.registerUrl,
		        method:'POST',
		        success: function(form, action){
	    		         this.body.unmask();
	    		         var _tab = this.tab;
	    		         var _loginform = this.loginform;
			             Ext.MessageBox.show({
			                title:'Success',
			                msg: String.format('User account for "{0}" has been created successfully.<br>Try login using your new account.', action.result.username),
			                buttons: Ext.Msg.OK,
			                fn: function(value){if (value=='ok'){
			                						form.reset();
    												_tab.setActiveTab(_loginform);
			                					}},
			                icon: Ext.MessageBox.INFO
			             });
		        },
		        failure: function(form, action){
		        	 this.body.unmask();
					 biogps.formfailure(action,
					 					String.format('User account for "{0}" failed to create. Try again please.', action.result.username),
					 					function(){form.reset();});
		        },
		        scope: this
	 	  });
	   }
	}
});
*/

biogps.LoginWin = function(config) {
	Ext.apply(this, config);

	this.loginform  = new Ext.FormPanel({
	    id:'loginform',
	    //title: 'Login',
		labelWidth: 75,
		autoHeight: true,
		bodyStyle:'padding:5px 5px 5px 5px',
		width: 320,
		border: false,
        plain:true,
		items:[{
			xtype:'fieldset',
            title: 'BioGPS user account',
    		autoHeight:true,
			items:[{
					xtype:'textfield',
                	fieldLabel: "Username",
                	id:'loginfield_username',
                	name: 'username',
                	width: 210,
                	allowBlank:true
			},{
					xtype:'textfield',
					fieldLabel: "Password",
					id:'loginfield_password',
                	name: 'password',
                	width: 210,
                	inputType: "password",

                	allowBlank:false
			},{
                    xtype:'checkbox',
                    boxLabel: "Remember me on this computer.",
                    name:'remember',
                    border: false,
                    labelSeparator:''
			}]
		}],
        buttons: [{
            text:'Login',
            id: 'login_button',
            handler: function(){this.doLogin()},
            scope:this
        },{
            text: 'Close',
            handler: function(){
                this.hide();
            },
            scope: this
        }]
	});

	biogps.LoginWin.superclass.constructor.call(this, {
	    title: 'User login',
		layout: 'fit',
		width: 360,
		height: 200,
		autoHeight: true,
		plain: true,
		modal: true,
        stateful: false,
		closeAction:'hide',
		listeners: {show: {buffer : 10,		// Ref:http://extjs.com/forum/showthread.php?t=43270
						   fn: function(win){
								this.loginform.form.items.get(0).focus();
								var kmap = new Ext.KeyMap(win.items.get(0).getEl(),{
									key: 13,   //Enter key
									stopEvent: true,
									fn: function(){
												this.doLogin();
									},
									scope: win});

		}}},
		items:[this.loginform]
	});
};
Ext.extend(biogps.LoginWin, Ext.Window, {
	doLogin: function(){
			   //if (!(Ext.getCmp('loginfield_username').isValid() && Ext.getCmp('loginfield_password').isValid())){
				if (!this.loginform.form.isValid()){
		             Ext.MessageBox.show({
		                title:'Error',
		                msg: 'Wrong input! Correct and try again.',
		                buttons: Ext.Msg.OK,
		                icon: Ext.MessageBox.ERROR
		            });
			   }
			   else {
			   	   this.body.mask('Authenticating...');
			       //Ext.getCmp('loginform').getForm().submit({
			   	   this.loginform.form.submit({
			        url:biogps.usrMgr.authUrl,
			        method:'POST',
			        success: function(form, action){
			        	//biogps.updatecsrf();
			        	this.body.unmask();
			        	//afterLogin(action.result.data);
			        	var data = action.result.data;
						if (data.name != 'Bad Login'){
							this.hide();
							biogps.usrMgr.loginSuccess(data);
						}
						else {
							biogps.usrMgr.loginFail();
						}
			        },
			        failure: function(form, action){
			        	 this.body.unmask();
						 biogps.formfailure(action,
						 					'Network Error! Try again.',
						 					function(){form.reset();});
			        },
			        scope: this
    		 	  });
			   }
	}
});

/* END OF FILE: biogps/loginform.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/biogpslayout.js 
 */

biogps.Layout = function(config) {
	this.id = '';
	this.layout_name = '';
	this.author ='';
	this.description = '';
	this.created = '';
	this.lastmodified = '';
	this.layout_data = [];

	Ext.apply(this, config);
	biogps.Layout.superclass.constructor.call(this);
	this.addEvents({beforeload: true,
					load: true,
					loadfailed: true,
					saved: true,
					savefailed: true,
					'delete':  true,
				    deletefailed: true,
				    pluginadded: true,
				    pluginaddfailed: true
					});

    this.layout_modified = false;         // a flag to indicate layout_data is modified and un-saved.

};
Ext.extend(biogps.Layout, Ext.util.Observable, {
	load: function(id, loadplugin){
		//load layout object from remote service
		id = id || this.id;
		loadplugin = loadplugin?1:0;
		if (id){
			this.fireEvent('beforeload');
			biogps.callRemoteService({url: String.format('/layout/{0}/?loadplugin={1}', id, loadplugin),
			                         fn: function(st){
											if (st.reader.jsonData.totalCount != 1){
				                         		this.fireEvent('loadfailed', id);
				                         	}
				                         	else{
												var layout = st.reader.jsonData.items[0].fields;
												layout.id = st.reader.jsonData.items[0].pk;
												if (isString(layout.layout_data))
													layout.layout_data = Ext.util.JSON.decode(layout.layout_data);

					                         	Ext.apply(this, layout);
					                         	this.fireEvent('load');
				                         	}
			                         	},
			                         scope:this});
		}
	},



	isMyLayout: function(){
		return !this.isSharedLayout();
	},

	isSharedLayout: function(){
		return (this.is_shared == true);
	},

	isDefault: function(){
		return (this.layout_id == biogps.usrMgr.profile.defaultlayout);
	},

	save: function(){
		var params = {layout_id: this.id,
				  layout_name: this.layout_name,
				  description: this.description,
		          layout_data: Ext.util.JSON.encode(this.layout_data)};
		var st = new Ext.data.JsonStore({
				url: '/layout/update/',
				baseParams: params,
				method: 'POST',
				fields:[],
				autoLoad: true
			});
		st.on('load', function(){
			var data = st.reader.jsonData;
			if (data.success){
				this.fireEvent('saved', data);
			}
			else{
				this.fireEvent('savefailed', data);
			}

		}, this);
		st.on('loadexception', biogps.ajaxfailure, this);
	},

	saveas:function(newname){
		var params = {layout_name: newname || this.layout_name,
				  description: this.description,
		          layout_data: Ext.util.JSON.encode(this.layout_data)};
		var st = new Ext.data.JsonStore({
				url: '/layout/add/',
				baseParams: params,
				method: 'POST',
				fields:[],
				autoLoad: true
			});
		st.on('load', function(){
			var data = st.reader.jsonData;
			if (data.success){
				this.fireEvent('saved', data);
			}
			else{
				this.fireEvent('savefailed', data);
			}

		}, this);
		st.on('loadexception', biogps.ajaxfailure, this);
	},

	'delete': function(){
		var st = new Ext.data.JsonStore({
				url: '/layout/delete/',
				baseParams: {'layout_id': this.id},
				method: 'POST',
				fields:[],
				autoLoad: true
			});
		st.on('load', function(st){
				var data = st.reader.jsonData;
				if (data.success){
					this.fireEvent('deleted', this);
				}
				else{
					this.fireEvent('deletefailed', data);
				}
			},this);
		st.on('loadexception', biogps.ajaxfailure, this);
	},

	addPlugin: function(plugin){
		if(isArray(this.layout_data)){
			this.layout_data.push({id: plugin.id});
		}
		this.on('saved', function(){
			this.fireEvent('pluginadded');
		},this);
		this.on('savefailed', function(){
			this.fireEvent('pluginaddfailed');
		},this);
		this.save();
	},

	/**
	 * Adds the given plugin to the in-memory copy of this layout, and tells
	 * the GeneReportMgr to update the rendered version.
	 * @method
	 * @param {object} plugin biogps.Plugin object to add to this layout
	 */
	quickAddPlugin: function(plugin){
        // Pick some default coordinates appropriate for 1024x768 or larger screens
	    var top = Math.round(Math.random()*225),
	        left = Math.round(Math.random()*400),
    	    // Extract only the plugin properties we need for the layout_data.
	        new_plugin = {
    	        id: plugin.id,
    	        author: plugin.author,
    	        title: plugin.title,
    	        url: plugin.url,
    	        type: plugin.type,
    	        options: plugin.options,
    	        description: plugin.description,
    	        lastmodified: plugin.lastmodified,
    	        top: top,
    	        left: left,
    	        // Assign the default H/W or else the coords above will be ignored
    	        width: 350,
    	        height: 250
    	    };

	    if(isArray(this.layout_data)){
	        // Push the new object onto the layout
	        this.layout_data.push(new_plugin);
	    }
        this.layout_modified = true;
	    biogps.GeneReportMgr.updateAll();
	}

});

biogps.LayoutMgr = function(config) {
	this.currentLayout = null;
	this.availableLayouts = null;
	this.currentLayoutLoaded = false;
	this.availableLayoutsLoaded = false;
	this.layoutloading = false          //use to indicate the layout is currently loading

	this.layoutchanged = false;         //use to mark layout data are changed externally, so that loadAllLayout need to be called.
	//this.layoutmenu_need_sync = false;  //move this to genereportpage
	this.defaultlayout_for_anonymoususer = 83;

	this.addEvents({currentlayoutloaded: true});
	this.addEvents({currentlayoutloadingfailed: true});
	this.addEvents({availablelayoutupdated:true});
	this.addEvents({layoutloaded:true});    //fire when both currentLayout and availableLayouts are loaded

	//this.on('layoutloaded', function(){biogps.GeneReportMgr.refreshAll();});

};
Ext.extend(biogps.LayoutMgr, Ext.util.Observable, {
	loadLayout: function(layoutid){
		var layout = new biogps.Layout({id:layoutid});
		layout.on('load', function(){
			this.currentLayout=layout;
			this.currentLayoutLoaded = true;
			this.fireEvent('currentlayoutloaded');
		},this);
		layout.on('loadfailed', function(layout_id){
		/*
        	Ext.MessageBox.show({ title: 'Layout loading failed',
				  msg: String.format('The layout you are loading (ID: {0}) is not available for you, either you have deleted it already or you don\'t have the privilege to access it.<br /><br />Click "OK" to use the first available Layout instead.', layout_id),
//				  msg: String.format('The default layout you are loading (ID: {0}) is not available for you, either you have deleted it already or you don\'t have the privilege to access it.', layout_id),
				  buttons: Ext.Msg.OK,
				  icon: Ext.MessageBox.ERROR,
				  fn: function(){
        			  layout.load('first', loadplugin=true);
        			}
        	}); */
			//Bypassing the error-handling here, it will be handled by biogps.GeneReportPage later
			this.currentLayoutLoaded = true;
			this.fireEvent('currentlayoutloaded');
        	//this.fireEvent('currentlayoutloadingfailed', layoutid);

		}, this);
		this.currentLayoutLoaded = false;
		//layout.load(layoutid, loadplugin=true);
        layout.load(layoutid, true);
	},

	loadAvailableLayout: function(){
		//load available layouts for current user
	    var st = new Ext.data.Store({
	        proxy: new Ext.data.HttpProxy({
				//url: '/layout/all/',
				url: '/layoutlist/all/?userselected=1',
	            method: 'GET'
	        }),
			autoload: true,
	        reader: new Ext.data.JsonReader({
				id: 'pk',
				root: 'items',   //needed for '/layoutlist/all'
				fields: [{name: 'layout_name', mapping: 'fields.layout_name', type: "string"},
						 {name: 'layout_data', mapping: 'fields.layout_data'},
	                     {name: 'author', mapping: 'fields.author', type: "string"},
	                     {name: 'description', mapping: 'fields.description', type: "string"},
	                     {name: 'is_shared', mapping: 'fields.is_shared', type: "boolean"},
	                     {name: 'lastmodified', mapping: 'fields.lastmodified', type: "date", dateFormat: 'Y-m-d H:i:s'},
	                     {name: 'created', mapping: 'fields.created', type: "date", dateFormat: 'Y-m-d H:i:s'}]
	        })
	    });

		st.setDefaultSort('layout_name', 'desc')
		st.on('load', function(st){
			var availableLayouts = [];
			var _layout;
			for (var i=0; i<st.getCount();i++){
				_layout = new biogps.Layout(st.getAt(i).data);
				if(isString(_layout.layout_data))
					_layout.layout_data = Ext.decode(_layout.layout_data);
				availableLayouts.push(_layout);
				availableLayouts[i].id = st.getAt(i).id;
			}
			this.availableLayouts = availableLayouts;
			this.availableLayoutsLoaded = true;
			//this.layoutmenu_need_sync = true;
			//biogps.GeneReportMgr.refreshAll();
			this.fireEvent('availablelayoutupdated');


//			if ((this.availableLayouts != null) && (this.currentLayout != null))
//				this.fireEvent('layoutloaded');
			}, this);
		st.on('loadexception', biogps.ajaxfailure, this);
		this.availableLayoutsLoaded = false;
		st.load();
	},

	//loadAllLayout: function(current_layout_id, noEventFired){
	loadAllLayout: function(args){
	   //args supports layout_id and noEventFired
	   if (args && args.layout_id)
			var current_layout_id = args.layout_id
	   else
	        var current_layout_id = biogps.usrMgr.profile.defaultlayout;
	   this.layoutloading = true;
		this.on('currentlayoutloaded', function(){
			if (this.availableLayoutsLoaded){
				this.layoutchanged = false;
				this.layoutloading = false;
				if (!(args && args.noEventFired))
					this.fireEvent('layoutloaded');
			}
			biogps.clearListeners(this, 'currentlayoutloaded');
		},this)
		this.on('availablelayoutupdated', function(){
			if (this.currentLayoutLoaded){
				this.layoutchanged = false;
				this.layoutloading = false;
				if (!(args && args.noEventFired))
					this.fireEvent('layoutloaded');
			}
			biogps.clearListeners(this, 'availablelayoutupdated');
		},this)

		this.loadLayout(current_layout_id);
		this.loadAvailableLayout();
	},

    reloadAvailableLayout: function(){
        var fn = function(){
            biogps.GeneReportMgr.markLayoutChanged();
            this.un('availablelayoutupdated', fn);
        };
        this.on('availablelayoutupdated', fn, this);
        this.loadAvailableLayout();
    },

	createNewLayout: function(){

	}
});
biogps.LayoutMgr = new biogps.LayoutMgr();

/* END OF FILE: biogps/biogpslayout.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/biogpsplugin.js 
 */

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
        biogps.callRemoteService({url: '/service/getgeneidentifiers/?format=json&geneid=' + (id || this.id),
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
    this.type = 'iframe';   //default to iframe type
    this.description = '';
    this.options = {};
        //possible option values:
        //  speciesOnly: 'human'   //for some plugin only relevant to one species
        //  allowedSpecies: ['mouse']  //for some plugin only relevant to a subset of available species
        //  securityAware: 'true'   //for some plugin need to be passed with sessionid for security validation
    this.useroptions=null;
        //useroptions allow users customize the behavior of the plugin in their layouts if possible.
    this.runtimeoptions=null;
        //runtimeoptions allow user change behavior of plugin rendering (e.g. speceisOnly parameter) at runtime, but it won't be saved.
    this.permission = null;
    this.lastmodified = '';
    this.tags='';
    this.usage_percent = {};

    this.left;
    this.top;
    this.width;
    this.height;

    this.separator = '+';     // the separator used in url to separate multiple identifiers

    Ext.apply(this, config);
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

    load: function(id){
        //load plugin from remote service
        //fire load event when success
        biogps.callRemoteService({url: '/plugin/' + (id || this.id)+'/',
                                  fn: function(st){
                                        var data = st.reader.jsonData;
                                        if (data.totalCount == 1){
                                            this.id = data.items[0].pk;
                                            this.title = data.items[0].fields.title;
                                            this.url = data.items[0].fields.url;
                                            this.author = data.items[0].fields.author;
                                            this.type = data.items[0].fields.type;
                                            this.description = data.items[0].fields.description;
                                            if (isString(data.items[0].fields.options)) {
                                                if (data.items[0].fields.options != '')
                                                    this.options = Ext.util.JSON.decode(data.items[0].fields.options);
                                            }
                                            else {
                                                this.options = data.items[0].fields.options;
                                            }
                                            this.permission = data.items[0].fields.permission;
                                            //this.rolepermission = data.items[0].fields.permission.R;
                                            this.lastmodified = data.items[0].fields.lastmodified;
                                            this.created = data.items[0].fields.created;
                                            this.tags = data.items[0].fields.tags;
                                            this.is_shared = data.items[0].fields.is_shared;
                                            this.usage_percent = data.items[0].fields.usage_percent;

                                            this.fireEvent('load', this);
                                        }
                                       },
                                   scope: this});
    },

    getKeywords: function(url){
        url = url || this.url;
        if (url){
            var kwd_list = url.match(/(\{\{[\w|]+\}\})/g);
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
                            _kwd.split('|').each(function(k){
                                    k = k.trim();
                                    if (current_gene[k]){
                                        var value = current_gene[k];
                                        if (isArray(value))
                                            value = value.join(this.separator);
                                        _url = _url.replace(kwd, value);
                                    }
                            }, this);
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
                    if (all_kwd_list.indexOf(item.trim()) == -1)
                        valid = false;
                        errmsg = String.format('Un-recognized keyword: "{0}".', item);
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
        //return true if this plugin is only available for one species
        return (this.options.allowedSpecies != null && this.options.allowedSpecies.length == 1);
    },

    getAllowedSpecies: function(applyuseroptions){
        var allowedspecies = this.options.allowedSpecies?this.options.allowedSpecies:biogps.AVAILABLE_SPECIES;
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
            species = available_species_list[0];
        }
        return species;
    },

    /**
     * Return allowed species based on the keyword used in URL template. E.g. "MGI" is a mouse-only keyword.
     * Returns null is all species is allowed.
     * This should be called on a validate url.
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

    formatPermission: function(){
        //return biogps.formatPermision(this.rolepermission);
        return biogps.formatPermision(this.permission?this.permission.R:null);
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
                    url:String.format('/plugin/{0}/flag/', this.id),
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


/* END OF FILE: biogps/biogpsplugin.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/pluginpanel.js 
 */

// pluginpanel.js
// Authors: Marc Leglise (mleglise@gnf.org)
//          Chunlei Wu (cwu@gnf.org)
// Created: Dec 11, 2008

// Provides the rendering for the BioGPS Plugin Library.
//
// The library is first loaded by 'biogps.renderPluginBrowsePanel()' from
// biogps_base.js which takes the following actions:
//   - If not present, creates the "Plugin Library" tab with the 'fit' layout.
//   - Sets the tab as the active item.
//   - If this is the first time loading, or a refresh is forced:
//      - Loads '/plugin/browse' via AJAX into the panel.
//         The method is provided by 'pluginbrowser()' in plugin.py
//         The HTML template used is templates/pluginlibrary.html
//      - Calls "initLibrary();" to load the main view.
//
// The library is rendered as a large container panel "pluginlibrary_card" with
// the following contents:
//   - tbar: Breadcrumb navigation, always visible.
//   - library-header: Logo image and intro blurb.
//   - library-search: Search box with Advanced options.
//   - library-add: Form to create a new plugin.
//   - library-home: Front page shown on initial load.
//   - library-browse: Search results / category browsing page.
//   - library-plugin: Single plugin large display with preview iframe.
//   - library-edit: Form to edit an existing plugin.
//   - bbar: PagingToolbar shown only with the browse page.
//
// We track the usage of this interface by making calls to Google Analytics'
// trackPageview function.  The pages follow the below URL structure:
//      /pluginlibrary/
//      /pluginlibrary/browse/
//      /pluginlibrary/search/?query=[term]
//      /pluginlibrary/plugin/[id]
//      /pluginlibrary/edit/[id]
//      /pluginlibrary/edit/preview/
//      /pluginlibrary/edit/save/
//      /pluginlibrary/edit/cancel/
//      /pluginlibrary/edit/delete/
//      /pluginlibrary/add/


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
    //var tab_container = Ext.getCmp('center_panel');
    var container_id = 'pluginbrowse_panel';
    var container = biogps.centerTab.getItem(container_id);
    var is_new_container = false;
    if (!container) {
        container = biogps.centerTab.add({ title:'Plugin Library',
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
        });
        is_new_container = true;
    }


    biogps.centerTab.suspendEvents();    //avoid to fire "tabchange" event again.
    biogps.centerTab.setActiveTab(container);
    biogps.centerTab.resumeEvents();

    if (is_new_container || forcerefresh) {
        // Mask the whole tab to cover up the "flashing effect" in ticket #390
        var libMask = new Ext.LoadMask(biogps.centerTab.body, {
                            msg:"Loading Plugin Library...",
                            removeMask:true
                        });
        libMask.show();

        // Load the HTML content & initialize the library
        container.load({url:'/plugin/browse',
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
};

///////////////////////////////////////////////////////////////////////////////
// PLUGIN LIBRARY OBJECT
///////////////////////////////////////////////////////////////////////////////

// The PluginLibrary object is the primary holder of functions relevant to the
// display of the various library pages.
biogps.PluginLibrary = function(config) {
    this.id = '';
    this.currentItem = 'library-home'; // Used for creating the history hash.
    this.mask = new Ext.LoadMask('pluginbrowse_panel', {msg:"Loading plugin data..."});
    this.mask.show();
    Ext.apply(this, config);
    biogps.currentLibrary = this;

    // Call the constructor for Ext.Panel.
    biogps.PluginLibrary.superclass.constructor.call(this);
};

Ext.extend(biogps.PluginLibrary, Ext.Panel, {
    /////////////////////////////////////////////
    // Navigation Functions
    /////////////////////////////////////////////

    // setActiveItem
    // Toggles the visibility of different panels and navigation buttons
    // appropriately to simulate changing between pages.
    //   Param item: string of the name of the page we want to show.
    //      ex: library-add, library-browse, library-plugin, library-home
    //   Param from: string of the source of the function call.
    //      ex: breadcrumb, library-home, library-browse, library-search, delete
    setActiveItem: function(item, from) {
        // Look up all of the panels to save on the overhead below.
        var panel_add = Ext.getCmp('library-add');
        var panel_browse = Ext.getCmp('library-browse');
        var panel_plugin = Ext.getCmp('library-plugin');
        var panel_header = Ext.getCmp('library-header');
        var panel_search = Ext.getCmp('library-search');
        var panel_home = Ext.getCmp('library-home');
        var panel_edit = Ext.getCmp('library-edit');

        var btn_home = Ext.getCmp('btn-library-home');
        var btn_browse = Ext.getCmp('btn-library-browse');
        var btn_plugin = Ext.getCmp('btn-library-plugin');
        var btn_edit = Ext.getCmp('btn-library-edit');
        var btn_add = Ext.getCmp('btn-library-add');

        // Hide all of the main panels
        panel_home.hide();
        panel_browse.hide();
        panel_plugin.hide();
        panel_edit.hide();
        panel_add.hide();

        // Unbold all of the breadcrumbs.
        btn_home.removeClass('activeBreadcrumb');
        btn_browse.removeClass('activeBreadcrumb');
        btn_plugin.removeClass('activeBreadcrumb');
        btn_edit.removeClass('activeBreadcrumb');
        btn_add.removeClass('activeBreadcrumb');

        // If we're going 'home'...
        //   Show the header panel.
        //   Hide the buttons for plugin and edit if we just did a delete.
        if (item == 'library-home') {
            panel_header.show();
            if(from == 'delete') {
                btn_plugin.hide();
                btn_edit.hide();
            }
        }
        else {
            panel_header.hide();
        }

        // If we're going to 'browse'...
        //   Show the nav toolbar & button.
        //   Hide the 'plugin' breadcrumb. (Requested by asu on 2/5/09)
        if (item == 'library-browse') {
            Ext.getCmp('library-browse-nav').show();
            btn_browse.show();
            if(from != "breadcrumb") {
                btn_plugin.hide();
                btn_edit.hide();
            }
        }
        else {
            Ext.getCmp('library-browse-nav').hide();
        }

        // If we're going to 'plugin'...
        //   Show the button.
        //   Hide the 'browse' breadcrumb if we're coming from 'home'.
        //   Hide the 'edit' breadcrumb unless we're coming from breadcrumb.
        if (item == 'library-plugin') {
            btn_plugin.show();
            if(from == 'library-home') {
                btn_browse.hide();
            }
            if(from != 'breadcrumb') {
                btn_edit.hide();
            }
        }

        // If we're going to 'edit'...
        //   Show the button.
        if (item == 'library-edit') {
            btn_edit.show();
        }

        // If we're going to 'add' or 'edit'...
        //   Hide the search panel.
        if (item == 'library-add' || item == 'library-edit') {
            Ext.getCmp('library-search').hide();
        }
        else {
            Ext.getCmp('library-search').show();
        }

        // If the user is not logged in...
        if (item == 'library-add' && biogps.usrMgr.is_anonymoususer) {
            // Mask the add plugin form.
            // While it conceptually makes sense to only do this once, we need
            // to do it after the panel is rendered for IE6 to work.
           panel_add.on('show', function(){
               biogps.usrMgr.maskForAnonymous({targetEl: panel_add.body,
                                               msg: "You must be logged in to add a plugin.",
                                               msg2: "Or you can go <a href='javascript:navHandler(\"home\");'>back to the Library</a>."});
           },this);
        }

        // Show the panel we want.
        Ext.getCmp(item).show();

        // Bold the active breadcrumb button.
        var btnName = 'btn-' + item;
        Ext.getCmp(btnName).addClass('activeBreadcrumb');

        this.currentItem = item;
        this.hash_history();

        // Fix the height of the panel in case we've changed the visible state
        // of the bottom toolbar.
        this.setSize();
        this.ownerCt.doLayout(true);

        this.libDone();

        // Show that we have successfully finished.
        return true;
    },

    // Sets the library display to show a loading indicator only.
    // Gets overridden by later calls to setActiveItem.
    libLoading: function() { this.mask.show(); },

    libDone: function() { this.mask.hide(); },

    // hash_history
    // Creates a token representing the current state of the plugin library
    // and saves it to Ext's History to enable back-button navigation.
    hash_history: function() {
        // Craft a token string to pass into Ext.History. It should only
        // contain enough info to describe the currently open tab, not the
        // state of the entire library.
        var token = 'goto=pluginlibrary&t=' + this.currentItem;
        if ((this.currentItem == 'library-plugin' ||
             this.currentItem == 'library-edit') && this.plugin) {
            token = token + '&p=' + this.plugin.id;
        }
        else if (this.currentItem == 'library-browse') {
            // Below we create a params object to be passed through Ext.urlEncode().
            // While this is effectively the same as passing
            // biogps.pluginStore.lastOptions.params into urlEncode, we need to
            // ensure the parameter ordering is always the same, to keep the
            // history hash working correctly.  The ordering used here must be
            // kept the same as the ordering in dispatcher_by_params() below.
            var params = {
                sort: biogps.pluginStore.lastOptions.params.sort,
                start: biogps.pluginStore.lastOptions.params.start,
                limit: biogps.pluginStore.lastOptions.params.limit,
                scope: biogps.pluginStore.lastOptions.params.scope,
                dir: biogps.pluginStore.lastOptions.params.dir
            };
            if (biogps.pluginStore.lastOptions.params.search) {
                params.search = biogps.pluginStore.lastOptions.params.search; }
            else if (biogps.pluginStore.lastOptions.params.tags) {
                params.tags = biogps.pluginStore.lastOptions.params.tags; }

            token = token + '&' + Ext.urlEncode(params);
        }

        // Avoid firing the "tabchange" or Ext.History "change" events.
        Ext.History.suspendEvents();
        biogps.centerTab.suspendEvents();

        // Add the token to the history.  The second param signals the History
        // to ensure it is not duplicating the history token.
        Ext.History.add(token, true);
        biogps.setTitle('pluginlibrary');   //This might be a temp solution to put setTitle here.
                                            //Later we should make title reflect the actual content in the plugin panel.

        // We need to delay the resuming of Ext.History's events for longer
        // than 50 msec, because Ext.History.startUp() creates an unnamed
        // method that is called on a setInterval that compares the current
        // hash with the one known in memory.  If they are different, which
        // they are, briefly, after we add the new token, then it calls
        // Ext.History.handleChangeState(hash), which fires the 'change' event.
        //
        // Our behavior here is a workaround that prevents the 'change' event
        // from propagating up the system, but only long enough for that check
        // to occur, resetting the hash known in memory.  Our expectation is
        // that the call to hash_history() happens after we have already made
        // the changes to the currentLibrary that we want to have reflected in
        // the hash, rather than using the hash change to drive the
        // currentLibrary change.
        setTimeout("Ext.History.resumeEvents()", 60);
        biogps.centerTab.resumeEvents();
    },

    // dispatcher_by_params
    // Handles the back-button navigation to restore the plugin library to
    // a previous state.
    //   Param params: Object passed by Ext.urlDecode(hash) from biogps_base.js
    //     Found in function biogps.dispatcher_by_hash().
    dispatcher_by_params: function(params) {
        // Process the 't' param for the high-level tab to show.
        if (params['t']) {
            // If we're going to the plugin page...
            if (params['t'] == 'library-plugin' || params['t'] == 'library-edit') {
                // If a plugin ID was in the hash...
                if (params['p']) {
                    // If 'p' doesn't match the currently loaded plugin...
                    if (!(this.plugin && params['p'] == this.plugin.id)) {
                        // Render the plugin page, even if we're going to edit.
                        // This only affects the deep-linking, preventing users
                        // from deep-linking into the editing page.
                        this.renderPluginById(params['p'],'history');
                    }
                    else {
                        this.setActiveItem(params['t'],'history');
                    }
                }
            }
            else if (params['t'] == 'library-browse') {
                var conf = { params: {
                    sort: params['sort'],
                    start: params['start'],
                    limit: params['limit'],
                    scope: params['scope'],
                    dir: params['dir']
                }};
                if (params['search']) {
                    conf.params.search = params['search']; }
                else if (params['tags']) {
                    conf.params.tags = params['tags']; }

                biogps.pluginStore.load(conf);
                this.setActiveItem(params['t'],'history');
            }
            else {
                this.setActiveItem(params['t'],'history');
            }
        }
        else {
            // Although the below will not change the display at all, it will
            // trigger the history call that will put 'library-home' into the
            // history hash.
            this.setActiveItem('library-home','history');
        }
    },

    // setBrowseTitle
    // Changes the text of the breadcrumb button for the "browse" page.
    //   Param newTitle: string of the new title for the button.
    setBrowseTitle: function(newTitle) {
        var title = newTitle + " &nbsp; &raquo;";
        Ext.getCmp('btn-library-browse').setText(title);
        Ext.getCmp('library-browse').setTitle(newTitle);
    },

    // setPluginTitle
    // Changes the text of the breadcrumb button for the "plugin" page.
    //   Param newTitle: string of the new title for the button.
    setPluginTitle: function(newTitle) {
        var title = newTitle;
        Ext.getCmp('btn-library-plugin').setText(title);
    },

    // setPluginEditTitle
    // Changes the text of the breadcrumb button for the "plugin" page.
    //   Param newTitle: string of the new title for the button.
    setPluginEditTitle: function(newTitle) {
        var title = "&raquo; &nbsp; Edit " + newTitle;
        Ext.getCmp('btn-library-edit').setText(title);
    },





    /////////////////////////////////////////////
    // Plugin Loading and Rendering
    /////////////////////////////////////////////

    // queryPlugins
    // Loads a list of plugins that match the query params.
    queryPlugins: function(evt) {
        if (evt)
            evt.cancelBubble=true;

        // Retrieve the form values as an object.
        var form = Ext.getCmp('library-search').getForm().getValues();
        var query = form.query.trim();
        var scope = null;

        // Only move forward if a query was given.
        if (query && query != 'Search the Plugin Library') {
            // Figure out the scope of the search.
            // Commented out on 7/16/09.  Uncomment when we re-enable Advanced Search.
        /*    if (form.scope_my && form.scope_shared)
                scope = 'all';
            else if (form.scope_my)
                scope = 'my';
            else
                scope = 'shared';
        */

            // Hard code the scope until we re-enable the Advanced Search panel
            scope = 'all';

            // Set up the params object.
            var conf = { params: {
                search: query,
                scope: scope
            }};

            // Call the AJAX loading of the information & toggle the view.
            biogps.pluginStore.load(conf);
            this.setActiveItem('library-browse','library-home');
            _gaq.push(['_trackPageview', '/pluginlibrary/search/?query=' + query]);
        }

        return false;
    },

    // browsePluginsBy
    // Loads the browse page and a list of plugins sorted by the parameter.
    // This function is called from multiple links on the home page.
    //   Param sort_by: string of which parameter to sort by.
    //   Param from: string of the source of the function call.
    browsePluginsBy: function(sort_by, from) {
        if (sort_by) {
            // Set up the params object.
            var conf = { params: { sort: sort_by }};

            // Call the AJAX loading of the information & toggle the view.
            biogps.pluginStore.load(conf);
            this.setActiveItem('library-browse',from);
            _gaq.push(['_trackPageview', '/pluginlibrary/browse/']);
        }
    },

    // browsePluginsByTag
    // Loads the browse page and a list of plugins tagged with the given string.
    // This function is called from multiple links on the home page.
    //   Param tag: string of which tag to filter by.
    //   Param from: string of the source of the function call.
    browsePluginsByTag: function(tag, from) {
        if (tag) {
            // Set up the params object.
            var conf = { params: { tags: tag }};

            // Call the AJAX loading of the information & toggle the view.
            biogps.pluginStore.load(conf);
            this.setActiveItem('library-browse',from);
            _gaq.push(['_trackPageview', '/pluginlibrary/search/?tag=' + query]);
        }
    },

    // sortPluginList
    // Assuming an already loaded list of plugins on the browse page, this
    // reuses the last conf sent to the pluginStore, but redoes the ordering.
    //   Param sort_by: string of which parameter to sort by.
    //   Param dir: direction of sorting (ASC or DESC).
    sortPluginList: function(sortby, dir) {
        if (sortby && dir) {
            var conf = biogps.pluginStore.lastOptions;
            conf.params.sort = sortby;
            conf.params.dir = dir;
            biogps.pluginStore.load(conf);
        }
    },

    /**
    * renderPluginById
    * @method
    * @param {integer} plugin_id The integer ID of the plugin.
    * @param {string} from the source of the function call.
    * Loads a single, specific plugin by its ID (via JSON) and renders it into
    * the library-plugin panel.  Then it changes the breadcrumb link name and
    * toggles the view.
    */
    renderPluginById: function(plugin_id, from) {
        var p, postGeneLoad, postPluginLoad, postLoad, gene_loaded, plugin_loaded;
        gene_loaded = plugin_loaded = false;

        if (plugin_id) {

            postGeneLoad = function() {
                gene_loaded = true;
                postLoad.call(this);
            };

            postPluginLoad = function(p) {
                plugin_loaded = true;
                //postLoad.call(this);
                biogps.loadSampleGene({
                    species: (p.options&&p.options.allowedSpecies&&Ext.isArray(p.options.allowedSpecies))?p.options.allowedSpecies[0]:null,
                    callback: postGeneLoad,
                    scope: this
                });

            };

            // Post-load function
            //  Handle all processing and display
            postLoad = function() {
                if (gene_loaded && plugin_loaded) {
                    // Set this object to a retrievable place for use with layouts.
                    this.plugin = p;

                    // Get the large template with this plugin's values inside.
                    markup = this.markupPluginTemplate(p,'large');

                    // Update the plugin page with the markup.
                    Ext.getCmp('library-plugin').el.update(markup);

                    // If the user is logged in, add a few extras.
                    if (!biogps.usrMgr.is_anonymoususer) {
                        // Create the 'Add to Layout' button.
                        var btn = new Ext.Button({
                            text:'&nbsp; Add to my Layout &nbsp;',
                            handler: this.showAddToLayoutMenu,
                            applyTo: 'plugin-add-to-layout',
                            scale: 'medium',
                            cls: 'add-to-layout-btn',
                            //iconCls: 'icon-add',
                            scope: this
                        });

                        // Create the 'Flag Inappropriate' button.
                        var flag_el = Ext.get('flag-button');
                        flag_el.on('click', function() {
                            p.showFlagAsInappropriateForm(this.el);
                        }, this);
                        flag_el.show();

                        // If the user is the owner of the plugin, add more extras.
                        // Right now we're using the 'is_shared' property, which really
                        // means 'is_not_mine'. This same name is used for layouts, so
                        // for now we're using it for consistency.
                        if (!p.is_shared) {
                            var edit_btn = new Ext.Button({
                                text: 'Edit this plugin',
                                handler: this.showPluginEditForm.createDelegate(this, [p]),
                                applyTo: 'plugin-add-to-layout',
                                scope: this
                            });
                        }
                    }
                    else {
                        note = Ext.get('plugin-add-to-layout');
                        note.insertHtml("beforeEnd","Login to use this plugin in a layout.");
                        note.addClass('login-note');
                    }

                    // In case this plugin is of type 'div' instead of 'iframe',
                    // we need to load the content via an AJAX call instead.
                    if (p.type == 'div') {
                        var _url = p.getPreviewUrl(),
                            scripts_enabled = false;
                        _url = _url+'&container=library-plugin-preview';

                        if (_url.startsWith('http://')) {
                            scripts_enabled = _url.startsWith('http://plugins.gnf.org/');
                            _url = '/utils/proxy?url='+_url.replace('&','%26');
                            if (this.plugin.options.securityAware)
                                _url += '&secure=1';
                        }
                        else {
                            scripts_enabled = true;
                        }

                        Ext.get('library-plugin-preview').load({url:_url, scripts:scripts_enabled});
                    }

                    // Rename the breadcrumb & toggle the view.
                    this.setPluginTitle(p.title);
                    this.setActiveItem('library-plugin',from);
                    _gaq.push(['_trackPageview', '/pluginlibrary/plugin/' + p.id]);
                }
            };


            // LOADING SEQUENCE
            // Change display & indicate loading
            this.libLoading();

            //// Check for sample_gene
            //biogps.loadSampleGene({callback: postGeneLoad, scope: this});

            // Instantiate a new Plugin object with the given ID.
            p = new biogps.Plugin({id: plugin_id});
            p.on('load', postPluginLoad, this);
            p.load();
        }
    },

    // markupPluginTemplate
    // Applies the properties of a Plugin object to the given template.
    //   Param plugin: the biogps.Plugin object already loaded via JSON.
    //   Param template: string name of the template to use.
    //      Ex: small, medium, large
    //   Returns: string with plugin values substituted into template
    markupPluginTemplate: function(plugin, template) {
        if (plugin && template) {
            // Comma-delimit the species list.
            var species = plugin.getAllowedSpecies().join(', ');

            // Make the list of tags into links.
            var tag_links = '';
            if(plugin.tags){
                var links = new Array();
                plugin.tags.split(' ').each(function(tag) {
                    links.push('<a href="javascript:biogps.currentLibrary.browsePluginsByTag(\'' + tag + '\',\'library-plugin\')" title="click to view plugins with this tag">' + tag + '</a>');
                });
                tag_links = links.join(' | ');
            }
            else {
                tag_links = 'none';
            }

            // Apply the markup variables below to the template.
            var markup = biogps.pluginTpls[template].apply({
                url: this.markHighlight(plugin.url),
                previewUrl: plugin.getPreviewUrl(),
                id: plugin.id,
                title: this.markHighlight(plugin.title),
                description: this.markHighlight(plugin.description),
                author: this.markHighlight(plugin.author),
                rolepermission: this.plugin.formatPermission(),
                lastmodified: plugin.lastmodified,
                created: plugin.created,
                tags: tag_links,
                allowedspecies: species,
                usage: plugin.usage_percent
            });
            return markup;
        }
    },

    markHighlight: function(s) {
        var color_list = ['red', 'blue', 'green', 'aqua', 'purple', 'fuchsia', 'black', 'gray', 'lime', 'maroon', 'navy', 'olive', 'silver', 'teal'];
        if (this.highlight) {
            var color;
            for (var i=0;i<this.highlight.length;i++) {
                color = color_list[i % color_list.length];
                s = s.replace(new RegExp('('+this.highlight[i].trim()+')', 'gi'), '<span class="highlight" style="color:'+color+';">$1</span>');
            }
        }
        return s;
    },

    // showPluginEditForm
    // Passed a biogps.Plugin object, it instantiates a biogps.PluginEditPanel
    // and renders it into the library-edit panel.
    //   Param plugin: the biogps.Plugin object already loaded via JSON.
    showPluginEditForm: function(plugin) {
        if (!plugin)
            return false;

        // Instantiate the editing form.
        var edit_form = new biogps.PluginEditPanel({
            id: 'pluginmodify_' + plugin.id.toString(),
            modifyonly: true
        });

        // Remove any existing items from the edit panel.
        var panel = Ext.getCmp('library-edit');
        panel.items.each(function(item){panel.remove(item)});

        // Render the form and populate the fields.
        panel.add(edit_form);
        //edit_form.fillPluginForm(plugin);
        edit_form.on('afterlayout',
            edit_form.fillPluginForm.createDelegate(edit_form, [plugin])
        );
        panel.doLayout();

        // Rename the breadcrumb & toggle the view.
        this.setPluginEditTitle(plugin.title);
        this.setActiveItem('library-edit','library-plugin');
        _gaq.push(['_trackPageview', '/pluginlibrary/edit/' + plugin.id]);
    },





    /////////////////////////////////////////////
    // Adding Plugins to Layouts
    /////////////////////////////////////////////

    // showAddToLayoutMenu
    // Fired by the 'Add to my layout' button on the large plugin view.
    // Loads and displays a menu of available layouts.
    showAddToLayoutMenu: function(btn, evt){
        evt.stopEvent();
        this.layoutmenu = null;
        if(!this.layoutmenu){ // create context menu on first right click
            this.layoutmenu = new Ext.menu.Menu({
                items: [{
                    text:'New layout',
                    //checked: true,
                    layout: null,
                    plugindata: this.plugin,
                    group: 'selectedlayout',
                    handler: this.onAddToNewLayout,
                    scope: this
                },
                '-']
            });

            // Iterate through this user's layouts and create a menu item for each.
            for (var i=0;i<biogps.LayoutMgr.availableLayouts.length;i++){
                var layout = biogps.LayoutMgr.availableLayouts[i];
                if (layout.isMyLayout())
                    this.layoutmenu.add({
                        text: layout.layout_name,
                        layout: layout,
                        group: 'selectedlayout',
                        handler: this.onAddToLayout,
                        scope: this
                    });
            }
        }

        // Render the menu's top left corner where the user clicked.
        this.layoutmenu.showAt(evt.getXY());
    },

    onAddToLayout: function(item, e){
        e.stopEvent();
        if(this.plugin){
            if (item.layout && this.el){
                item.layout.on('pluginadded', function(){
                    this.el.mask(String.format('This plugin was added to layout "{0}".', item.layout.layout_name));
                    biogps.GeneReportMgr.refreshLayout(item.layout);
//                    if (item.layout.isDefault())
//                        this.LayoutMgr.loadLayout(item.layout.layout_id);
                    var _el = this.el;
                    setTimeout(function(){
                        _el.unmask();
                        }, 1000);
                    biogps.clearListeners(item.layout, 'pluginadded');
                },this);
                item.layout.on('pluginaddfailed', function(data){

                }, this);
                this.el.mask(String.format('Adding this plugin to layout "{0}"...', item.layout.layout_name));
                item.layout.addPlugin(this.plugin);
            }
        }
        return true;
    },

    onAddToNewLayout: function(item, e){
        e.stopEvent();
        if (this.plugin && this.el){
            if (!this.newlayoutwin){
                this.newlayoutwin = new Ext.Window({
                    title:'Create a new layout',
                    layout: 'fit',
                    width: 380,
                    labelWidth: 200,
                    //modal: true,
                    constrain: true,
                    constrainHeader: true,
                    renderTo: this.el,
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
                                fn: function(){this.ownerCmp.saveNewLayout()},
                                scope: win//this.ownerCmp
                            }]);
                        }}
                    },
                    items: new Ext.FormPanel({
                        id:'newlayoutform',
                        labelWidth: 120,
                        autoHeight: true,
                        bodyStyle:'padding:5px 5px 5px 5px',
                        border : false,
                        items:[{
                            xtype:'textfield',
                            anchor: "90%",
                            fieldLabel: "Name your layout",
                            id:this.id+'_field_name',
                            name: 'layout_name',
                            allowBlank:false
                        },{
                            fieldLabel: "Description",
                            xtype: 'textarea',
                            anchor: "90%",
                            id:this.id+'_field_description',
                            name: 'description',
                            //emptyText: "Type any instructive description for users here.",
                            value: '',
                            allowBlank:true
                        }],
                        buttons: [{
                            text:'Save',
                            handler: this.saveNewLayout,
                            scope:this
                        },{
                            text: 'Cancel',
                            handler: function(){
                                this.newlayoutwin.destroy();
                            },
                            scope: this
                        }]
                    })
                });
            }
            this.newlayoutwin.on('destroy', function(){this.newlayoutwin=null;},this);
            this.newlayoutwin.show();
        }
        return true;
    },

    saveNewLayout: function(){
        if (this.plugin && this.newlayoutwin && this.newlayoutwin.rendered){
            var newlayoutform = this.newlayoutwin.items.get(0);
            if (!(newlayoutform.form.isValid())){
                Ext.MessageBox.show({
                    title:'Error',
                    msg: 'Missing or wrong input layout name! Correct and try again.',
                    buttons: Ext.Msg.OK,
                    icon: Ext.MessageBox.ERROR
                });
                newlayoutform.form.reset();
                newlayoutform.items.get(0).focus();
            }
            else {
                var layout = new biogps.Layout(newlayoutform.form.getValues());
                layout.layout_data = [{id: this.plugin.id}];
                layout.on('saved', function(){
                    this.newlayoutwin.destroy();
                    this.el.mask(String.format('This plugin was added to layout "{0}".', layout.layout_name));
                    biogps.LayoutMgr.loadAvailableLayout();
                    biogps.GeneReportMgr.markLayoutChanged();
                    var _el = this.el;
                    setTimeout(function(){
                        _el.unmask();
                    }, 1000);
                    biogps.clearListeners(layout, 'saved');
                },this);
                layout.on('savefailed', function(data){
                    this.el.unmask();
                    this.newlayoutwin.center();
                    biogps.formfailure({result: data},
                          /*errmsg =*/ 'Saving Layout failed! Try again.',
                          /*onclose= */ function(){
                                            if (this.newlayoutwin.rendered){
                                                this.newlayoutwin.items.get(0).form.reset();
                                                this.newlayoutwin.items.get(0).items.get(0).focus();
                                            }
                                        },
                          /*scope = */  this
                    );
                },this);
                this.el.mask(String.format('Saving new layout "{0}"...', layout.layout_name));
                layout.saveas();
            }
        }
    }
});





///////////////////////////////////////////////////////////////////////////////
// PLUGIN STORE / READER OBJECTS
///////////////////////////////////////////////////////////////////////////////

// pluginJsonStore is a direct copy of Ext.data.JsonStore, but uses our custom
// Reader instead of Ext's JsonReader.
biogps.pluginJsonStore = function(c){
    Ext.data.JsonStore.superclass.constructor.call(this, Ext.apply(c, {
        proxy: c.proxy || (!c.data ? new Ext.data.HttpProxy({url: c.url, method: c.method}) : undefined),
        reader: new biogps.pluginJsonReader(c, c.fields)
    }));
};
Ext.extend(biogps.pluginJsonStore, Ext.data.Store);

// pluginJsonReader is an extension of Ext.data.JsonReader that overwrites
// certain functions to work with the biogps.Plugin class instead of Ext.data.Record.
biogps.pluginJsonReader = function(meta, recordType){
    meta = meta || {};
    biogps.pluginJsonReader.superclass.constructor.call(this, meta, recordType || meta.fields);
};
Ext.extend(biogps.pluginJsonReader, Ext.data.JsonReader, {
    readRecords : function(o){

        this.jsonData = o;
        if(o.metaData){
            delete this.ef;
            this.meta = o.metaData;
            this.recordType = Ext.data.Record.create(o.metaData.fields);
            this.onMetaChange(this.meta, this.recordType, o);
        }
        var s = this.meta, Record = this.recordType,
            f = Record.prototype.fields, fi = f.items, fl = f.length;

        if (!this.ef) {
            if(s.totalProperty) {
                this.getTotal = this.getJsonAccessor(s.totalProperty);
            }
            if(s.successProperty) {
                this.getSuccess = this.getJsonAccessor(s.successProperty);
            }
            this.getRoot = s.root ? this.getJsonAccessor(s.root) : function(p){return p;};
            if (s.id) {
                var g = this.getJsonAccessor(s.id);
                this.getId = function(rec) {
                    var r = g(rec);
                    return (r === undefined || r === "") ? null : r;
                };
            } else {
                this.getId = function(){return null;};
            }
            this.ef = [];
            for(var i = 0; i < fl; i++){
                f = fi[i];
                var map = (f.mapping !== undefined && f.mapping !== null) ? f.mapping : f.name;
                this.ef[i] = this.getJsonAccessor(map);
            }
        }

        var root = this.getRoot(o), c = root.length, totalRecords = c, success = true;
        if(s.totalProperty){
            var v = parseInt(this.getTotal(o), 10);
            if(!isNaN(v)){
                totalRecords = v;
            }
        }
        if(s.successProperty){
            var v = this.getSuccess(o);
            if(v === false || v === 'false'){
                success = false;
            }
        }
        var records = [];
        for(var i = 0; i < c; i++){
            var n = root[i];
            var values = {};
            var id = this.getId(n);
//          for(var j = 0; j < fl; j++){
//              f = fi[j];
//              var v = this.ef[j](n);
//              values[f.name] = f.convert((v !== undefined) ? v : f.defaultValue, n);
//          }
//          var record = new Record(values, id);
            var record = new biogps.Plugin(n.fields);
            record.id = n.pk;
            record.json = n;
            record.data = n.fields;
            record.data.id = n.pk;
            records[i] = record;
        }
        return {
            success : success,
            records : records,
            totalRecords : totalRecords
        };
    }
});





///////////////////////////////////////////////////////////////////////////////
//   PLUGIN ADDING & EDITING
///////////////////////////////////////////////////////////////////////////////


// PluginEditPanel is adapted from the old implementation.
// An instance of it is created during initLibrary() and is reused both for
// creating new plugins and editing existing ones.
biogps.PluginEditPanel = function(config) {
    this.pluginbox = null;      //refer to the parent pluginbox
    Ext.apply(this, config);
    biogps.PluginEditPanel.superclass.constructor.call(this, {
        id: this.id+'_form',
        title: this.modifyonly?'Edit your own plugin':'Create your own plugin',
        cls: 'centerMargins',
        labelWidth: 110,
        stateful:false,
        defaultType: 'textfield',
        width: '90%',
        autoHeight: true,
        border : false,
        trackResetOnLoad: this.modifyonly,   //ref: http://extjs.com/forum/showthread.php?t=39745&highlight=setValues+dirty
        items:[{
            xtype:'fieldset',
            cls: 'roundBoxBlue',
            autoHeight: true,
            defaults: {anchor: '90%'},
            defaultType: 'textfield',
            items:[{
                fieldLabel: "Title*",
                id:this.id+'_field_title',
                name: 'title',
                maxLength: 100,
                allowBlank:false
            },{
                fieldLabel: "URL template*",
                id:this.id+'_field_url',
                name: 'url',
                maxLength: 500,
                value:'',
                allowBlank:false,
                validator: this.validateURLTemplate,
                listeners: {render: this.addURLHelp,
                            blur:function(obj){this.toggleSpeciesBasedOnKeyword(obj.getValue()); return false;},
                            scope: this
                }
            },{
                xtype: 'box',
                autoEl: {
                    tag: 'div',
                    cls: 'details',
                    html: '<h5>Template Syntax Explained</h5> \
                    <p>You need to supply the URL to the website you want to add \
                    as a plugin, including one (or more) keywords. When you then \
                    use your plugin in a layout, the appropriate identifier for \
                    your gene of interest will be substituted in.</p><br /> \
                    <p>For example, to make a simple Google search plugin, you would \
                    type in the URL below, then click \
                    the "Add Keyword" button and select whichever identifier you want.<br /> \
                    <b>http://www.google.com/search?q=</b></p><br /> \
                    <p>Once you have picked an identifier, the URL template \
                    will then look like this:<br /> \
                    <b>http://www.google.com/search?q={{Symbol}}</b></p><br /> \
                    <p>When the plugin is then used in a layout to look at a gene, \
                    BioGPS will automatically insert the correct value. For \
                    example, if you used the UniGene ID keyword and the user \
                    is looking at CDK2, the actual URL that will load would be \
                    this:<br /> \
                    <b>http://www.google.com/search?q=Hs.19192</b></p><br /> \
                    <p>If you want to test your URL template before saving, just hit \
                    the "Preview" button at the bottom of this page. \
                    </p>'
                }
            }]
        },{
            xtype:'fieldset',
            cls: 'roundBox',
            autoHeight: true,
            defaults: {anchor: '90%'},
            defaultType: 'textfield',
            items:[{
                fieldLabel: "Description",
                xtype: 'textarea',
                id:this.id+'_field_description',
                name: 'description',
                autoHeight: false,
                height: 75,
                //emptyText: "Type any instructive description for users here.",
                value: '',
                grow: false,
                //growMin: 22,
                //growMax: 200,
                allowBlank:true
            },{
                fieldLabel: "Tags (categories)",
                id:this.id+'_field_tags',
                name: 'tags',
                allowBlank:true
            },{
                xtype: 'box',
                autoEl: {
                    tag: 'div',
                    cls: 'details',
                    html: 'Enter words to help categorize your plugin. Separate them with a single space.<br /> \
                    Example: "<b>exon structure gene</b>" will make your plugin \
                    show up in each of those three categories.'
                }
            },{
                xtype:'checkboxgroup',
                name:'allowedspeciesGroup',
                fieldLabel:'Species allowed:',
                labelSeparator:'',
                listeners: {change: function(obj){
                                this.hideSpeciesMsgTip();
                                },
                            scope: this},
                columns: biogps.AVAILABLE_SPECIES.walk(function(x){return 80;}),
                items: biogps.AVAILABLE_SPECIES.walk(function(x){
                                                        return {
                                                            name:'allowedspecies',
                                                            inputValue:x,
                                                            //boxLabel:x.substring(0,1).toUpperCase()+x.substring(1),
                                                            boxLabel:x.capitalize(),
                                                            checked:true
                                                        };
                                                     })
                /*columns: [80, 80, 80],
                items:[{
                    name:'allowedspecies',
                    inputValue:'human',
                    boxLabel:'Human',
                    checked:true
                },{
                    name:'allowedspecies',
                    inputValue:'mouse',
                    boxLabel:'Mouse',
                    checked:true
                },{
                    name:'allowedspecies',
                    inputValue:'rat',
                    boxLabel:'Rat',
                    checked:true
                }]*/
            },{
                xtype:'radiogroup',
                name:'rolepermission',
                fieldLabel:'Visible to:',
                labelSeparator:'',
                hidden: false,
                disabled: false,
                columns: biogps.usrMgr.is_gnf_user?[100, 100, 100]:[100, 0, 100],
                height: 30,
                listeners: {render: function(cmp){
                    if (! biogps.usrMgr.can_share && !biogps.usrMgr.is_anonymoususer)
                        biogps.whydisabled(cmp,'You need to provide us your full name and affiliation information before you can share your plugin with others. Click <a href="/auth/account/edit" target="_blank">here</a> to edit your account information.');
                    }
                },
                items:[{
                    inputValue:'biogpsusers',
                    name:'rolepermission',
                    boxLabel:'Everyone',
                    checked: biogps.usrMgr.can_share
                },{
                    inputValue:'gnfusers',
                    hidden: !biogps.usrMgr.is_gnf_user,
                    disabled: !biogps.usrMgr.is_gnf_user,
                    name:'rolepermission',
                    boxLabel:'GNF Only'
                },{
                    inputValue:'myself',
                    boxLabel:'Myself Only',
                    name:'rolepermission',
                    checked: !biogps.usrMgr.can_share
                }]

            }]
        }],

        buttons: [{
            text:this.modifyonly?'Save Edits':'Save New',
            handler: this.doSavePlugin,
            style: 'font-weight: bold',
            scope:this
        },{
            text:'Cancel',
            handler: this.cancelEdit,
            hidden: !this.modifyonly,
            scope:this
        },{
            text:'Preview',
            handler: this.previewPlugin,
            scope:this
        },{
            text:'Clear',
            handler: this.doClearForm,
            hidden: this.modifyonly,
            scope: this
        },{
            text: 'Delete',
            hidden: !this.modifyonly,
            handler: this.deletePlugin,
            scope: this
        }]
    });

    this.on('afterlayout', function(){
        //this.addURLHelp();
        this.addScreencastLink();
    }, this);

};
Ext.extend(biogps.PluginEditPanel, Ext.FormPanel, {
    addURLHelp: function(targetfield){
        if (!this.urlhelp){
            //var parentcontainer = this.items.get(0).items.get(1).container;
            var parentcontainer = targetfield.container;
            var container = parentcontainer.createChild({tag:'div', cls:'keyword-btn'});

            this.keywordmenu = new Ext.menu.Menu({cls:"no-icon-menu"});
            this.keywordmenu.add('<b class="menu-title">Available keywords:</b>');
            for (var i=0;i<biogps.PLUGINKEYWORDS_common.length;i++){
                this.keywordmenu.add({
                    text: biogps.PLUGINKEYWORDS_common[i].text,
                    //cls: 'x-btn-text',
                    keyword:biogps.PLUGINKEYWORDS_common[i].key,
                    handler: this.appendKeyword,
                    scope: this
                });
            }
            this.subkeywordmenu = new Ext.menu.Menu({cls:"no-icon-menu"});
            for (var i=0;i<biogps.PLUGINKEYWORDS_other.length;i++){
                this.subkeywordmenu.add({
                    text: biogps.PLUGINKEYWORDS_other[i].text,
                    keyword:biogps.PLUGINKEYWORDS_other[i].key,
                    handler: this.appendKeyword,
                    scope: this
                });
            }
            this.keywordmenu.add('-');
            this.keywordmenu.add({
                text: "more keywords",
                menu: this.subkeywordmenu,
                handler: function(){return false;}
            });


            this.urlhelp = new Ext.Toolbar.Button({
                renderTo: container,
                iconCls:'icon-help',
                text: 'Add Keyword',
                handler: function() {this.showMenu();}, //optionsHandler, // handle a click on the button itself
                menu: this.keywordmenu
            });
        }
    },

    addScreencastLink: function(){
        if (!this.screencast){
            var link = '<a class="roundButton right" href="http://plugins.gnf.org/screencasts/plugin_registration/">Watch the Screencast</a>';
            this.screencast = this.header.insertHtml('afterBegin',link,true);
        }
    },

    appendKeyword: function(item, evt){
        if (item.keyword){
            var newurl = this.form.getValues().url+item.keyword;
            this.form.setValues({url: newurl});
            this.toggleSpeciesBasedOnKeyword(newurl);
        }
    },

    validateURLTemplate: function(url){
        var _url = url.trim();
        var p = new biogps.Plugin();
        p.url = _url;
        var is_valid = p.validateUrl();
        return is_valid;
    },

    toggleSpeciesBasedOnKeyword: function(url){
        var _url = url.trim();
        var p = new biogps.Plugin();
        p.url = _url;
        var allowed_species = p.getAllowedSpeciesOnKeyword();
        if (Ext.isArray(allowed_species)){
            var current_species_selected = this.form.findField('allowedspeciesGroup').getRawValue();
            if ( !current_species_selected.sort().equals(allowed_species.sort()) ){
                this.setSpeciesGroup(allowed_species);
                this.showSpeciesMsgTip('<img style="vertical-align:text-top;" src="/assets/img/information.png" />&nbsp;"Allowed species" has been changed based on the keyword used in URL template.')
                return true;
            }
        }
        this.hideSpeciesMsgTip();
        return false;
    },

    showSpeciesMsgTip: function(msg){
       var species_group = this.form.findField('allowedspeciesGroup');
       var target_el = species_group.items.get(species_group.items.length-1).getEl().parent();
       if (!this.species_msgtip){
           this.species_msgtip = new Ext.ToolTip({
                //target: target_el,
                //defaultAlign: 'l-r',
                anchor: 'left',
                anchorOffset: 0,
                renderTo: species_group.getEl(),
                html: msg,
                maxWidth: 230,
                anchorToTarget: true,
                dismissDelay: 0,
                autoHide: false
            });
            this.species_msgtip.showAt(this.species_msgtip.el.getAlignToXY(target_el, 'l-tr', [20, -5]));
            //this.species_msgtip.show();
       }
       else {
           if (this.species_msgtip.hidden) {
               this.species_msgtip.show();
           }
           this.species_msgtip.body.update(msg);
           this.species_msgtip.doAutoWidth();
       }
    },

    hideSpeciesMsgTip: function(){
        if (this.species_msgtip){
            this.species_msgtip.hide();
            delete this.species_msgtip;
        }
    },

    cancelEdit: function(item, evt){
       if (this.modifyonly && this.form.isDirty()) {
            Ext.MessageBox.confirm('Confirm', 'Cancel modification? Unsaved changes will be discarded.',
                                   function(ans){
                                        if (ans == 'yes'){
                                            biogps.currentLibrary.setActiveItem('library-plugin','library-edit');
                                            _gaq.push(['_trackPageview', '/pluginlibrary/edit/cancel/']);
                                        }
                                   },
                                   this);
       }
       else {
          biogps.currentLibrary.setActiveItem('library-plugin','library-edit');
       }
    },

    previewPlugin: function(){
        var p = new biogps.Plugin(this.form.getValues())
        if (p.allowedspecies){
            if (isArray(p.allowedspecies))
                p.options.allowedSpecies = p.allowedspecies;
            else
                p.options.allowedSpecies = [p.allowedspecies];
        }

        biogps.loadSampleGene({
            species: p.options.allowedSpecies.length>0?p.options.allowedSpecies[0]:null,
            callback: function(){
                if (!p.geturl(biogps.sample_gene)){
                     Ext.MessageBox.show({
                        title:'Error',
                        msg: 'Can not interpret the URL template. Please make sure the substitutable keyword is correct.',
                        buttons: Ext.Msg.OK,
                        icon: Ext.MessageBox.ERROR
                    });
                }
                else{
                    //p.preview(Ext.get('pluginboxcontainer'));
                    p.render_preview(biogps.sample_gene, Ext.get('pluginboxcontainer'));
                }
            },
            scope: this
        });

        /*
        //get proper sample gene id based on first allowed species
        var sample_gene_id = 1017;  //default, CDK2
        if (p.options.allowedSpecies.length>0 && biogps.SAMPLE_GENE &&
            biogps.SAMPLE_GENE[p.options.allowedSpecies[0]]){
                //if available, set species_specific sample gene
                sample_gene_id = biogps.SAMPLE_GENE[p.options.allowedSpecies[0]];
        }

        //now load sample_gene object if not loaded before
        if (biogps.sample_gene && biogps.sample_gene.id == sample_gene_id){
            if (!p.geturl(biogps.sample_gene)){
                 Ext.MessageBox.show({
                    title:'Error',
                    msg: 'Can not interpret the URL template. Please make sure the substitutable keyword is correct.',
                    buttons: Ext.Msg.OK,
                    icon: Ext.MessageBox.ERROR
                });
            }
            else{
                //p.preview(Ext.get('pluginboxcontainer'));
                p.render_preview(biogps.sample_gene, Ext.get('pluginboxcontainer'));
            }
        }
        else {
            biogps.sample_gene = new biogps.Gene({id: sample_gene_id});
            biogps.sample_gene.on('load', function(gene){
                this.previewPlugin();
                _gaq.push(['_trackPageview', '/pluginlibrary/edit/preview/']);
            }, this);
            biogps.sample_gene.load();
        }*/
    },

    doSavePlugin: function(){
        if (this.modifyonly)
            Ext.MessageBox.confirm('Confirm', String.format('Update plugin "{0}"?', this.form.getValues().title),
                function(ans){
                    if (ans == 'yes')
                        this.submitPluginForm();
                },
                this);
        else
            this.submitPluginForm();
    },

    handleDupPluginAtSave: function(dup_plugins){
        if (dup_plugins && dup_plugins.length>0){
            var title, msg;
            var existing_links = '<p><br />';
            dup_plugins.each(function(p){existing_links+='<a href="#goto=pluginlibrary&t=library-plugin&p='+p.id.toString()+'" onclick="javascript:Ext.Msg.hide();">'+p.text+'</a><br />';});
            existing_links += '</p>';

            if (dup_plugins.length==1){
                title = 'Duplicated plugin found';
                msg = 'We detected that there is an existing plugin with exactly the same URL template as you provided. You can click the link below to view this existing plugin: ' + existing_links + '<p><br />Click "Yes" to save it anyway, or "No" to cancel the saving.</p>';
            }
            else {
                title = 'Duplicated plugins found';
                msg = 'We detected that there are '+dup_plugins.length.toString()+' existing plugins with exactly the same URL template as you provided. You can click the links below to view the existing plugins: ' + existing_links + '<p><br />Click "Yes" to save it anyway, or "No" to cancel the saving.</p>';
            }

            Ext.Msg.confirm(
                title,
                msg,
                function(ans){
                    if (ans == 'yes'){
                        this.submitPluginForm({allowdup:true});
                    }
                },
                this);
        }
    },

    /**
     * Do the actual plugin saving
     * @param {} cfg  allowed "cfg" parameter is "allowdup". this.submitPluginForm({allowdup:true}) will bypass duplication check and save plugin anyway.
     */
    submitPluginForm: function(cfg){
       var form = this.form;
       if (! form.isValid()){
             Ext.MessageBox.show({
                title:'Error',
                msg: 'Wrong input! Correct and try again.',
                buttons: Ext.Msg.OK,
                icon: Ext.MessageBox.ERROR
            });
            form.reset();
       }
       else if (this.modifyonly && !this.current_pluginid){
             Ext.MessageBox.show({
                title:'Error',
                msg: 'Missing plugin id for updating this plugin! Reload this plugin and try again.',
                buttons: Ext.Msg.OK,
                icon: Ext.MessageBox.ERROR
            });
       }
       else {
            var p = new biogps.Plugin(form.getValues());
            var valid = p.validateUrl();
            if (valid == true){
                this.toggleSpeciesBasedOnKeyword(p.url);
                form.getEl().mask(this.modifyonly?'Save your modification...':'Submit your new plugin...');
                var extra_params = {};
                if (this.modifyonly) Ext.apply(extra_params, {plugin_id:this.current_pluginid});
                if (cfg && cfg.allowdup) Ext.apply(extra_params, {allowdup:'1'});
                form.submit({
                    url: this.modifyonly?'/plugin/update/':'/plugin/add/',
                    method:'POST',
                    //params: this.modifyonly?{plugin_id:this.current_pluginid}:{},
                    params: extra_params,
                    success: function(form, action){
                        form.getEl().unmask();
                        form.getEl().mask(this.modifyonly?'Your plugin was updated!':'Your plugin was saved!');
                        _gaq.push(['_trackPageview', '/pluginlibrary/edit/save/']);
                        setTimeout(function(){
                            form.getEl().unmask();
                            //renderPluginById(action.result.plugin_id);
                            }, 1000);

                        // Reset the form if this was for a new plugin
                        if (!this.modifyonly && !this.current_pluginid) {
                            this.current_pluginid = action.result.plugin_id;
                            form.reset();
                        }

                        // Display the final plugin view.
                        var from_panel = this.modifyonly ? 'library-edit' : 'library-add';
                        biogps.currentLibrary.renderPluginById(this.current_pluginid,from_panel);
                    },
                    failure: function(form, action){
                        form.getEl().unmask();
                        if (action.result.dup_plugins){
                            this.handleDupPluginAtSave(action.result.dup_plugins);
                        }
                        else{
                            biogps.formfailure(action,
                                               this.modifyonly?'"updatePlugin" service failed!':'"addPlugin" service failed!');
                        }
                    },
                    scope: this
                });
            }
            else{ /* p.validateUrl() => false or errmsg */
                var errmsg = 'Invalid URL template. ';
                if (Ext.isString(valid))  //in this case valid is actually a string of errmsg.
                    errmsg += valid;
                else
                    errmsg +=  'Please make sure the substitutable keyword is correct.';
                Ext.MessageBox.show({
                    title:'Error',
                    msg: errmsg,
                    buttons: Ext.Msg.OK,
                    icon: Ext.MessageBox.ERROR
                });
            }
        }
    },

    doClearForm: function(){
        if (this.modifyonly)
            Ext.MessageBox.confirm('Confirm', String.format('Clear all values for plugin "{0}"?', this.form.getValues().title),
                function(ans){
                    if (ans == 'yes')
                        this.form.reset();
                },
            this);
        else
            this.form.reset();
    },

    setSpeciesGroup: function(species_list){
/*        var form = this.form;
        form.findField('allowedspeciesGroup').items.each(function(item){
            for (var i=0;i<biogps.AVAILABLE_SPECIES.length;i++){
                if (item.inputValue == biogps.AVAILABLE_SPECIES[i]){
                    item.setValue(species_list.indexOf(biogps.AVAILABLE_SPECIES[i]) != -1);
                }
            }
        });*/

        var cb_grp = this.form.findField('allowedspeciesGroup');
        var cb_values = [];
        cb_grp.eachItem(function(item){
            cb_values.push(species_list.indexOf(item.inputValue) != -1);
        });
        cb_grp.setValue(cb_values);
    },

    fillPluginForm: function(plugin){
        var form = this.form;
        form.setValues({
            url: plugin.url,
            title: plugin.title,
            description: plugin.description,
            tags: plugin.tags,
            rolepermission: plugin.formatPermission()
        });

        var species = plugin.getAllowedSpecies();
        this.setSpeciesGroup(species);
        this.current_pluginid = plugin.id;
    },

    deletePlugin: function(){
        if (!this.modifyonly)
            return false;

        var _plugin_id = this.current_pluginid;
        var _plugin_title = this.form.getValues().title;

		biogps.callRemoteService({
			url: '/plugin/'+_plugin_id+'/usage/',
			scope: this,
			fn: function(st){
				var usage_cnt = st.reader.jsonData;
				var msg = String.format('Are you SURE you want to delete the "{0}" plugin?<br />This action CANNOT be undone!', _plugin_title);
				if (usage_cnt[0]>0 || usage_cnt[1] > 0){
					msg += String.format('<br /><br />Usage info: this plugin is currently used in [<b>{0}</b>] of your own layouts and [<b>{1}</b>] of others\'.', usage_cnt[0], usage_cnt[1])
				}
				else{
					msg += '<br /><br />Usage info: this plugin is currently not used in any layout.';
				}
		        Ext.MessageBox.confirm('Confirm',
		            msg,
		            function(ans){
		                if (ans == 'yes')
		                    doDelete(this);
		            },
		            this);
			}
		});

        function doDelete(_this){
            var st = new Ext.data.JsonStore({
                url: '/plugin/delete/',
                baseParams: {'plugin_id': _plugin_id},
                method: 'POST',
                fields:[],
                autoLoad: true
            });
            _this.body.mask(String.format('Delete plugin "{0}"...', _plugin_title));
            st.on('load', function(st){
                var data = st.reader.jsonData;
                if (data.success){
                    _this.body.unmask();
                    _this.body.mask('You plugin was deleted!');
                    _gaq.push(['_trackPageview', '/pluginlibrary/edit/delete/']);
                    setTimeout(function(){
                        _this.body.unmask();
                        // Take the user back home.
                        biogps.currentLibrary.setActiveItem('library-home','delete');
                    }, 1500);

                }
                else {
                     _this.body.unmask();
                     Ext.MessageBox.show({
                        title:'Error',
                        msg: data.error?data.error:'',
                        buttons: Ext.Msg.OK,
                        icon: Ext.MessageBox.ERROR
                    });
                }
            },_this);
            st.on('loadexception', biogps.ajaxfailure, _this);
        }
    }

});





///////////////////////////////////////////////////////////////////////////////
//   STANDALONE FUNCTIONS
///////////////////////////////////////////////////////////////////////////////

// Called after '/plugin/browse' has been loaded.
// Initializes the Ext layouts and panels for the Library.
//   Param historyParams: (optional) used for back button & deep linking.
function initLibrary(historyParams) {
    // Retrieve the parent panel, in which the Library will live.
    var tab_container = Ext.getCmp('pluginbrowse_panel');

    // Local Store for Browsing / Searching
    biogps.pluginStore = new biogps.pluginJsonStore({
        url: '/plugin/',
        method: 'GET',
        root: 'items',
        totalProperty: 'totalCount',
        id: 'pk',
        fields: [],
        listeners: {
            'beforeload': {
                scope: this,
                fn: function(pS, conf) {
                    biogps.currentLibrary.body.mask('Loading...');
                    biogps.currentLibrary.setBrowseTitle('Loading');

                    // Ensure basic parameters are in place.
                    // We use this way of doing it, because when using the
                    // pluginStore's baseParams, they are not changeable.
                    if (!conf.params.start) { conf.params.start = 0; }
                    if (!conf.params.limit) { conf.params.limit = 50; }
                    if (!conf.params.scope) { conf.params.scope = 'all'; }
                    if (!conf.params.dir) { conf.params.dir = 'DESC'; }

                    // Supply a default sorting method if none was chosen.
                    if (!conf.params.sort) { conf.params.sort = 'popularity'; }
                }
            },
            'load': {
                scope: this,
                fn: function(pS) {
                    biogps.currentLibrary.body.unmask();

                    // Catch the case of a search returning 1 answer, in which case we jump
                    // straight to that plugin's page.
                    if (pS.getTotalCount() === 1) {
                        var plugin = pS.getAt(0);
                        // We supply 'library-home' as the 'from' parameter to hide the
                        // browse view from the breadcrumb.
                        biogps.currentLibrary.renderPluginById(plugin.id,'library-home');
                    }
                    else {
                        var params = pS.lastOptions.params;
                        var title = '';

                        // Set the browse title
                        if (params.tags) {
                            title = "plugins tagged with '" + params.tags + "'"; }
                        else if (params.search) {
                            title = "results for '" + params.search + "'"; }
                        else {
                            title = "Plugins"; }

                        if (params.sort == 'created') {
                            title = 'Newest ' + title; }
                        else if (params.sort == 'lastmodified') {
                            title = 'Recently Updated ' + title; }
                        else if (params.sort == 'popularity') {
                            title = 'Most Popular ' + title; }
                        else if (params.sort == 'title') {
                            title = 'Alphabetical ' + title; }
                        else if (params.sort == 'author') {
                            title = 'By Author ' + title; }

                        biogps.currentLibrary.setBrowseTitle(title);

                        // Make the sorting drop-down list reflect the sorting used.
                        Ext.getCmp('library-browse-sort').setValue(params.sort);

                        // The call to hash_history will be a duplicate in some
                        // cases, which won't hurt anything.  This will, however,
                        // catch the case where the user takes action to change
                        // the browse page somehow (i.e. change sorting order).
                        biogps.currentLibrary.hash_history();
                    }
                }
            }
        }
    });



    // Plugin Templates
    // Called from various render functions to display a plugin in any of
    // these three styles: small, medium, and large.
    biogps.pluginTpls = new Array();
    var smallTpl = new Ext.XTemplate(
        '<tpl for=".">',
        '<a class="pluginbox {[("permission" in values) ? this.isGNF(values.permission) : "myself"]}',
        '" href="javascript:biogps.currentLibrary.renderPluginById({id},\'library-browse\')">',
            '<span class="name">{title}</span><br />',
            '<span class="url">{[shortUrl(values.url)]}</span>',
        '</a></tpl>', {
            isGNF: function(perm) {
                return (perm.R[0] === 'GNF Users') ? 'gnfusers' : '';
            }
        }
    );
    biogps.pluginTpls['small'] = smallTpl.compile();

    var mediumTpl = new Ext.XTemplate(
        '<tpl for=".">',
        '<a class="roundBoxBlue pluginbox-medium {[("permission" in values) ? this.isGNF(values.permission) : "myself"]}',
        '" href="javascript:biogps.currentLibrary.renderPluginById({id},\'library-browse\')">',
            '<span class="author">Registered by {author}</span>',
            '<span class="name">{title}</span><br />',
            '<tpl if="1 <= values.usage_percent.layouts">',
                '<span class="usage">Layout Popularity: {values.usage_percent.layouts:round(0)}</span>',
            '</tpl>',
            '<p class="description">{description}</p>',
            '<p class="url">{[colorShortUrl(values.url)]}</p>',
        '</a></tpl>', {
            isGNF: function(perm) {
                return (perm.R[0] === 'GNF Users') ? 'gnfusers' : '';
            }
        }
    );
    biogps.pluginTpls['medium'] = mediumTpl.compile();

    var largeTpl = new Ext.XTemplate(
        '<div class="roundBoxBlue basics {rolepermission}">',
            '<div class="preview">',
                '<div id="library-plugin-preview">',
                    '<iframe src="{previewUrl}"></iframe>',
                '</div>',
                '<p>Preview of CDK2 gene data</p>',
            '</div>',
            '<h1>{title}</h1>',
            '<p class="author">Registered by {author}</p>',
            '<tpl if="1 <= values.usage.layouts">',
                '<p class="attribute"><span class="attribute-name">Layout Popularity:</span>',
                ' {values.usage.layouts:round(0)}</p>',
            '</tpl>',
            '<p class="attribute"><span class="attribute-name">Tags (keywords):</span> ',
            ' {tags}</p>',
            '<p class="attribute"><span class="attribute-name">Species:</span> ',
            ' {allowedspecies}</p>',
            '<p class="url attribute">{[colorShortUrl(values.url)]}</p>',
            '<div><div id="plugin-add-to-layout"></div></div>',
            '<tpl if="this.isMine(rolepermission)">',
                '<div class="permission"><img src="/assets/img/label_personal.gif" title="This plugin is not visible to anyone but you." /></div>',
            '</tpl>',
            '<tpl if="this.isGNF(rolepermission)">',
                '<div class="permission"><img src="/assets/img/gnf_only_icon.gif" title="Only GNF / Novartis users can use this plugin." /></div>',
            '</tpl>',
            '<div class="clear"></div>',
        '</div>',
        '<div class="roundBox details">',
            '<h4>Long Description</h4>',
            '<p class="description">{description}</p>',
            '<p class="timestamp">Updated {lastmodified}<br />Created {created}</p>',
            '<div class="clear"></div>',
        '</div>',
        '<div class="details noBorder">',
            '<a id="flag-button" class="roundButton" style="visibility: hidden;">',
                '<img src="/assets/img/flag_red.png"/>',
                'Flag as Broken or Inappropriate',
            '</a>',
        '</div>', {
            isMine: function(perm) {
                return perm == 'myself';
            },
            isGNF: function(perm) {
                return perm == 'gnfusers';
            }
        }
    );
    biogps.pluginTpls['large'] = largeTpl.compile();



    // Create the Library's primary panel
    var libraryCard = new biogps.PluginLibrary({
        id: 'pluginlibrary_card',
        layout:'anchor',
        autoScroll: true,
        bodyStyle: 'padding:5px',
        border: false,
        defaults: {
            // applied to each contained panel
            border: false
        },

        // Breadcrumb navigation, built using Ext buttons
        tbar: [{
            id: 'btn-library-home',
            text: 'Library &nbsp; &raquo;',
            cls: 'activeBreadcrumb',
            handler: navHandler.createDelegate(this, ['home'])
        },
        {
            id: 'btn-library-browse',
            text: 'Browse &raquo;',
            handler: navHandler.createDelegate(this, ['browse']),
            hidden: true
        },
        {
            id: 'btn-library-plugin',
            text: 'Plugin',
            handler: navHandler.createDelegate(this, ['plugin']),
            hidden: true
        },
        {
            id: 'btn-library-edit',
            text: 'Edit Plugin',
            handler: navHandler.createDelegate(this, ['edit']),
            hidden: true
        },
        '->', // greedy spacer so that the buttons are aligned to each side
        {
            id: 'btn-library-add',
            text: 'Add a Plugin',
            handler: navHandler.createDelegate(this, ['add'])
        }],

        // the panels (or "cards") within the layout
        items: [{
            id: 'library-header',
            contentEl: 'pluginheader'
        },{
            id: 'library-search',
            xtype: 'form',
            baseCls: 'x-window',
            cls: 'x-window-plain x-window-dlg',
            frame: true,
            title: '   ',
            onSubmit: Ext.emptyFn,
            keys: {
                // Handles the Enter key getting pressed instead of the button.
                // Mainly present for IE6, which otherwise won't work correctly.
                key: 13, // Enter key
                stopEvent: true,
                fn: function() {
                    biogps.currentLibrary.queryPlugins();
                }
            },
            items: [{
                xtype: 'panel',
                layout: 'column',
                border: false,
                items: [{
                    xtype: 'textfield',
                    name: 'query',
                    cls: 'search_field',
                    id: 'plugin_query',
                    emptyText: 'Search the Plugin Library',
                    columnWidth: 1 // Specified as a percentage
                },{
                    xtype: 'panel',
                    border: false,
                    width: 75,
                    items: [{
                        xtype: 'button',
                        type: 'submit',
                        text: 'SEARCH',
                        cls: 'right',
                        handler: function() {
                            biogps.currentLibrary.queryPlugins();
                        }
                    }]
                }]
            },{
                id: 'library-search-advanced',
                xtype: 'panel',
                title: 'Advanced',
                collapsed: true,
                collapsible: true,
                titleCollapse: true,
                hideCollapseTool: true,
                baseCls: 'form-group',
                items: [{
                    xtype: 'checkbox',
                    id: 'scope_my',
                    boxLabel: 'My Plugins',
                    checked: true
                },{
                    xtype: 'checkbox',
                    id: 'scope_shared',
                    boxLabel: 'Shared Plugins',
                    checked: true
                }]
            }]
        },{
            id: 'library-add',
            //contentEl: 'pluginadd',
            hidden: true,
            height: 650,
            items: new biogps.PluginEditPanel({
                id:'pluginadd',
                pluginbox: this,
                modifyonly: false
            })
        },{
            id: 'library-home',
            contentEl: 'pluginhome'
        },{
            id: 'library-browse',
            title: 'Browse',
            hidden: true,
            items: new Ext.DataView({
                tpl: biogps.pluginTpls['medium'],
                store: biogps.pluginStore,
                itemSelector: 'div.plugindetails'
            })
        },{
            id: 'library-plugin',
            contentEl: 'pluginpage',
            hidden: true
        },{
            id: 'library-edit',
            hidden: true,
            items: [{html:''}]
        }],

        // The toolbar used to paginate the browse page.
        bbar: new Ext.PagingToolbar({
            id: 'library-browse-nav',
            store: biogps.pluginStore,
            autoHeight: true,
            pageSize: 50,
            displayInfo: true,
            displayMsg: 'Plugins {0} - {1} of {2}',
            emptyMsg: 'No plugins to display',
            hidden: true
        })
    });

    // Add the Library to the parent panel and force it to render.
    tab_container.add(libraryCard);
    tab_container.doLayout();

    // Hide the initial loading mask, created in biogps_base.js' renderPluginBrowsePanel
    biogps.centerTab.body.unmask();

    // Create and add the sorting drop-down list for browsing.
    var sortStore = new Ext.data.SimpleStore({
        fields: ['sortby','direction','sortbyName'],
        data: [
            ['popularity','DESC','Most Popular'],
            ['created','DESC','Newest first'],
            ['lastmodified','DESC','Recently Updated'],
            ['title','ASC','Plugin Name'],
            ['author','ASC','Author']
        ]
    });
    var sortCombo = new Ext.form.ComboBox({
        id: 'library-browse-sort',
        store: sortStore,
        valueField: 'sortby',
        displayField: 'sortbyName',
        mode: 'local',
        editable: false,
        triggerAction: 'all',
        width: 125,
        listWidth: 125,
        listeners: {
            // 'select' will be fired as soon as an item in the ComboBox is selected
            select: function(combo, newValue, oldValue) {
                biogps.currentLibrary.sortPluginList(
                    newValue.data.sortby,
                    newValue.data.direction
                );
            }
        }
    });
    Ext.getCmp('library-browse-nav').add(sortCombo);

    // If the user is not logged in...
    // Commented out the if statement on 2/23/09 to always hide the Advanced bar.
    //if (biogps.usrMgr.is_anonymoususer) {
        // Hide the Advanced search section
        Ext.getCmp('library-search-advanced').hide();
    //}

    // Handle a history event if one exists
	if (historyParams) {
		biogps.currentLibrary.dispatcher_by_params(historyParams);
	}
	else {
	    // No history was passed through, so we need to stick the newly
	    // initialized library into the hash.
	    biogps.currentLibrary.hash_history();
	    biogps.currentLibrary.mask.hide();
        _gaq.push(['_trackPageview', '/pluginlibrary/']);
	}

    // if (Ext.isIE6) { pngfix(); }
};



// Passes on calls from the breadcrumb buttons to change the display.
var navHandler = function(direction) {
    var item = 'library-' + direction;
    biogps.currentLibrary.setActiveItem(item, 'breadcrumb');
};



// Extracts only the domain from a URL.  Used when displaying the 'small'
// plugin template.  It works by doing 2 RegEx substitutions to:
//   1. Strip out everything up to and including ://
//   2. Strip out everything after and including the next /
var shortUrl = function(url) {
    var str = url.replace(/.*\:\/\//,'').replace(/\/.*/,'');
    if (str == '') { str = 'biogps.gnf.org' };
    return str;
}

// Highlights only the domain from a URL, by wrapping it in a span element.
// Used when displaying the 'medium' plugin template.
var colorShortUrl = function(url) {
    // Split up the URL on either side of the '://'
    var str = url.split('://');
    // In case there was no split, we add default text
    if (str.length == 1) {
        str[1] = 'biogps.gnf.org' + str[0];
        str[0] = 'http';
    }

    // Split the second part again to add in the closing tag
    var str2 = str[1].split('/');
    str2[0] = str2[0] + '</span>';

    return str[0] + '://<span class="domain">' + str2.join('/');
}











///////////////////////////////////////////////////////////////////////////////
//   OLD CODE BELOW HERE
///////////////////////////////////////////////////////////////////////////////


// Not sure why this is used yet.
function disableEnterKey(e){
     var key;
     if(window.event)
          key = window.event.keyCode;     //IE
     else
          key = e.which;     //firefox
     if(key == 13)
          return false;
     else
          return true;
}

/* END OF FILE: biogps/pluginpanel.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/quickplugin.js 
 */

/**
 * @class biogps.PluginQuickAdd An autocompleting field for adding plugins to layouts on the fly.
 * @namespace biogps
 * @extends Ext.form.ComboBox
 * @cfg {object} grp The GeneReportPage object that this tool is a part of.
 * @constructor
 * @param {object} config
 * An object containing the required configuration options for this class.
 */
biogps.PluginQuickAdd = function(config) {
    this.grp = null;
	Ext.apply(this, config);
    
    // Local Store for Browsing / Searching
    this.pluginStore = new biogps.pluginJsonStore({
        url: '/plugin/',
        method: 'GET',
        root: 'items',
        totalProperty: 'totalCount',
        id: 'pk',
        fields: [],
        listeners: {
            'beforeload': {
                scope: this,
                fn: function(pS, conf) {
                    // Ensure basic parameters are in place.
                    // We use this way of doing it, because when using the
                    // pluginStore's baseParams, they are not changeable.
                    if (!conf.params.scope) { conf.params.scope = 'all'; }
                    if (!conf.params.dir) { conf.params.dir = 'DESC'; }
                    if (!conf.params.sort) { conf.params.sort = 'popularity'; }
                }
            }
        }
    });
    
    this.pluginTpl = new Ext.XTemplate(
        '<tpl for=".">',
        '<div class="x-combo-list-item pluginbox-quick {[("permission" in values) ? this.isGNF(values.permission) : "myself"]}>',
            '<span class="name">{title}</span><br />',
            '<tpl if="1 <= values.usage_percent.layouts">',
                '<span class="usage">Layout Popularity: {values.usage_percent.layouts:round(0)}</span>',
            '</tpl>',
            '<span class="detailLink"><a href="#goto=pluginlibrary&t=library-plugin&p={id}" onclick="biogps.GeneReportMgr.collapseQuickLists();event.cancelBubble=true;">Details</a></span>',
            '<p class="url">{[shortUrl(values.url)]}</p>',
        '</div></tpl>', {
            isGNF: function(perm) {
                return (perm.R[0] === 'GNF Users') ? 'gnfusers' : '';
            }
        }
    );
    
    // Call the Ext.form.ComboBox constructor
    biogps.PluginQuickAdd.superclass.constructor.call(this,{
        emptyText: 'Add a Plugin',
        loadingText: 'Searching...',
        store: this.pluginStore,
        tpl: this.pluginTpl,
        pageSize: 5,
        minChars: 0,
        lazyInit: false, // Setup the list right away so we can change its z-index
        displayField: 'title',
        queryParam: 'search',
        listAlign: 'tr-br?',
        listWidth: 250,
        width: 100,
        onSelect: function(record){ //override default onSelect
            this.collapse();
            this.grp.grlayout.quickAddPlugin(record);
        }
	});
};
Ext.extend(biogps.PluginQuickAdd, Ext.form.ComboBox, {
})

/* END OF FILE: biogps/quickplugin.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/mystuff.js 
 */

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


/* END OF FILE: biogps/mystuff.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/searchpanel.js 
 */

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
                	id: 'genomeinternal_string',
                	name: 'genomeinternal_string',
                	listeners: {render: function(obj){if (obj.container){
                	                                     obj.container.createChild({tag:'p', html:'example: <a href="javascript:biogps.setSampleQuery({genomeassembly:\'mouse\', genomeinternal_string:\'chrX:151,073,054-151,383,976\'});">chrX:151,073,054-151,383,976</a>'});
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
		            boxLabel: 'Human (hg18)',
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
                    boxLabel: 'Drosophila (Dm3)',
                    id: 'genome4',
                    name: 'genomeassembly',
                    inputValue:'drosophila',
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
            handler: function(){this.ownerCt.form.reset();}
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
        //var searchby = Ext.getCmp('searchformtab').getActiveTab().id;
        //ignoring empty query
//        if ((searchby == 'searchbyanno') && (fm.getForm().getValues().query.trim() =='')){
//            fm.getForm().setValues({query: ''});
//            return;
//        }

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
                                       fn: setFocus,
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

/* END OF FILE: biogps/searchpanel.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/genelistpanel.js 
 */

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
       if (selected_genes.length == 0){
               biogps.error('You did not select any gene. Please select and try again.');
       }
       else if (selected_genes.length > 10){
            biogps.error('You can only render at most 10 gene reports at one time. Please select less genes and try again.');
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
               params = {genesetid: genesetid};
               break;
           case 'intersection':
               var genesetid = cfg.genesetid;
               url = '/geneset/intersection/';
               params = {genesetid: genesetid};
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
           params: {genesetid: genesetid,
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
           params: {genesetid: geneset_list,
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
        })
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
    }

});
/* END OF FILE: biogps/genelistpanel.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/searchresultpanel.js 
 */

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
		border: false,
		tbar: [ String.format('Your query returns {0} record{1}.', this.totalCount, plural),
		        ' ',
		        '->',
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
				' '
			]
	});
	this.on('render', this.renderGeneList, this);

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
	}

});


/* END OF FILE: biogps/searchresultpanel.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/genereportpanel.js 
 */

// Our custom Window Manager object for grouping portlets separately from the
// standard Ext.WindowMgr.  The primary goal is to drop the z-index of the
// portlets below the global 9000 seed.
biogps.portletGroup = Ext.WindowGroup();
biogps.portletGroup.zseed = 1000;

/**
 * @class biogps.Portlet
 * @namespace biogps
 * @extends Ext.ux.ManagedIFrame.Window
 * @cfg{String} id The unique id of this component
 * @cfg{biogps.Plugin} plugin the plugin rendered in this portlet window
 * @cfg{biogps.Gene} gene the gene instance used by plugin to render content
 * @cfg{Mixed} renderTo the container element this portlet will render to
 * @constructor
 * @param {object} configObj
 * An object containing the required configuration options for this class
 */
biogps.Portlet = function(config) {

    //The following parameters need to be specifized by each portlet instance

    /**
     * @cfg{String} id The unique id of this component
     */
    this.id;

    /**
     * @cfg{biogps.Plugin} plugin the plugin rendered in this portlet window
     */
    this.plugin;

    /**
     * @cfg{biogps.Gene} gene the gene instance used by plugin to render content
     */
    this.gene;
    /**
     * @cfg{Mixed} renderTo the container element this portlet will render to
     */
    this.renderTo;

    var default_cfg = {
        manager       : biogps.portletGroup,
        xtype         : 'biogpsportlet',
        maximizable   : true,
        //minimizable   : true,
        collapsible   : false,
        //constrain     : true,
        constrainHeader    : true,
        shadow        : Ext.isIE,
        animCollapse  : false,
        autoScroll    : true,
        bodyCssClass  : 'portlet-body',
        hideCollapseTool: true,
        hideMode      : 'display',  //'nosize',

                    //iconCls     : 'icon-loading',
                    //loadMask    : {msg: 'Loading...'},
        renderTo: this.container,

        defaultSrc    : '/assets/img/s.gif',   //need to set a dummy value so that the "documentloaded" event will be fired after the first time loading
                                               //This is a bug in Ext.ux.ManagedIFrame.Window

        tools: [{
/*            id: 'left',
            handler: function(evt, btn){this.showInfo(btn);},
            scope:this,
            qtip: 'More tools'
        },{

            id: 'info',
            handler: function(evt, btn){this.showInfo(btn);},
            scope:this,
            qtip: 'Info'
        },{
            id: 'flag',
            handler: function(){this.flagit();},
            scope:this,
            hidden: true,
            qtip: 'Flag as broken or inappropriate'
        },{
            id: 'help',
            handler: function(evt, btn){this.showInfo(btn);},
            scope:this,
            hidden: true,
            qtip: 'Help'
        },{*/
            id: 'gear',
            handler: function(evt, btn){this.showOptionMenu(btn);},
            scope:this,
            qtip: 'More options'
/*        },{
            id: 'refresh',
            handler: function(evt, btn){this.refresh();},
            scope:this,
            qtip: 'Refresh'
        },{
            id: 'pin',
            handler: biogps.evtEmptyFn,
            scope:this,
            qtip: 'Pin'
        },{
            id: 'search',
            handler: biogps.evtEmptyFn,
            scope:this,
            qtip: 'Search'
        },{
            id: 'save',
            handler: biogps.evtEmptyFn,
            scope:this,
            qtip: 'Save'
        },{
            id: 'print',
            handler: biogps.evtEmptyFn,
            scope:this,
            qtip: 'Print'*/
        }]
    };
    Ext.apply(this, config, default_cfg);

    //set default dimenstion parameters is any is missing.
    this.x = this.x || 0;
    this.y = this.y || 0;
    this.width = this.width || 350;
    this.height = this.height || 250;

    biogps.Portlet.superclass.constructor.call(this);

    //a flag to bypass calling of this.syncSize and syncLocation after resizing and moving.
    this.flag_bypasspluginsync = false;

    //this will be fired whenever the content is loaded completely, regardless the type of content
    this.addEvents({'contentload': true});

    this.addEvents({'speciesswitch': true});

    this.on({
        'contentload': function(){this.onContentLoad();},
        'documentloaded': function(){this.fireEvent('contentload');},
        'resize': function(){if (!this.flag_bypasspluginsync) this.syncSize(); this.fixHeaderText(); this.toFront();},
        'move': function(){if (!this.flag_bypasspluginsync) this.syncLocation();},
        'maximize': function(){biogps.utils.toggleScrollbar(biogps.centerTab.get('report_panel').body, true);},
        'restore': function(){biogps.utils.toggleScrollbar(biogps.centerTab.get('report_panel').body, false);},
        'show':  function(){
            this.renderSpeciesSelector();
            this.syncLocation();
            this.syncSize();

            if (Ext.isIE) {
                //Oddly enough, IE requires this even with delay of "0".
                //Otherwise, a myterious "Object required" js error.
                var ddd_task = new Ext.util.DelayedTask(function(){
                    this.loadContent();
                }, this);
                ddd_task.delay(0);
            }
            else{
                this.loadContent();
            }
        },
        scope: this
    });

};
Ext.extend(biogps.Portlet, Ext.ux.ManagedIFrame.Window, {

    //override the original maximize method to
    maximize : function(){
        if(!this.maximized){
            this.expand(false);
            this.restoreSize = this.getSize();
            this.restorePos = this.getPosition(true);
            if (this.maximizable){
                this.tools.maximize.hide();
                this.tools.restore.show();
            }
            this.maximized = true;
            this.el.disableShadow();

            if(this.dd){
                this.dd.lock();
            }
            if(this.collapsible){
                this.tools.toggle.hide();
            }
            //this.el.addClass('x-window-maximized');
            //this.container.addClass('x-window-maximized-ct');


            /*****some adjustment for maximizing windows in a genereport panel*****/
//            this.setPosition(0, 0);         //this is the original statement
//            this.fitContainer();            //this is the original statement

            //var vs = this.container.getViewSize();
/*            var grp_tab = biogps.centerTab.get('report_panel');
            var bx = this.container.getBox();
            var tab_bx = grp_tab.getPositionEl().getBox();

            var width = bx.width - 15;
            var y = (tab_bx.y>bx.y)?tab_bx.y-bx.y:0;
            //var height = Math.min(Math.max((tab_bx.height-bx.y+25), bx.height), biogps.centerTab.el.getHeight()-(y+bx.y));
            var height = Math.min(bx.height, biogps.centerTab.el.getHeight()-(y+bx.y));*/

            var grp_tab = biogps.centerTab.get('report_panel');
            var bx = this.container.getBox();
            var tab_bx = grp_tab.body.getBox();

            var width = bx.width;
            var y = Math.max(tab_bx.y, bx.y);
            var height = tab_bx.y + tab_bx.height -y;

            this.flag_bypasspluginsync = true;
            this.setPagePosition(bx.x, y);
            this.setSize(width, height);
            this.flag_bypasspluginsync = false;
            //set maximized flag in this.plugin.useroptions
            if (this.plugin){
                if (!this.plugin.useroptions) this.plugin.useroptions = {};
                this.plugin.useroptions.maximized = true;
            }

            /*****end of adjustment*****/
            this.fireEvent('maximize', this);
        }
        return this;
    },

    restore: function(){
        this.flag_bypasspluginsync = true;
        this.constructor.superclass.restore.call(this);
        this.flag_bypasspluginsync = false;
        //clean up maximized flag in this.plugin.useroptions
        if (this.plugin && this.plugin.useroptions){
            delete this.plugin.useroptions.maximized;
            if (biogps.isEmptyObject(this.plugin.useroptions)) this.plugin.useroptions=null;
        }
    },

    //override original close method for asking confirmation
    close: function(options){
        if (options && options.bypass_confirmation){
            if (options.suspend_events) this.suspendEvents();
            this.constructor.superclass.close.call(this);
            if (options.suspend_events) this.resumeEvents();
        }
        else {
            var x = Ext.MessageBox.confirm('Remove Plugin?',
                           String.format('Are you sure that you want to remove <br />this plugin "{0}" from your layout? <br /><br /> Remember to click "options-->Save" to make it PERMANENT.', this.title),
                           function(btn){
                                if (btn == 'yes'){
                                    if (options && options.suspend_events) this.suspendEvents();
                                    this.constructor.superclass.close.call(this);
                                    if (options && options.suspend_events) this.resumeEvents();
                                }
                           },this);
        }
    },

    //override original focus method to avoid extra scrollbar movement.
    //Ref: http://www.extjs.com/forum/showthread.php?t=87053
    focus: Ext.emptyFn,

    /**
     * Hide overflowed text (and register a qtip with full text) if the title is too long
     */
    fixHeaderText: function(){
        var title_el = this.header.down('span.x-window-header-text');
        var actual_text_width = title_el.getTextWidth();
        var right_el = this.species_button? this.species_button.el:this.tools.gear;

        var available_width = right_el.getX() - 2 - title_el.getX() - 5;
        if (actual_text_width > available_width){
            //title is too long, so need a fix
            title_el.setStyle({'display':'block',
                               'overflow': 'hidden'});
            title_el.setWidth(available_width);
            Ext.QuickTips.register({target: title_el,
                                    text:this.title,
                                    dismissDelay: 0});
        }
        else {
            title_el.setStyle({'display':'inline',
                               'overflow': 'visible'});
            title_el.setWidth(actual_text_width);
            Ext.QuickTips.unregister(title_el);
        }
    },

    /**
     * Show an error msg in current portlet window
     * @param {} errmsg
     */
    showError: function(errmsg){
        this.items.clear();
        this.body.update(errmsg);
    },

    _loadContent: function(){
            switch(this.plugin.type){
                case 'div':
                        //var loader = this.frameEl.getUpdater();
                        var loader = this.body.getUpdater();
                        //var loader = this.mifChild.getEl().getUpdater();
                        loader.on({beforeupdate: this.showLoading,
                                   update: function(){this.fireEvent('contentload');},
                                   options: {single: true},
                                   scope: this});

                        //This is to remove MIF.Component in this.items since we don't need iframe anymore for div type.
                        this.items.clear();

                        if (this.html){
                            loader.update(this.html)
                        }
                        else if (this.url) {
                            var _url,
                                scripts_enabled;
                            _url = this.url+'&container='+this.body.id;
                            if (_url.startsWith('http://')) {
                                //url is from different host
                                scripts_enabled = _url.startsWith('http://plugins.gnf.org/') || _url.startsWith('http://plugins-dev.gnf.org/');
                                if (this.plugin.options.securityAware)
                                    _url += '&host='+location.host;
                                _url = '/utils/proxy?url='+_url.replace(/&/g,'%26');
                                if (this.plugin.options.securityAware)
                                    _url += '&secure=1';
                            }
                            else {
                                scripts_enabled = true;
                            }
                            //this.frameEl.update(_url, scripts_enabled);
                            loader.update({url:_url, scripts:scripts_enabled});
                        }
                        else{
                            loader.update("HTML content is not available!")
                        }
                        break;
                case 'iframe':
                    this.setSrc(this.url);
                    break;
            }
    },

    loadContent: function(){
        if (this.plugin.url){
            this.showLoading();
            this.url = this.plugin.geturl(this.gene);
            this.updateCurrentSpecies();
            if (this.url){
                if (this.plugin.type=='iframe' && this.plugin.options.securityAware && !this.plugin.is_secure_cookie_set()){
                    //set_scecure_cookie first and then call _loadContent.
                    this.plugin.on('secure_cookie_set', function(){this._loadContent();}, this, {single:true});
                    this.plugin.set_secure_cookie();
                }
                else {
                    this._loadContent();
                }
            }
            else{
                var _gene = this.gene.getEntryGene();
                var err_msg = String.format('This plugin is not available for this gene: {0}({1}, {2})', _gene.Symbol,
                                                                                                              this.gene.EntrySpecies,
                                                                                                              this.gene.EntryGeneID);
                this.showError(err_msg);
                this.fireEvent('contentload');
            }
        }
        else {
            //This plugin is not loaded correctly (likely deleted.)
            var err_msg = "This plugin {0}(id: {1}) is not loaded correctly. \
                           Either you have deleted it already or you don't have the privilege to access it.\
                           <br /><br />If this is your own layout, you might want to remove it from this layout by closing this plugin window.</p>";
            this.showError(String.format(err_msg, this.plugin.title?'"'+this.plugin.title+'"': '', this.plugin.id));

        }

        if (this.plugin.title){
            this.setTitle(this.plugin.title);
            this.fixHeaderText();
        }
    },

    showLoading: function(){
        //this.setIconClass('loading-indicator');
        this.setIconClass('icon-loading');
    },

    onContentLoad: function(){
        this.setIconClass('icon-home');
    },

    refresh:function(){
        this.loadContent();
    },

    syncSize: function(){
        if (this.plugin && !this.maximized && !this.collapsed) {
            Ext.apply(this.plugin, this.getSize());
        }
    },

    syncLocation:function(){
        if (this.plugin && !this.maximized && !this.collapsed) {
            var pos = this.getPosition(local=true);
            Ext.apply(this.plugin, {left: pos[0], top: pos[1]});
        }
    },

    update: function(cfg){
        //update win based on cfg.height, cfg.width, cfg.top, cfg.left and cfg.minimized

        if (cfg.width != null && cfg.height != null)
            this.setSize(parseInt(cfg.width), parseInt(cfg.height));   //setSize fires "resize" event to call syncSize

        if (cfg.top != null && cfg.left != null){
            var container_xy = this.container.getAnchorXY();
            var _x = container_xy[0] + parseInt(cfg.left);
            var _y = container_xy[1] + parseInt(cfg.top);
            this.getPositionEl().moveTo(_x, _y, cfg.animate);
            if (!cfg.animate) this.fireEvent('move', this, _x, _y); // if cfg.animate, callback is defined in cfg.animate.
        }
        if (cfg.minimized && !this.collapsed)
            this.collapse();
        if (cfg.maximized && !this.maximized)
            this.maximize();

    },

    /**
     * return current layoutdata object
     * @return {object} an object with "id", "left", "top", "height", "width" and optional "useroptions".
     */
    getLayoutData: function(){
        //var box = this.getBox(local=true);
        var box = this.plugin.getPositioning();
        var p = {id: this.plugin.id,
                 left: box.left,
                 top: box.top,
                 height: box.height,
                 width: box.width
        };

        if (this.plugin.useroptions){
            p.useroptions = this.plugin.useroptions
        }

        //store currentSpecies in useroptions
        if (this.plugin && this.plugin.runtimeoptions && this.plugin.runtimeoptions.currentSpecies){
            if (!p.useroptions) p.useroptions = {};
            p.useroptions.currentSpecies = this.plugin.runtimeoptions.currentSpecies;
        }

//        if (this.collapsed){
//            if (! p.useroptions) p.useroptions = {};
//            p.useroptions.minimized = this.collapsed;
//        }
//        else if (p.useroptions){
//            delete p.useroptions.minimized;
//        }

//        if (this.maximized){
//            if (! p.useroptions) p.useroptions = {};
//            p.useroptions.maximized = this.maximized;
//        }
//        else if (p.useroptions){
//            delete p.useroptions.maximized;
//        }
        return p;
    },

    toggleFrame: function(){
/*        var win = this.win;
        win.options.showframe = ! win.options.showframe;
        win.options.draggable = win.options.showframe;
        win.options.resizable = win.options.showframe;
        if (win.options.showframe){
            this.setFrameCls();
            win.setTitle(this.plugin.title);
        }
        else {
            this.setClearCls();
            win.setTitle('');
        }*/
    },


    showOptionMenu: function(btn){
        if (!btn.menu){
            //Add qtip to menuitem
            //Ref: https://extjs.com/forum/showthread.php?t=77312 , with minor modifications.
            var reg_tip = function( thisMenu ) {
                thisMenu.tip = new Ext.ToolTip({
                    target: thisMenu.getEl().getAttribute("id"),
                    delegate: ".x-menu-item",
                    trackMouse: true,
                    renderTo: document.body,
                    text: "text",
                    //title: "title",
                    listeners: {
                        beforeshow: function updateTip( tip ) {
                            var menuItem = thisMenu.ownerCt.findById( tip.triggerElement.id );
                            //var menuItem = Ext.getCmp( tip.triggerElement.id );
                            if( !menuItem.initialConfig.qtip ) return false;

                            //tip.header.dom.firstChild.innerHTML = menuItem.initialConfig.qtitle;
                            tip.body.dom.innerHTML = menuItem.initialConfig.qtip;
                        }
                    }
                });
            };

            var om = new Ext.menu.Menu();
            om.add({text: 'Open in browser',
                    qtip: 'Open this plugin in a new browser window',
                    iconCls: 'icon-pagego',
                    handler: function(){window.open(this.url);},
                    scope:this,
                    listeners: {afterrender: reg_tip}
                    });
            om.add({text: 'Plugin details',
                    qtip: 'Show plugin details',
                    iconCls: 'icon-info',
                    handler: function(){this.showInfo(btn);},
                    scope:this,
                    listeners: {afterrender: reg_tip}
                    });
            om.add({text: 'Refresh',
                    iconCls: 'icon-refresh',
                    qtip: 'Refresh this plugin',
                    handler: function(evt, btn){this.refresh();},
                    scope:this,
                    listeners: {afterrender: reg_tip}
                    });
            om.add({text: 'Flag plugin',
                    qtip: 'Flag as broken or inappropriate',
                    iconCls: 'icon-flag',
                    handler: function(){this.flagit();},
                    scope:this,
                    listeners: {afterrender: reg_tip}
                    });
            btn.menu = om;
        }
        btn.menu.show(btn);
    },

    showInfo: function(info_btn){
        var infotpl = new Ext.Template(
        '<table width="100%">',
            '<tr><td class="genesummary_head" colspan="2">Plugin details:<br></td></tr>',
            '<tr><td class="genesummary_name">Title:</td><td class="genesummary_text">{title}</td></tr>',
            '<tr><td class="genesummary_name">ID:</td><td class="genesummary_text">{id}</td></tr>',
            '<tr><td class="genesummary_name">URL:</td><td class="genesummary_text"><div style="width:100%; overflow:auto;">{realurl}</div></td></tr>',
            '<tr><td class="genesummary_name">URL tpl:</td><td class="genesummary_text"><div style="width:100%; overflow:auto;">[<a href="{url}" target="_blank">mouse over to see</a>]</div></td></tr>',
            '<tr><td class="genesummary_name">Type:</td><td class="genesummary_text">{type}</td></tr>',
            '<tr><td class="genesummary_name">Registered by:</td><td class="genesummary_text">{author}</td></tr>',
            '<tr><td class="genesummary_name">Description:</td><td class="genesummary_text">{description}</td></tr>',
        '</table>'
        ).compile();

        if (this.infopanel){
            this.infopanel.destroy();
            this.infopanel = null;
            return;
        }

        info_btn = info_btn || this.tools.help;

        this.infopanel =    new Ext.Panel({
                            id:this.id+'_infopanel',
                            layout:'fit',
                            floating: true,
                            renderTo: this.el,
                            width: 250,
                            html: infotpl.apply(Ext.apply({realurl: this.url?'[<a href="'+this.url+'" target="_blank">open in a new window</a>]':'NA'}, this.plugin)),
                            frame: true,
                            buttonAlign: 'center',
                            buttons: [{
                                text:'OK',
                                handler: function(){
                                    this.infopanel.destroy();
                                    this.infopanel = null;
                                },
                                scope: this
                            }]
                        });
        this.infopanel.on('show', function(){this.infopanel.el.alignTo(info_btn, 'tr-br', [0, 7]);}, this)
        this.infopanel.show();
    },

//    remove: close,    //aliase to this.close for back-compatibility, should not need after replace remove with close at all other places.
/*    remove2: function(){
        this.close()
        this.removed = true;
    },*/

    sameAs: function(otherp){
        //compare if otherp is the same plugin as self.
        //return ((this.plugin.id == otherp.id) && (this.plugin.options == otherp.options));
        return ((this.plugin.id == otherp.id));
    },

    flagit: function(){
        //flag a plug as inapprapriate content.
        if (this.plugin) {
            this.plugin.showFlagAsInappropriateForm(this.el);
        }
    },

    isOverlapWith: function(portlet_b, d){
        //return true if this portlet is overlap with another portlet_b
        var b1 = this.getBox(local=true);
        var b2 = portlet_b.getBox(local=true);

        if(d) console.log(b1.x+b1.width, b2.x, b1.x+b1.width>b2.x,
                    b2.x+b2.width,b1.x, b2.x+b2.width>b1.x,
                    b1.y+b1.height,b2.y, b1.y+b1.height>b2.y,
                    b2.y+b2.height,b1.y, b2.y+b2.height>b1.y);

        if (((b1.x+b1.width>b2.x && b2.x+b2.width>b1.x) &&
             (b1.y+b1.height>b2.y && b2.y+b2.height>b1.y))){
//        if ( ((b1.x+b1.width>b2.x) && (b1.y+b1.height>b2.y)) ||
//             ((b2.x+b2.width>b1.x) && (b2.y+b2.height>b1.y)) ){
            return true;
        }
        else{
            return false;
        }
    },

    getPositionNextTo: function(portlet_b, width_constrain) {
        //return x,y location next to given portlet, but subject to width_contrain
        var this_box = this.getBox(local=true);
        var last_box = portlet_b.getBox(local=true);

        var _x = last_box.x + last_box.width + 5;
        var _y = last_box.y;
        if (_x + this_box.width>width_constrain){
            _x = 0;
            _y = last_box.y + last_box.height + 5;
        }
        return {x:_x, y:_y};
    },

    renderSpeciesSelector: function(){
        var species_list, species_menu, species_button;
        if (this.plugin){
            species_list = this.plugin.getAvailableSpecies(this.gene, applyuseroptions=true);//  getAllowedSpecies();
            if (species_list.length>0){
                species_menu = new Ext.menu.Menu();
                var _this = this;
                var _id = Math.round(Math.random()*100,0).toString();  //generate a unique id for "group" below.

                biogps.AVAILABLE_SPECIES.each(function(s){species_menu.add({text: s.capitalize(),
                                                                 checked: false, //(s == _this.plugin.currentspecies),
                                                                 disabled: species_list.indexOf(s) == -1,
                                                                 group: _id+'_selectedspecies',
                                                                 handler: _this.onSpeciesSwitch,
                                                                 scope: _this
                                                                });});


                species_button = new Ext.Button({text: '', //'&nbsp;&nbsp;&nbsp;&nbsp;',
                                                 menu:species_menu,
                                                 cls: 'x-tool-species'
                                                 });
                species_button.on('click', function(btn){btn.showMenu();});
                species_button.on('mouseover', function(btn){
                    var label_el = Ext.fly(Ext.DomQuery.selectNode('span.x-tool-species-label', btn.getEl().dom));
                    if (label_el){
                        label_el.addClass('x-tool-species-label-over');
                    }
                }, this);
                species_button.on('mouseout', function(btn){
                    var label_el = Ext.fly(Ext.DomQuery.selectNode('span.x-tool-species-label', btn.getEl().dom))
                    if (label_el){
                        label_el.removeClass('x-tool-species-label-over');
                    }
                }, this);
                species_button.render(this.header);
                this.species_menu = species_menu;
                this.species_button = species_button;


            }

        }
    },

    onSpeciesSwitch: function(item, evt){
        if (!item.checked) {
            //no action, if checked species is selected again.
            var current_species = item.text.toLowerCase();
            if (this.plugin){
                this.plugin.runtimeoptions = this.plugin.runtimeoptions || {};
                this.plugin.runtimeoptions.currentSpecies = current_species;
                this.loadContent();
                this.fireEvent('speciesswitch', this);
            }
        }
    },

    updateCurrentSpecies: function(){
        if (this.species_button && this.species_menu) {
            var current_species = this.plugin.current_species;
            var species_labels = {'human': '<span class="x-tool-species-label">Species:&nbsp;Hs&nbsp;</span>',
                                  'mouse': '<span class="x-tool-species-label">Species:&nbsp;Mm</span>',
                                  'rat': '<span class="x-tool-species-label">Species:&nbsp;Rn</span>',
                                  'drosophila': '<span class="x-tool-species-label">Species:&nbsp;Dm</span>',
                                  'c. elegans': '<span class="x-tool-species-label">Species:&nbsp;Ce</span>',
                                  'zebrafish': '<span class="x-tool-species-label">Species:&nbsp;Dr</span>',
                                  'arabidopsis': '<span class="x-tool-species-label">Species:&nbsp;At</span>'
                                  }

            this.species_button.setText(species_labels[current_species]);
            for (var i=0;i<this.species_menu.items.length;i++){
                var o = this.species_menu.items.get(i);
                o.setChecked(o.text.toLowerCase()==current_species);
            }
        }
    }

});

Ext.reg('biogpsportlet', biogps.Portlet);


/**
 * @class biogps.GeneReportMgr
 * @extends Ext.util.MixedCollection
 * @singleton
 * This is a singletons manager for all genereport pages rendered on "genereport_panel".<br/>
 * @author Chunlei Wu, Marc Leglise
 */
biogps.GeneReportMgr = Ext.apply(new Ext.util.MixedCollection(), {
    rendered: false,
	populateGeneListPanel: false,

    register : function(){
        for(var i = 0, s; s = arguments[i]; i++){
            this.add(s);
        }
    },

    unregister : function(){
        for(var i = 0, s; s = arguments[i]; i++){
            this.remove(this.lookup(s));
        }
    },

    lookup : function(id){
        return typeof id == "object" ? id : this.get(id);
    },

    getGeneidList: function(){
		var gidlist = [];
		this.each(function(item){gidlist.push(item.geneid);});
		return (gidlist);
    },

    makeTitle: function(){
        //make a title string based on rendered gene report page(s)
        var title = '';
        if (this.length == 1){
            //if only one genereport, use the its title string
            title = this.getReport(0).title;
        }
        else if (this.length > 1){
            //if more than one genereport pages, use concatenated gene symbols
            var gene_list = [];
            this.each(function(item){gene_list.push(item.gene.getEntryGene().Symbol)});
            title = gene_list.join(' , ');
        }
        return (title);
    },

    getReport: function(i){
    	return this.get(i);
    },

    /**
     * @method
     * Collapse all of the PluginQuickAdd widgets to prevent the lists from
     * displaying on top of other elements (like the plugin library).
     */
    collapseQuickLists: function(){
        this.each(function(o){
            o.grp_tbar.quickPluginBox.collapse();
        })
    },

    /**
     * @method
     * Update each biogps.GeneReportPage, passing the 'true' parameter, causing
     * any new plugins in the in-memory layout_data to get rendered, but
     * leaving existing plugins intact.
     */
    updateAll: function(){
        this.each(function(o){
            o.updatePage(true);
        })
    },

    refreshAll: function(){
        if (biogps.centerTab.activeTab.id != 'report_panel'){
            biogps.centerTab.setActiveTab('report_panel');
        }
    	this.each(function(o){
			o.grp_tbar.createLayoutMenu();
		    o.renderPage();
    	});
    },

    /**
     * Refresh genereport page if the current layout is the input layout.
     * @param {Object} layout biogps.Layout object
     */
    refreshLayout: function(layout){
        this.each(function(grp){
            if (grp){
                if (grp.grlayout.layout_id == layout.layout_id){
                    if (biogps.centerTab.activeTab.id == 'report_panel'){
                        //if report_panel is currently active, do the refresh right the way
                        grp.refresh(updateonly=true);
                    }
                    else {
                        //otherwise, set need_refresh flag to do the refresh next time the report_panel tab is activated.
                        grp.need_refresh = true;
                    }
                }
            }
        });
    },

    /**
     * Refresh genereport page if need_refresh flag is set to true and reset the flag.
     */
    refreshMarked: function(){
        this.each(function(grp){
            if (grp && grp.need_refresh){
                grp.refresh(updateonly=true);
                grp.need_refresh = false;
                delete grp.need_refresh;
            }
        });
    },

    removeAll: function(){
        biogps.portletGroup.each(function(p){
            p.close({bypass_confirmation: true, suspend_events: true});
        });
        this.each(function(o){
            o.destroy();
        });
    	this.clear();
    	this.populateGeneListPanel = false;
    },

    markLayoutChanged: function(){
    	this.each(function(o){
    		if(o.grp_tbar)
    			o.grp_tbar.layoutmenu_need_sync = true;
    	});
    },

    bindLayoutMgr: function(){
    	//bind refreshAll to 'layoutloaded' event of biogps.LayoutMgr
    	biogps.clearListeners(biogps.LayoutMgr, 'layoutloaded');
		biogps.LayoutMgr.on('layoutloaded', function(){

			biogps.GeneReportMgr.refreshAll();
		});
    },

    render: function(geneid_list, targetEl){
        if (biogps.LayoutMgr.layoutloading){
			var dt = new Ext.util.DelayedTask();
			dt.delay(100, function(){
			    this.render(geneid_list, targetEl);
			},this);
        }
        else{
            //do the actual rendering of genereport pages for input geneid_list
            this.removeAll();
            this.rendered = false;
    	    if (biogps.genelist_panel.genelist_node && biogps.genelist_panel.genelist_node.childNodes.length==0)
    	        this.populateGeneListPanel = true;
            Ext.fly(targetEl).dom.innerHTML = '';
    	    for (var i=0;i<geneid_list.length;i++){
    	        var page = new biogps.GeneReportPage({geneid: geneid_list[i]});
                page.render(Ext.fly(targetEl).dom);
                this.register(page);
    	    }
    	    this.bindLayoutMgr();

            //check if all genereport pages are rendered.
    		var runner = new Ext.util.TaskRunner();
            var task = {
    		    run: function(cnt){
                    var _all_rendered = true;
                    for (var i=0;i<this.length;i++){
                        var grp = this.getReport(i);
                        if (!(grp && grp.rendered)){
                            _all_rendered = false;
                            break;
                        }
                    }
                    if (_all_rendered) {
    			        this.rendered = true;
    			        biogps.Messenger.fireEvent('genereportrendered');
                        runner.stop(task);
                    }
    		    },
                scope: this,
    		    interval: 50
    		}
    		runner.start(task);
		}
    }

});

biogps.renderGeneReport = function(containerid, parentid, geneid_list){
    var container = Ext.getCmp(containerid);
    var containerEl = container.getEl();
    var parentcontainer = Ext.getCmp(parentid);

    if (!container){
    	container = Ext.getBody().createChild({tag: 'div', id: containerid});

    	parentcontainer.add({
                    contentEl:containerid,
                    title: 'Gene Report',
                    layout: 'fit',
					closable:true,
                    autoScroll:true
    	});
    	parentcontainer.doLayout();
    	biogps.centerTab.suspendEvents();
    	parentcontainer.setActiveTab(parentcontainer.items.getCount()-1);
    	biogps.centerTab.resumeEvents();
    }
    else{
    	container.enable();
    }

    biogps.centerTab.suspendEvents();    //avoid to fire "tabchange" event
	parentcontainer.setActiveTab(containerid);
	biogps.centerTab.resumeEvents();

    var loadmask = new Ext.LoadMask(parentcontainer.getEl(), {msg: 'Rendering...'});
    loadmask.show();

//    biogps.GeneReportMgr.removeAll();
//    if (biogps.genelist_panel.genelist && biogps.genelist_panel.genelist.childNodes.length==0)
//    	biogps.GeneReportMgr.populateGeneListPanel = true;
//	Ext.fly('reportpanel').dom.innerHTML = '';
//    for (var i=0;i<geneid_list.length;i++){
//
//		var tabs = new biogps.GeneReportTab({geneid: geneid_list[i]});
//		//tabs.render(containerEl.dom);
//		tabs.render(Ext.fly('reportpanel').dom);
//		biogps.GeneReportMgr.register(tabs);
//    }
//    biogps.GeneReportMgr.bindLayoutMgr();

    biogps.GeneReportMgr.render(geneid_list, 'reportpanel');
	loadmask.hide();
	loadmask.destroy();
};

biogps.renderGeneReport2 = function(geneid, calledfromurl){
	//a shortcut for biogps.renderGeneReport
	//calledfromurl set to true when it is called from a deeplinking url.
	calledfromurl = calledfromurl?calledfromurl:false;
	if (isArray(geneid))
		var geneid_list = geneid
	else
	    var geneid_list = [geneid]

	if (!calledfromurl){
		var token = 'goto=genereport&id='+geneid_list.join(',');
		//if (token == biogps.getHash()){
        if (token == Ext.History.getToken()){
			//if token is the same, re-render the genereport without changing the history
			biogps.renderGeneReport('report_panel', 'center_panel', geneid_list);
		}
		else{
			//add token to the history stack, renderGeneReport will be triggered by history "change" event.
			Ext.History.add(token);
		}
	}
	else{
		biogps.renderGeneReport('report_panel', 'center_panel', geneid_list);
	}
}




biogps.GeneReportToolbar = function(config) {
	this.grp = null;
	Ext.apply(this, config);
	//this.layouttext = new Ext.Toolbar.TextItem({text: 'current layout:'});
	this.initLayoutMenu();
	this.initOptionMenu();
	this.geneTitle = new Ext.Toolbar.TextItem({text:' ',cls:'gene-report-title'});
	this.notification = new Ext.Toolbar.TextItem({text:' '});
    this.layout_icon = new Ext.Toolbar.TextItem({text:' '});
	this.quickPluginBox = new biogps.PluginQuickAdd({grp: this.grp});
	biogps.GeneReportToolbar.superclass.constructor.call(this,{
	    cls: 'gene-report-header',
		items: [this.geneTitle,
		        '->',
		        this.notification,
                this.layout_icon,
		        'current layout:', ' ',
		        this.layoutbutton,
		        '|',' ',
		        {text: 'options', menu: this.optionmenu},
		        this.quickPluginBox
		       ]
	});
	this.layoutmenu_need_sync = false;
};
Ext.extend(biogps.GeneReportToolbar, Ext.Toolbar, {

	initLayoutMenu: function(){
		this.layoutmenu = new Ext.menu.Menu();
		this.layoutmenu.on('beforeshow', function(){
			if (this.layoutmenu_need_sync){
				this.createLayoutMenu();
				this.layoutmenu_need_sync = false;
			}
		}, this);

		if (this.grp && this.grp.grlayout && this.grp.grlayout.layout_name){
			var current_layoutname = this.grp.grlayout.layout_name;
		}
		else{
			var current_layoutname = "click to select";
		}

		this.layoutbutton = new Ext.Toolbar.Button({text: String.format('<b>{0}</b>', current_layoutname),
													 menu:this.layoutmenu});
		this.createLayoutMenu();
	},

	initOptionMenu: function(){
//		this.layoutmenu = new Ext.menu.Menu();
//		this.layoutmenu.on('beforeshow', function(){
//			if (biogps.LayoutMgr.layoutmenu_need_sync){
//				this.createLayoutMenu();
//				biogps.LayoutMgr.layoutmenu_need_sync = false;
//			}
//			}, this);
		this.optionmenu = new Ext.menu.Menu({
	        items: [
                {text: 'Tile windows', handler: function(){this.grp.tilePluginWindows('area');}, scope: this},
//                {text: 'Tile windows (index)', handler: function(){this.grp.tilePluginWindows();}, scope: this},
                {text: 'Tile windows (compact)', handler: function(){this.grp.tilePluginWindows_compact();}, scope: this},
//	        	{text:this.grp.showframe?'Hide frame':'Show frame', handler: this.toggleFrame, scope:this},
                {text: 'Open all in browser', handler: function(){this.grp.openAllInBrowser();}, scope: this},
		    	{text: 'Refresh/Revert', handler: function(){this.grp.refresh();}, scope: this},
		        {text: 'Save', id:'lmenu_save', handler: function(){this.grp.saveCurrentLayout();}, scope: this},
		        {text: 'Save as new...', id:'lmenu_saveas', handler: function(){this.grp.saveAsNewLayout();}, scope: this}
//		        '-',
//		        {text: 'Switch', id:'lmenu_switch', menu: this.layoutmenu,
//		         //This a fix for preventing submenu to close when it is clicked
//		         // ref  http://extjs.com/forum/showthread.php?t=14113
//		         handler: function(obj, evt){return false;}
//		        }
	    		]
		});

		this.optionmenu.on('beforeshow', function(){
			if(biogps.usrMgr.is_anonymoususer){
				this.optionmenu.items.get('lmenu_saveas').disable();
			}
			else {
				this.optionmenu.items.get('lmenu_saveas').enable();
			}
            if(biogps.usrMgr.is_anonymoususer || (this.grp && this.grp.grlayout.isSharedLayout())){
                this.optionmenu.items.get('lmenu_save').disable();
            }
            else {
                this.optionmenu.items.get('lmenu_save').enable();
            }

		},this);

//		this.createLayoutMenu();

	},

	createLayoutMenu: function(){
		if (!this.layoutmenu)
			return;

		this.layoutmenu.removeAll();
		this.layoutmenu.add('<b class="menu-title">My layouts:</b>');
		var shared_layouts = []
		var cnt_my_layouts = 0;
        var layout;
		for (var i=0;i<biogps.LayoutMgr.availableLayouts.length;i++){
			layout = biogps.LayoutMgr.availableLayouts[i];
			if (layout.is_shared){
				shared_layouts.push(layout);
			}
			else{
				this.layoutmenu.add({
		                            text: layout.layout_name,
		                            //checked: layout.layout_name==biogps.usrMgr.currentLayout.layout_name,
		                            checked: (biogps.LayoutMgr.currentLayout != null && (layout.id==biogps.LayoutMgr.currentLayout.id)),
		                            value: layout.id,
		                            group: 'selectedlayout',
		                            checkHandler: this.onLayoutSwitch,
		                            scope: this
		                        	});
		        cnt_my_layouts += 1;
			}
		}
		if (cnt_my_layouts == 0){
			this.layoutmenu.add({text: 'you don\'t have any yet', disabled:true});
		}
		if (shared_layouts.length > 0){
			this.layoutmenu.add('<b class="menu-title">Shared layouts:</b>');
			for (var i=0;i<shared_layouts.length;i++){
				layout = shared_layouts[i];
				this.layoutmenu.add({
		                            text: layout.layout_name,
		                            //checked: layout.layout_name==biogps.usrMgr.currentLayout.layout_name,
		                            checked: (biogps.LayoutMgr.currentLayout !=null && layout.id==biogps.LayoutMgr.currentLayout.id),
		                            value: layout.id,
		                            group: 'selectedlayout',
		                            checkHandler: this.onLayoutSwitch,
		                            scope: this
		                        	});
			}
		}
	},

	updateLayoutMenu: function(){
		//refresh biogps.usrMgr.availableLayouts and re-create layoutmenu
		//biogps.usrMgr.loadAllLayout();
        biogps.LayoutMgr.reloadAvailableLayout();
//		biogps.LayoutMgr.on('availablelayoutupdated', function(){
//			biogps.GeneReportMgr.markLayoutChanged();
//		},this);
//		biogps.LayoutMgr.loadAvailableLayout();
	},

	setLayoutName: function(layout_name){
		this.layoutbutton.setText(String.format('<b>{0}</b>', layout_name));
	},

	setGeneTitle: function(title){
	    if (title.length > 60) { title = title.substring(0, 55) + '...' }
	    if (this.geneTitle.rendered){
		  this.geneTitle.setText(title);
        }
        else {
            this.geneTitle.on('render', function(){this.setGeneTitle(title);}, this, {single: true})
        }
	},

	notify: function(text){
        if (text.startsWith('Error')){
            text = '<font color="red">'+text+"</font>";
        }
        if (this.notification.rendered){
		  this.notification.setText(text);
        }
        else {
            this.notification.on('render', function(){this.notify(text);}, this, {single: true})
        }
	},

    setLayoutIcon: function(cls, msg){
        if (this.layout_icon.rendered){
            this.layout_icon.el.addClass(cls);
            Ext.QuickTips.register({target: this.layout_icon.el,
                                    text:msg,
                                    dismissDelay: 0});
        }
        else {
            this.layout_icon.on('render', function(){this.setLayoutIcon(cls, msg);}, this, {single: true})
        }
    },

    removeLayoutIcon: function(cls){
        if (this.layout_icon.rendered){
            this.layout_icon.setText('');
            this.layout_icon.el.removeClass(cls);
            Ext.QuickTips.unregister(this.layout_icon.el);
        }
    },

	onLayoutSwitch: function(item, checked){
		if (checked){
			this.grp.switchLayout(item.value);
		}
	}

});



biogps.GeneReportPage = function(config) {
    this.title='';
	this.gene = null;
	this.geneid = null;
	this.grlayout = biogps.LayoutMgr.currentLayout;
	this.showframe = true;
	Ext.apply(this, config);
	this.id = 'grp_' + this.geneid,
	this.globalPortletIndex = 0;  //used for create unique id for windows class
	this.addEvents({load: true});
	this.portlets = new Array();
    this.reportRendered = false;   //a flag to indicate if a gene report content is rendered.
    this.layout_modified_icon = 'icon-layout-alert';
    this.flag_donotsynclayout = false;
    this.flag_bypassclosecallback = false;

    this.gene = new biogps.Gene({id: this.geneid});

	this.grp_tbar = new biogps.GeneReportToolbar({
		grp: this,
		id: this.id+'_tbar'
	});

	biogps.GeneReportPage.superclass.constructor.call(this, {
        border: true,
        cls: 'gene-report-page',
        autoWidth: true,
        //anchor:"100% 100%",
        //height: "100%",
        height: 100,   //initial value, will be updated later
        deferredRender:true,
        //autoHeight: true,
        //layoutOnTabChange: true,
        //autoScroll:true,
        autoScroll:this.showframe,
        autoEl: true,
        tbar: this.grp_tbar

        //contentEl: "reportpage",
        //layout: 'absolute'
    });

    this.on('render', this.renderPage,this);



    this.store = new Ext.data.JsonStore({
		url: '/service/getgeneidentifiers/?geneid='+this.geneid+'&format=json',
		fields: [],
		autoLoad: true
	});

	this.store.on('beforeload', this.showLoading,this);
	this.store.on('load', function(st){
		this.gene = Ext.apply(this.gene, st.reader.jsonData);
		this.addTabs();
		if (biogps.GeneReportMgr.populateGeneListPanel){
			//var _gene = this.gene[this.gene.EntrySpecies];
            var _gene = this.gene.getEntryGene();
			if (_gene){
				var g = {};
				g.id = _gene.EntrezGene || _gene.EnsemblGene
				if (g.id){
				    g.name = _gene.Description || ''
				    g.symbol = _gene.Symbol || ''
				    biogps.genelist_panel.addGene({id: g.id,
   						  						   symbol:g.symbol,
   						                           name:g.name,
        				                           text: g.symbol
    					  						   }, true, true);
				}
			}
		}
	}, this);
	this.store.on('loadexception', biogps.ajaxfailure, this);
};

Ext.extend(biogps.GeneReportPage, Ext.Panel, {
    showLoading: function(){
		this.add({title:'Please wait...', id:'tmp_loading', height:100});
	    this.loadmask = new Ext.LoadMask(this.getEl(), {msg: 'Loading...'});
	    this.loadmask.show()
	},

	removeLoading: function(){
		if (this.loadmask){
			this.loadmask.hide();
	    	this.loadmask.disable();
	    	this.remove('tmp_loading', true);
		}
	},

	addTabs: function(){
		if (this.gene){

		    if (biogps.LayoutMgr.layoutloading){
    			var dt = new Ext.util.DelayedTask();
    			dt.delay(100, function(){
    			    this.addTabs();
    			},this);
            }
            else{
    		    this.removeLoading();
    		    var _gene = this.gene.getEntryGene();
    			var symbol = _gene.Symbol;
    			var description = _gene.Description || 'no description';
    			if (description.length > 100){
    				description = description.substring(0, 96) + '...'
    			}
                var title = String.format("{0} ({1})", (symbol || this.geneid), description);
                this.setTitle(title);
                this.grp_tbar.setGeneTitle(title);
    			this.doLayout();
    		}
		}
    },

    checkLayout: function(){
        //Check layout_data
        if (!this.grlayout){
            this.grp_tbar.notify('Error: This layout is not available! Please select another one using the layout menu on the right side.');
            return false;
        }
        else if (!this.grlayout.layout_data || this.grlayout.layout_data.length == 0){
            this.grp_tbar.notify('Error: This layout does not contain any plugin. Please select another one using the layout menu on the right side.');
            return false;
        }
        return true;

    },

    //private
    setInitialCanvasHeight: function(){
        var plugin;
        var measured_height = 0;
        for (var i=0;i<this.grlayout.layout_data.length;i++){
            plugin = new biogps.Plugin(this.grlayout.layout_data[i]);
            if (plugin.hasPositioning()){
                var _y = parseInt(plugin.top);
                measured_height = Math.max(measured_height, _y + plugin.height);
            }
        }
        this.height =  measured_height + 120;
        this.setCanvasHeight(this.height);
    },

    createNewPortlet: function(plugin) {
        var portlet;
        var firsttime_plugin = !plugin.hasPositioning();
        var winid = 'win_'+this.geneid+'_'+this.globalPortletIndex.toString();
        this.globalPortletIndex++;
        portlet = new biogps.Portlet({id: winid,
                                      plugin: plugin,
                                      gene: this.gene,
                                      x: plugin.left,
                                      y: plugin.top,
                                      width: plugin.width,
                                      height: plugin.height,
                                      renderTo: this.body.id});
        portlet.show();
        portlet.on('resize', this.onPortletResize, this);
        portlet.on('move', this.onPortletMove, this);
        portlet.on('close', this.onPortletRemove, this);
        portlet.on('maximize', this.onPortletToggleMaximize, this);
        portlet.on('restore', this.onPortletToggleMaximize, this);
        portlet.on('speciesswitch', function(p){this.syncLayout();}, this);

        portlet.firsttime = firsttime_plugin;
        return portlet;
    },

    postPageRendered: function(){
        this.updateSize();
        this.grp_tbar.setLayoutName(this.grlayout.layout_name);
        if (this.portlets.length == 0){
            this.grp_tbar.notify('Error: This layout does not contain any plugin.');
            return;
        }
        else {
            this.grp_tbar.notify('');
        }
        this.placeFirstTimePlugin();
        this.reportRendered = true;
        this.flag_donotsynclayout = false;

        if (this.grlayout.layout_modified){
            this.markLayoutModified();
        }
        else {
            this.markLayoutSaved();
        }

        //maximize any portlets marked with "maximized" as true in its options.
        var maximize_task = new Ext.util.DelayedTask(function(){
            this.flag_donotsynclayout = true;
            this.portlets.each(function(p){
                if (p.plugin.useroptions && p.plugin.useroptions.maximized){
                    p.maximize();
                }
            });
            this.flag_donotsynclayout = false;
        }, this);
        maximize_task.delay(500);

        //scroll to top of genereport page.
//        biogps.centerTab.getItem('report_panel').body.scrollChildIntoView(this.body);

        //tracking by Google Analytics
        _gaq.push(['_trackPageview', '/gene/'+this.geneid.toString()]);
        _gaq.push(['_trackEvent', 'BioGPS', 'GeneReport', this.geneid.toString()]);
    },

	renderPage: function(){
	    if (!this.gene.getEntryGene()){
			var dt = new Ext.util.DelayedTask();
			dt.delay(100, function(){
			    this.renderPage();
			},this);
        }
        else{
    		this.cleanPage();
    		this.grlayout = biogps.LayoutMgr.currentLayout;
            if (this.checkLayout() == false) return;

    		this.globalPortletIndex = 0;  //reset it.
    		var plugin;
    		var portlet;
    		var winid;
            this.setInitialCanvasHeight();
    		this.portlets = [];
            var firsttime_plugin = false;  //use to flag a plugin has no positioning parameters yet.
    		for (var i=0;i<this.grlayout.layout_data.length;i++){
    			plugin = new biogps.Plugin(this.grlayout.layout_data[i]);
                portlet = this.createNewPortlet(plugin);
    			this.portlets.push(portlet);
    		}

            this.postPageRendered();
        }
	},

	updatePage:function(fixexist){
        //update portlets with current this.grlayout
        //reuse existing portlets if possible
        //and create new portlets if not existing.
        // if "fixexist" is true, do not move/resize existing portlets based on the new layout_data.

        //if (this.checkLayout() == false) return;
        this.reportRendered = false;
        this.flag_donotsynclayout = true;
		var new_portlets = new Array(),
		    p, j, i,
		    portlet,
		    new_p,
		    winid;
        this.setInitialCanvasHeight();
		for (j=0;j<this.portlets.length;j++){
			delete this.portlets[j].keep_flag;    //clear any possible remaining keep_flag carried from previous layout.
		}

		for (i=0;i<this.grlayout.layout_data.length;i++){
			new_p = new biogps.Plugin(this.grlayout.layout_data[i]);
			new_p.existed_flag = false;
			for (j=0;j<this.portlets.length;j++){
				p = this.portlets[j];
				if (!p.removed && p.sameAs(new_p) && !p.keep_flag){
                    if (!fixexist) {
						//new_p.animate = true;
                        if (!Ext.isIE6){
                            new_p.animate = {duration: 0.35,
                                             callback: function(el){
                                                     this.updateSize();
                                                     var p = Ext.getCmp(el.id);
                                                     p.syncSize();
                                                     p.syncLocation();
                                                 },
                                             scope: this
                                            };
                        }
						p.update(new_p);   //update move/resize the existing portlet, also minimize it if specified.
                        p.loadContent();   //refresh content
                    }
					p.keep_flag = true;  //mark the p, so that it won't be removed
					new_portlets.push(p);
					new_p.existed_flag = true;
					break;

				}
			}
			if (!new_p.existed_flag){
				//then create new porlet
                portlet = this.createNewPortlet(new_p);
				new_portlets.push(portlet);
			}
		}

		//Now cleaning all old portlets don't need any more
		for (j=0;j<this.portlets.length;j++){
			p = this.portlets[j];
			if (!p.keep_flag){
                p.close({bypass_confirmation: true, suspend_events: true});
				p = null;
				delete p;
			}
		}
		this.portlets = new_portlets;

        this.postPageRendered();
	},

	cleanPage: function(){
		for (var j=0;j<this.portlets.length;j++){
            this.portlets[j].close({bypass_confirmation: true, suspend_events: true});
		}
		this.portlets = [];
		this.body.dom.innerHTML = '';
        this.reportRendered = false;
	},


    setCanvasHeight: function(height){
        this.setHeight(height);
        //this.body.setHeight(height);
        //this.ownerCt.body.setHeight(height);
    },

	updateSize: function(){
		//update the size of the portlet container
        var p;
		this.doLayout();
		var measured_height = 0;
		for (var i=0;i<this.portlets.length;i++){
			p = this.portlets[i];
            if (p.removed) continue;
            var bx = p.getBox(local=true);
            if (bx.y==0 && bx.height==0){
                bx = p.plugin.getPositioning();
                bx.y = bx.top;
            }
            measured_height = Math.max(measured_height, bx.y + bx.height);
		}
		measured_height = measured_height + 100;
        this.setCanvasHeight(measured_height);
	},

	onPortletResize: function(portlet){
	    //"Ext.ux.ManagedIFrame.Window" (from miframe.js, which biogps.Portlet
	    // is based on) has a bug to fire "resize event" in IE. When portlet is
	    // initializing, the iframe element will fire multiple "resize" events as well.
	    if (Ext.isIE && portlet.xtype != 'biogpsportlet'){ return; }

	    this.updateSize();
	    this.syncLayout();
	},

	onPortletMove: function(portlet){
	    this.updateSize();
	    this.syncLayout();
	},

    /**
     * This is the callback function triggered after a porlet window is toggled for maximizing,
     * so that the state of maiximizing is remembered.
     * @param {} portlet
     */
    onPortletToggleMaximize: function(portlet){
        this.syncLayout();
    },

    /**
     * This is the callback function triggered after a portlet window is removed.
     * @param {object} portlet
     */
    onPortletRemove: function(portlet){
        if (!this.flag_bypassclosecallback){
            var idx = this.portlets.indexOf(portlet);
            this.portlets.remove(portlet);
            if (this.grlayout.layout_data[idx].id == portlet.plugin.id){
                this.grlayout.layout_data.remove(this.grlayout.layout_data[idx])
            }
            this.updateSize();
            this.syncLayout();
        }
    },


//	customizeLayout: function(){
//		this.portlets.each(function(p) {p.setCustomizable()});
//		this.toggleScrollbar(false);
//		this.showframe = true;
//	},
//
//	fixLayout: function(){
//		this.portlets.each(function(p) {p.setFixed()});
//		this.toggleScrollbar(true);
//		this.showframe = false;
//	},

    /**
     * Refresh current layout.
     * @param {boolean} updateonly  if updateonly is true, use "updatePage" instead of "renderPage" for refreshing.
     */
	refresh: function(updateonly){
		this.reloadLayoutData({refreshRender: true, updateonly: updateonly});
	},

    /**
     * Return a biogps.Layout object with updated layout_data
     * @param {object} cfg: if cfg.positionOnly is true, the layout_data of returned layout
     *                       object contains only position data (ready for layout-saving).
     *                       Otherwise, the layout_data contains full plugin data.
     * @return {biogps.Layout}
     */
	getBiogpsLayout: function(cfg){
	    if (cfg && cfg.positionOnly){
	        this.grlayout.layout_data = this.getLayoutData();
	    }
	    else {
            var layout_data = [];
            for (var i=0;i<this.portlets.length;i++){
                if (!this.portlets[i].removed){
                    layout_data.push(this.portlets[i].plugin);
                }
            }
            this.grlayout.layout_data = layout_data;
        }
        return this.grlayout;
	},

    /**
     * Return layout_data as an array of position data collected from each portlet.
     * @return {array} layout_data
     */
	getLayoutData: function(){
		var layout_data = [];
		for (var i=0;i<this.portlets.length;i++){
			if (!this.portlets[i].removed){
				layout_data.push(this.portlets[i].getLayoutData());
			}
		}
		return layout_data;
	},

    /**
     * Sync biogps.LayoutMgr.currentLayout with the layout_data from the current genereport page
     */
    syncLayout: function(){
        if (!this.flag_donotsynclayout && this.grlayout.id == biogps.LayoutMgr.currentLayout.id){
            biogps.LayoutMgr.currentLayout = this.getBiogpsLayout();
            this.markLayoutModified();
        }
    },

    markLayoutModified: function(){
        var layout_modified_text = 'Layout has been modified.<br /> ';
        if (biogps.usrMgr.is_anonymoususer){
            layout_modified_text += 'You need to login to save the changes.';
        }
        else if (biogps.LayoutMgr.currentLayout.isMyLayout()){
            layout_modified_text += 'To save changes, click "options"-&gt;"Save".'
        }
        else {
            layout_modified_text += 'To save changes, click "options"-&gt;"Save as new..."';
        }
        layout_modified_text += '<br />To revert the changes, click "options"-&gt;"Refresh/Revert".';
        biogps.LayoutMgr.currentLayout.layout_modified = true;
        this.grp_tbar.setLayoutIcon(this.layout_modified_icon, layout_modified_text);
    },

    markLayoutSaved: function(){
        biogps.LayoutMgr.currentLayout.layout_modified = false;
        this.grp_tbar.removeLayoutIcon(this.layout_modified_icon);
    },

	//reloadLayoutData: function(refreshRender, updateonly){
    reloadLayoutData: function(options){
		//reload current this.grLayoutdata and biogps.usrMgr.currentLayout
        //options.updateonly
        //options.refreshRender
		biogps.LayoutMgr.on('currentlayoutloaded', function(){
			biogps.clearListeners(biogps.LayoutMgr, 'currentlayoutloaded');
			this.grlayout = biogps.LayoutMgr.currentLayout;
			if (options && options.refreshRender){
                if (options.updateonly)
                    this.updatePage();
                else
				    this.renderPage();
            }
		}, this);
		biogps.LayoutMgr.loadLayout(this.grlayout.id);

        //reload layout object if exists in biogps.usrMgr.availableLayouts
        var available_layouts = new Ext.util.MixedCollection();
        available_layouts.addAll(biogps.LayoutMgr.availableLayouts);
        var layout = available_layouts.get(this.grlayout.id);
        if (layout) layout.load();
        delete available_layouts;
	},

	saveCurrentLayout: function(cfg){
        //parameters:
        //cfg.saveEmptyLayout:   if true, save empty layout_data without confirmation.
        //cfg.quiet:             if true, no mask msg, no warning/error msg

        cfg = cfg || {};
		if (!this.grlayout || biogps.require_user_logged_in() == false){
			return;
		}
		//var layout_data = this.getLayoutData();
		var layout = this.getBiogpsLayout({positionOnly: true});

        //warn if layout_data are empty
        if (layout.layout_data.length == 0 && !cfg.saveEmptyLayout && !cfg.quiet){
	        var cancel_saving = false;
	        Ext.MessageBox.confirm('Save an empty Layout?',
	                               String.format('The layout "{0}" you are trying to save does not contain any plugin. Click "Yes" to save it anyway?', layout.layout_name),
	                               function(btn){
	                                    if (btn == 'yes'){
	                                        this.saveCurrentLayout({saveEmptyLayout: true});
	                                    }
	                               },
	                               this
	        );
            return;
        }

		layout.on('saved', function(data){
			this.reloadLayoutData();
            this.markLayoutSaved();
            if (!cfg.quiet){
            	this.body.unmask();
            	this.body.mask(String.format('Layout "{0}" saved!', biogps.LayoutMgr.currentLayout.layout_name));

    			var _body = this.body;
            	setTimeout(function(){
            		_body.unmask();
            		}, 1000);
            }

		},this);
		layout.on('savefailed', function(data){
            if (cfg.quiet) return;
			if (data.error == "Layout does not exist."){
				var x = Ext.MessageBox.confirm('Save as a new Layout?',
		                       String.format('The layout "{0}" you are trying to save does not exist (likely this is a shared layout from others), but you can save a copy of this layout to your profile. Continue?', biogps.LayoutMgr.currentLayout.layout_name),
		                       function(btn){
									if (btn == 'yes'){
										this.saveAsNewLayout();
									}
		                       },
		                       this
				);
			}
			else{
        		Ext.MessageBox.alert('Error', String.format('Saving Layout failed with the error message: <br><br>"{0}"', (data.error || '[None]')));
			}
        	this.body.unmask();
		}, this);

		layout.save();

	},

	saveAsNewLayout: function(asnew){
		if (!this.grlayout || biogps.require_user_logged_in() == false){
			return;
		}
		var layout_data = this.getLayoutData();

		biogps.layoutsavewin = new Ext.Window({
				title:'Save current layout',
				layout: 'fit',
				width: 320,
				labelWidth: 200,
				modal: true,
				autoHeight: true,
				stateful: false,
				plain: true,
				grp: this,
				listeners: {show:   {buffer : 10,
									 fn: function(win){
									 	win.items.get(0).items.get(0).focus();
			            				//bind Enter hotkey
										var kmap = new Ext.KeyMap(win.getEl(),[{
											key: 13,   //Enter key
											stopEvent: true,
											fn: doLayoutSave,
											scope: this.grp
										},{
											key: 27,   //ESC key
											stopEvent: true,
											fn:function(){
					            				biogps.layoutsavewin.close();
					            				delete biogps.layoutsavewin;
					            			}
										}]
										);
									}}
							},
				items: new Ext.FormPanel({
				    id:'layoutsaveform',
					labelWidth: 120,
					autoHeight: true,
					bodyStyle:'padding:5px 5px 5px 5px',
					border : false,
					items:[{xtype:'textfield',
							anchor: "90%",
		                	fieldLabel: "Name your layout",
		                	id:'layoutsaveform_name',
		                	name: 'layout_name',
		                	allowBlank:false}],
					buttons: [{
					            text:'Save',
					            handler: doLayoutSave,
					            scope:this
					          },{
					            text: 'Cancel',
					            handler: function(){
					            			biogps.layoutsavewin.close();
				            				delete biogps.layoutsavewin;
					            		 }
					          }]
					})
		});
		biogps.layoutsavewin.show(this.grp_tbar.optionmenu.el);
		biogps.layoutsavewin.focus();

		function doLayoutSave(){
		   if (!(Ext.getCmp('layoutsaveform_name').isValid())){
	             Ext.MessageBox.show({
	                title:'Error',
	                msg: 'Missing or wrong input layout name! Correct and try again.',
	                buttons: Ext.Msg.OK,
	                icon: Ext.MessageBox.ERROR
	            });
	            Ext.getCmp('layoutsaveform').form.reset();
		   }
		   else {

		   	   biogps.layoutsavewin.body.mask('Saving layout...');
		       Ext.getCmp('layoutsaveform').getForm().submit({
		        url:'/layout/add/',
		        params: {layout_data: Ext.util.JSON.encode(layout_data),
		        		 //permission: this.grlayout.permission,
		        		 description: this.grlayout.description},
		        method:'POST',
		        scope: this,
		        success: function(form, action){
		        	if(action.result.success){
		        		var layoutname = Ext.getCmp('layoutsaveform_name').getValue()
			        	biogps.layoutsavewin.body.unmask();
			        	biogps.layoutsavewin.body.mask(String.format('Layout "{0}" saved!', layoutname));
			        	this.grp_tbar.updateLayoutMenu();
			        	var layout_id = action.result.layout_id;
			        	this.switchLayout(layout_id);

			        	setTimeout(function(){
			        		biogps.layoutsavewin.body.unmask();
			        		biogps.layoutsavewin.close();
			        		}, 1000);
		        	}
		        	else{
			        	 biogps.layoutsavewin.body.unmask();
			        	 biogps.formfailure(action,
			        	                    'Saving Layout failed! Try again.',  //errmsg
			        	                    function(){                         //onclose
	        	                    			if (biogps.layoutsavewin)
	                								biogps.layoutsavewin.items.get(0).form.reset();
	                								biogps.layoutsavewin.items.get(0).items.get(0).focus();
			                			     });
		        	}
		        },
		        failure: function(form, action){
		        	 biogps.layoutsavewin.body.unmask();
		        	 biogps.formfailure(action,
		        	                    'Saving Layout failed! Try again.',      //errmsg
		        	                    function(){                             //onclose
                							Ext.getCmp('layoutsaveform').form.reset();
                							Ext.getCmp('layoutsaveform').items.get(0).focus();
                						});

		        }
		 	  });
		   }
		};

	},

	onLayoutSwitch: function(item, checked){
		if (checked){
			this.switchLayout(item.value);
		}
	},

	switchLayout: function(layoutid){
		biogps.LayoutMgr.on('currentlayoutloaded', function(){
			biogps.clearListeners(biogps.LayoutMgr, 'currentlayoutloaded');
			this.grlayout = biogps.LayoutMgr.currentLayout;
			this.updatePage();
		}, this);
		biogps.LayoutMgr.loadLayout(layoutid);
		//Now save current selected layout as the default one in user profile.
		biogps.usrMgr.profile.defaultlayout = layoutid;
		if (!biogps.usrMgr.is_anonymoususer)
			biogps.usrMgr.saveUserProfile();
	},

    placeFirstTimePlugin: function(){
        //place first time plugins (missing positioning parameters) into proper position
        var max_height = this.body.getHeight();
        var cnt_firsttime = 0;
        for (var i=0;i<this.portlets.length;i++){
            if(this.portlets[i].firsttime){
                max_height += this.portlets[i].getBox(true).height;
                cnt_firsttime += 1;
            }
        }
        if (cnt_firsttime == this.portlets.length){
            this.tilePluginWindows();
            //clean up firsttime flag
            for (var i=0;i<this.portlets.length;i++){
                this.portlets[i].firsttime = false;
            }
        }
        else {
            this.setCanvasHeight(max_height);
	        var body_width = this.body.getWidth();
	        for (var i=0;i<this.portlets.length;i++){
	            if (this.portlets[i].firsttime){
		            for (var j=0;j<this.portlets.length;j++){
	                    if(!this.portlets[j].firsttime){
	                        var pos = this.portlets[i].getPositionNextTo(this.portlets[j], body_width);
	                        this.portlets[i].update({top:pos.y, left:pos.x});
	                        //now check if this new pos overlapping with existing ones.
	                        var flag_overlapped = false;
	                        for (var k=0;k<this.portlets.length;k++){
	                            if(j!=k && !this.portlets[k].firsttime && this.portlets[i].isOverlapWith(this.portlets[k])){
	                                flag_overlapped = true;
                                    break;
	                            }
	                        }
	                        if (!flag_overlapped) {
	                            //if no overlapping, we are done now.
                                this.portlets[i].firsttime = false;
	                            break;
	                        }
	                    }
		            }
	            }
	        }
	        this.updateSize();
        }
        if (cnt_firsttime>0){
            //save current layout quietly
            //This really should be called after all Portlet movements are done.
            //But it is hard to track all portlets, so we just save the layout ("quietly") after
            //2s automatically, which should give enough time for all movement to finish.
            var save_task = new Ext.util.DelayedTask(function(){
                this.saveCurrentLayout({quiet: true});
            }, this);
            save_task.delay(2000);
        }
    },

    tilePluginWindows_compact: function(order){
        //Try to move overlapping plugin windows to empty area of the canvas.
        //   "order": the order of windows is based on
        //                  "area"
        //                 "index"
        var w = 350;
        var h = 250;
        for (var i=0;i<this.portlets.length;i++){
            this.portlets[i].update({width:w, height:h});
        }

        this.setCanvasHeight(h*this.portlets.length);


        this.portlets[0].update({top:0, left:0});
        var body_width = this.body.getWidth();
        var pos;
        for (var i=1;i<this.portlets.length;i++){
            pos = this.portlets[i].getPositionNextTo(this.portlets[i-1], body_width);
            this.portlets[i].update({top:pos.y, left:pos.x});
        }
        this.updateSize();
    },


    tilePluginWindows: function(order){
        //Try to move overlapping plugin windows to empty area of the canvas.
        //   "order": the order of windows is based on
        //                  "area"
        //                 "index"

        var max_height = 0;
        for (var i=0;i<this.portlets.length;i++){
            max_height += this.portlets[i].getBox().height;
        }
        this.setCanvasHeight(max_height);

        var order_list = [];    //a list of portlet index in order.
        if (order == 'area'){
            var x = [];
            var b;
	        for (var i=0;i<this.portlets.length;i++){
	            b = this.portlets[i].getBox();
                x.push([-1*b.width*b.height, i, this.portlets[i].plugin.title]);

	        }
            x=x.sort(function(a, b){ return (a[0]-b[0]); });

            for (var i=0;i<x.length;i++){
                order_list.push(x[i][1]);
            }
        }
        else {
            for (var i=0;i<this.portlets.length;i++){
                order_list.push(i);
            }
        }

        this.portlets[order_list[0]].update({top:0, left:0});
        var body_width = this.body.getWidth();
        var pos;
        var j;
        for (var i=1;i<order_list.length;i++){
            j = order_list[i];
            pos = this.portlets[order_list[i]].getPositionNextTo(this.portlets[order_list[i-1]], body_width);
            this.portlets[order_list[i]].update({top:pos.y, left:pos.x});
        }
        this.updateSize();
    },

    /**
     * Open all plugins in seperate browser windows/tabs.
     */
    openAllInBrowser: function(noconfirm){
        var p;
        if (!noconfirm && this.portlets.length>=3){
            Ext.MessageBox.confirm('Confirmation',
                   String.format('You are about to open {0} plugins in separate browser windows or tabs. Click "Yes" to continue.', this.portlets.length),
                   function(btn){
                        if (btn == 'yes'){
                            this.openAllInBrowser(true)
                        }
                   },
                   this);
        }
        else{
            for (var i=0;i<this.portlets.length;i++){
                p = this.portlets[i];
                if (p.url) window.open(p.url);
            }
        }
    }


});

Ext.reg('grpage', biogps.GeneReportPage);

/*
biogps.ChartPanel = function(geneid, species, showtitle) {
	this.geneid = geneid;
	this.species = species;
	this.showTitle = showtitle;
	this.chartlist = new Ext.data.JsonStore({
			//url: '/service/getchartlist?sessionid='+biogps.sessionid+'&geneid='+this.geneid+'&format=json',
			url: '/service/getchartlist?geneid='+this.geneid+'&format=json',
			id: "datasetid",
			fields: [//{name: 'name', type: "string"},
				 	 {name: 'datasetdesc', type: "string"},
					 {name: 'datasetname', type: "string"},
					 {name: 'datasetid', type: "string"},
					 {name: 'datatypeid', type: "string"},
					 {name: 'rootnodeid', type: "string"}],
			autoLoad: true
		});
	this.chartlist.on('load', this.initSelector, this)
	this.chartlist.on('loadexception', biogps.ajaxfailure, this)

	this.selector = new Ext.form.ComboBox({
			id: 'chartselector_' + this.geneid,
            fieldLabel: 'Select data set',
            labelAlign: 'top', //'left',
            store: this.chartlist,
            //autoWidth: true,
            width: 200,
            listWidth:200,
            resizable: true,
            displayField:'datasetdesc',
            valueField: 'datasetid',
            name:'chartdata',
            //listeners: {change: this.updateChart},
            //value: 'Mb',
            typeAhead: false,
            //emptyText: 'Loading chart data...',
            mode: 'local',
            triggerAction: 'all',
            editable: false,
            //allowBlank: false,
            forceSelection: true,
            selectOnFocus:true
	});
	this.selector.on('select', this.onChartSelected, this);

	this.chart = new Ext.Panel({
			id: 'chart_' + this.geneid,
            //html: '<img src="/assets/js/ext-2.0.1/resources/images/default/shared/loading-balls.gif">',
            hideLabel: true
	});


	biogps.ChartPanel.superclass.constructor.call(this, {
		title: this.showTitle? 'DataChart':'',
		id:'chartpanel_'+this.geneid,
		collapsible: true,
		border: false,
		layout: 'form',
		items: [this.selector,
				this.chart]

	});
};
Ext.extend(biogps.ChartPanel, Ext.Panel, {
	initSelector: function(){
		if (this.chartlist.getCount() == 0){
			this.selector.setValue("No data available");
			this.selector.disable();
		}
		else {
			//set the initial chart to GeneAtlas, the first one otherwise.
			if ((this.species.toLowerCase() == 'human') && (this.chartlist.find('datasetdesc', 'GeneAtlas U133A, gcRMA') != -1)) {
				this.selector.setValue(this.chartlist.getAt(this.chartlist.find('datasetdesc', 'GeneAtlas U133A, gcRMA')).data.datasetid);
			}
			else if ((this.species.toLowerCase() == 'mouse') && (this.chartlist.find('datasetdesc', 'GeneAtlas MOE430, gcRMA') != -1)) {
				this.selector.setValue(this.chartlist.getAt(this.chartlist.find('datasetdesc', 'GeneAtlas MOE430, gcRMA')).data.datasetid);
			}
			else{
				this.selector.setValue(this.chartlist.getAt(0).data.datasetid);
			}
			this.onChartSelected();
		}
		//this.selector.doLayout();
	},

	onChartSelected: function(){
		//console.log('data selected!' + this.selector.value);
		Ext.get('chart_'+this.geneid).dom.innerHTML = '<img src="/assets/js/ext/resources/images/default/shared/loading-balls.gif"><span class="labelsmall">Loading chart...</span>';
		var chartdata = this.chartlist.getById(this.selector.value);
		if (chartdata)
			chartdata = chartdata.data;
		this.charturl_store = new Ext.data.JsonStore({
				//url: '/service/getcharturl?sessionid='+biogps.sessionid+'&index='+this.selector.value+'&format=json',
				//url: '/service/getcharturl?index='+this.selector.value+'&format=json',
				//url: String.format('/service/getcharturl?dataset={0}&datatypeid={1}&rootnodeid={2}&format=json', chartdata.datasetname, chartdata.datatypeid, chartdata.rootnodeid),
				url: String.format('/service/getcharturl?dataset={0}&datatypeid={1}&geneid={2}&format=json', chartdata.datasetname, chartdata.datatypeid, this.geneid),
				fields: [{name: 'thumbnail', type: "string"},
	                     {name: 'fullsizechart', type: "string"}],
				autoLoad: true
			});
		this.charturl_store.on('load', this.updateChart, this);
		this.charturl_store.on('loadexception', biogps.ajaxfailure, this);
	},

	updateChart: function(store){
		var charthtml = '';
		var r = Math.ceil(Math.random()*1000);
		for (var i=0; i<store.getCount(); i++){
			//charthtml += '<a href="' + store.getAt(i).data.fullsizechart + '" onmouseover="window.CB_Init();window.status=\'\';return true" rel="clearbox[chartset' + r.toString() + ']" title="Chart">' +
//			charthtml += '<a href="' + store.getAt(i).data.fullsizechart + '" rel="clearbox[chartset' + r.toString() + ']" title="Chart">' +
//					 	 '<img src="' + store.getAt(i).data.thumbnail + '"></a>';

//			charthtml += '<a href="http://biogps-dev.gnf.org/assets/img/test.html"' + '" rel="clearbox(" title="Chart">' +
//					 	 '<img src="' + store.getAt(i).data.thumbnail + '"></a>';

			charthtml += String.format('<a href="/utils/showchart?url={0}" rel="clearbox(580,750,click)" title="Chart"><img src="{1}"></a>',
									   store.getAt(i).data.fullsizechart,
									   store.getAt(i).data.thumbnail);
		}
		if (Ext.fly('chart_'+this.geneid))
			Ext.fly('chart_'+this.geneid).dom.innerHTML = charthtml;

		initLightbox();
		//Lightbox.init.bind(Lightbox)
	}

});

*/

/* END OF FILE: biogps/genereportpanel.js */
/* ------------------------
 * BEGIN SOURCE FILE: biogps/biogps.js 
 */

biogps.renderMainUI = function(){

	Ext.form.Field.prototype.msgTarget = 'side';

	setTimeout(function(){
        // Ext.get('loading').remove();
        //         Ext.get('loading-mask').fadeOut({remove:true});
        Ext.get('loading').hide();
        Ext.get('loading-mask').fadeOut({remove:false});
    }, 0);

//   Ext.state.Manager.setProvider(new Ext.state.CookieProvider());

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
                //items: [biogps.genelist_panel]
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
                    contentEl:'searchpanel',
                    id: 'search_panel',
                    title: 'Search',
                    autoScroll:true
                },{
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
		}
    },this);

    biogps.renderSearchForm('searchpanel');

    biogps.renderFeedBox(Ext.getCmp('col_info').body);
    biogps.renderTipBox(Ext.getCmp('col_info').body);

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

/* END OF FILE: biogps/biogps.js */
