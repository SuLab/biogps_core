//biogps.signupwin = null;

biogps.staticpage_data = new Ext.util.MixedCollection();
biogps.staticpage_data.addAll(
        [{
            title: 'About BioGPS',
            id: 'about',
            content: '/about/'
        },{
            title: 'Blog',
            id: 'blog',
            url: 'http://sulab.org/category/biogps/'
        },{
            title: 'Help',
            id: 'help',
            content: '/help/'
        },{
            title: 'FAQ',
            id: 'faq',
            content: '/faq/'
        },{
            title: 'Downloads',
            id: 'downloads',
            content: '/downloads/'
        },{
            title: 'API',
            id: 'api',
            content: '/api/'
        },{
            title: 'iPhone App',
            id: 'iphone',
            content: '/iphone/'
        },{
            title: 'Email updates',
            id: 'email_updates',
            content: 'javascript:void(null);'
        },{
            title: 'Terms of Use',
            id: 'terms',
            content: '/terms/'
        }]
);



biogps.showInfoPage = function(pageid){
	//var data = Ext.get('infobar_'+pageid).infodata;
    var data = biogps.staticpage_data.get(pageid);
	if (data){
	    window.location.href = data.content;
	    /*
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
		*/
	}
};

biogps.initInfobar = function(){
    var container = Ext.get('info_bar');

    for (var i = 0; i < biogps.staticpage_data.length; i++) {
        var data = biogps.staticpage_data.get(i);
        var _html = data.title;
        if (data.url) {
            var child = container.createChild({tag:'a', id:'infobar_'+data.id, style: "padding-right:20px", href: data.url, target: '_blank', html: _html});
        } else {
            var child = container.createChild({tag:'a', id:'infobar_'+data.id, style: "padding-right:20px", href: data.content, html: _html});
            if (data.id == 'email_updates') {
                // Add biogps-annouce list sign-up
	        child.on('click', function(evt, target) {
	        	biogps.subscribeGoogleGroups(evt, Ext.get(target));
	        }, this);
            }
    	}
    };
};


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
