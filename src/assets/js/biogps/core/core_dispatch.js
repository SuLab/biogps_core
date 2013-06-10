// core_dispatch.js
// Created: Feb 26, 2009
// Modified: Oct 21, 2009

// Provides the initial loading framework for the BioGPS site.
// This file is loaded before any CSS or other Javascript, allowing it to
// execute very quickly before the page has finished loading.  The downside is
// it therefore does not have access to any JS helper functions.


setVisible = function(el, visible){
    //toggle visibility of a dom element.
    var s = el.style;
    s.visibility = visible ? "visible" : "hidden";
}

// Defined here to account for the static pages that don't load Ext.
String.prototype.trim = function() {
    return this.replace(/^\s*/, "").replace(/\s*$/, "");
}

// Capitalizes the first letter of the string.
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}


coreDispatcher = {

    showWelcome: true,
    delayedAction: null,

    biogpsLoaded: function(){
        return (window.biogps && biogps.renderMainUI) != null
    },

    ///////////////////////////////////////////////////////////////////////////////
    // WAITING UNTIL LOADED
    ///////////////////////////////////////////////////////////////////////////////
    delayedExecute: function(callback){
        //Delays the execution of callback function till biogps is loaded completely
        if (coreDispatcher.biogpsLoaded()){
        	_gaq.push(['_trackEvent', 'coreDispatcher.delayedExecute', 'callback']);
            callback();
        }
        else {
            _gaq.push(['_trackEvent', 'coreDispatcher.delayedExecute', 'delaying']);
            this.delayedAction = callback;
        }
    },

    isMainUICommand: function(cmd){
        //return true if the input cmd is a valid validMainUICmd.
        if (!(cmd && cmd.toLowerCase)) return false;

        cmd = cmd.toLowerCase();
        // if (cmd=='search' || (cmd == 'searchresult' && !biogps.resultpage)){
        //     return false;
        // }
        //var validMainUICmd = ['search', 'searchresult', 'genereport',
        var validMainUICmd = ['genereport',
                              'mystuff', 'pluginlibrary',
                              'about', 'help', 'faq', 'downloads', 'terms'];
        for (var i=0; i<validMainUICmd.length; i++){
            if (cmd == validMainUICmd[i]) return true;
        }
        return false;
    },

    ///////////////////////////////////////////////////////////////////////////////
    // CORE DISPATCHER
    ///////////////////////////////////////////////////////////////////////////////
    dispatch: function(){
        //Dispatch actions based on hash string
        var hash = window.location.hash;
        if (hash.length>0 && hash.substring(0,1)=='#'){    //IE7 does not support hash[0]
            hash = hash.substring(1);
            var cmd = null;
            var params = hash.split('&');
            for (var i=0;i<params.length;i++){
                var x = params[i].split('=');
                if (x[0] == 'goto' && x.length>1){
                    cmd = x[1];
                    break;
                }
            }
            if (this.isMainUICommand(cmd)) {
                this.showWelcome = false;
            }
        }
        else{
            window.location.hash = '#goto=welcome';
        }
    },

    hideWelcome: function(callback){
        this.ieBackButtonFix();
        var dom = document.getElementById('welcome');
        setVisible(dom, false);
        coreDispatcher.showWelcome = false;
    },

    hideSymatlas: function(query){
        //tracking by Google Analytics
		_gaq.push(['_trackEvent', 'SymAtlas', 'Start BioGPS', query]);

        if (query.length > 0) {
            // We have a SymAtlas query to run
        	window.location.href = "/?query=" + query;
        }
        else {
            // Standard SymAtlas front page
            var dom = document.getElementById('symatlas-mask');
            setVisible(dom, false);
            dom = document.getElementById('symatlas-box');
            setVisible(dom, false);

            // Clicking the button that triggers this function will unset the focus
            // from the query window, so we reset it here.
            document.getElementById('qsearch_query').focus();
        }
    },

    // Redirects the user back to the deprecated SymAtlas url.
    goBacktoSymatlas: function(str){
        //tracking by Google Analytics
		_gaq.push(['_trackEvent', 'SymAtlas', 'Back to SymAtlas', str]);

    	window.location = "http://symatlas.gnf.org/deprecated/" + str;
    },

    ///////////////////////////////////////////////////////////////////////////////
    // SEARCH FORM SUBMISSION
    ///////////////////////////////////////////////////////////////////////////////

    useSampleSearch: function(str, evt) {
        if (evt)
            evt.cancelBubble=true;
        var _searchbox = document.getElementById('qsearch_query');
        _searchbox.value = str;
        _searchbox.focus();
    },

    /*
    searchWaiting: function(show){
        _searchform = document.getElementById('qsearch_form');
        if (show){
            _searchform.disabled=true;
            loader = document.createElement('div');
            loader.setAttribute('id', 'qsearch_loader');
            loader.setAttribute('class', 'loading-indicator');
            loader.innerHTML = 'Searching...';
            _searchform.appendChild(loader);
        }
        else{
            _searchform.disabled=false;
            loader = document.getElementById('qsearch_loader');
            if (loader)
                _searchform.removeChild(loader);
        }
    },*/

    bindHotKey: function(){
        //bind Ctrl-Enter hotkey for qsearch_box.
        //Need to execute this after EXT is loaded.
        var form = Ext.get("qsearch_form");
        var kmap = new Ext.KeyMap(form,{
            key: 13,   //Enter key
            ctrl:true,
            stopEvent: true,
            fn: function(){
                form.dom.onsubmit();
            },
            scope: this
        });
    },

    ieBackButtonFix: function(){
        //IE can not remember initial "#goto=welcome" token.
        if (Ext.isIE) {
            //This is to fix IE back button issue.
            Ext.History.suspendEvents();
            Ext.History.add('goto=welcome');
            Ext.History.resumeEvents();
        }
    },

    doSearch_v1: function(form, evt){
    //Submit quick search form
        if (evt)
            evt.cancelBubble=true;
        var _query = form.query.value.trim();
        if (_query != ''){
            //this.searchWaiting(true);
	        var _qtype = form.qtype.value;
	        this.delayedExecute(function(){
	            //coreDispatcher.hideWelcome();
	            biogps.Messenger.on('genelistrendered', function(){
	                //coreDispatcher.searchWaiting(false);
	                coreDispatcher.hideWelcome();
	                biogps.clearListeners(biogps.Messenger, 'genelistrendered');
	            });
                biogps.doSearch({query: _query,
                                 qtype: _qtype,
                                 searchby:'searchbyanno',
                                 target: form.query.id
                });
	        });
        }
        else{
            form.query.value = '';
            form.query.focus();
        }
    },

    doSearch: function(form, evt){
    //Submit quick search form
        if (evt)
            evt.cancelBubble=true;
        var _query = form.query.value.trim();
        if (_query != ''){
            this.delayedExecute(function(){
                biogps.Messenger.on('genelistrendered', function(){
                    coreDispatcher.hideWelcome();
                    biogps.clearListeners(biogps.Messenger, 'genelistrendered');
                });
                biogps.doSearch({query: _query,
                                  target: form.query.id
                });
            });
        }
        else{
            form.query.value = '';
            form.query.focus();
        }
    },

    gotoSearch: function(evt){
        //Goto advanced search form.
        if (evt)
            evt.cancelBubble=true;
        this.delayedExecute(function(){
            coreDispatcher.hideWelcome();
            Ext.History.add('goto=search');
            //biogps.dispatcher_by_hash('goto=search');
        });
    },



    ///////////////////////////////////////////////////////////////////////////////
    // TOP BAR SEARCH FORM
    ///////////////////////////////////////////////////////////////////////////////

    // Called from the top-right quick search box
    doTopBarSearch: function(form, evt){
        if (evt) {evt.cancelBubble=true;}

        var _query = form.topquery.value.trim();
        form.topquery.value = '';
        form.topquery.blur();

        if (_query != '' && _query != 'Quick gene search'){
            _gaq.push(['_trackEvent', 'BioGPS', 'QuickGeneSearch', _query]);
            window.location = '/#goto=search&query='+_query;
        }
        return false;
    },

    onInputFocus: function(query, evt){
        if (evt) {evt.cancelBubble=true;}

        if (query.value == query.defaultValue) {
            query.value = '';
            query.className = '';
        }
        return false;
    },

    onInputBlur: function(query, evt){
        if (evt) {evt.cancelBubble=true;}

        if (query.value.trim() == '') {
            query.value = query.defaultValue;
            query.className = 'inactive';
        }
        return false;
    },


    ///////////////////////////////////////////////////////////////////////////////
    // OPEN ID
    ///////////////////////////////////////////////////////////////////////////////

    openid: function(provider){
        var hidden = document.getElementById('openid_url');
        var form = document.getElementById('openid_form');

        _gaq.push(['_trackPageview', '/auth/login/openid/' + provider]);

        if (provider == 'google') {
            hidden.value = 'https://www.google.com/accounts/o8/id';
            form.submit();
        }
        else if (provider == 'yahoo') {
            hidden.value = 'http://yahoo.com/';
            form.submit();
        }
    },


    ///////////////////////////////////////////////////////////////////////////////
    // MISCELLANEOUS
    ///////////////////////////////////////////////////////////////////////////////

    onGoogleGroupsSignup: function(evt, target){
        if (evt)
            evt.cancelBubble=true;
        this.delayedExecute(function(){
            biogps.subscribeGoogleGroups(evt, Ext.get(target));
        });
    }
};

//define a biogps namespace
biogps = {};

/**
 * a flag to suppress ajax error dialog when the page is clicked away.
 * @type Boolean
 */
biogps.bequietonfailure = false;
window.onbeforeunload = function(){
    biogps.bequietonfailure = true;
};

/*
biogps.hide_announcement = function(aid){
    function createXMLHttpRequest() {
       try { return new XMLHttpRequest(); } catch(e) {}
       try { return new ActiveXObject("MSXML2.XMLHTTP.3.0"); } catch (e) {}
       try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e) {}
       try { return new ActiveXObject("Microsoft.XMLHTTP"); } catch (e) {}
       return null;
    }
    var xhReq = createXMLHttpRequest();
    if(xhReq){
        xhReq.open("GET", "/announcements/"+aid+"/hide/", true);
        xhReq.send(null);
    }
    var abox = document.getElementById('site_wide_announcements');
    if (abox){
    	abox.parentNode.removeChild(abox);
    	delete abox;
    }
}*/
