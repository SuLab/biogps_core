Ext.namespace('biogps.friends');

Ext.apply(Ext.form.VTypes, {
    //override default emailMask to allow "+" in email.
    emailMask:  /[a-z0-9_\.\-@\+]/i
});

biogps.friends.renderUserSearchForm = function(containerid){

	var email_initial = '';
	if (location.search){
		var qstr = location.search;
		if (qstr[0] == '?') qstr = qstr.substring(1);
		email_initial = Ext.value(Ext.urlDecode(qstr).email, '').trim();
	}

    var usersearchform = new Ext.FormPanel({
    	id: 'id_usersearchform',
        border:false,
        width: 475,
        labelWidth: 150,
        style: 'padding:15px 0 5px 15px;',
        bodyStyle: 'background: transparent',
        renderTo: containerid,
        api: {submit: biogps.ed.friends.search_user_by_email},
        listeners: {render: {buffer : 10,
                             fn: function(fm){
                                //bind Enter hotkey
                                var kmap = new Ext.KeyMap(fm.getEl(),{
                                    key: 13,   //Enter key
                                    stopEvent: true,
                                    fn: doUserSearch,
                                    scope: this
                                });
                                fm.items.get(0).focus();
                            }}
        },
        items: [{xtype: 'textfield',
                    layout:'form',
                    fieldLabel: "Enter your friend's email",
                    vtype: 'email',
                    name: 'email',
                    allowBlank:false,
                    value: email_initial,
                    width: 300
                    //regex: new RegExp('^\s*(chr.+)\s*:\s*([0-9,]+)\s*-\s*([0-9,]+)\s*$', 'i'),
                    //regexText: 'Invalid format! Should be something like "chrX:151,073,054-151,383,976" (case-insensitive).'
                 }],
        buttons: [{
            text: 'Continue',
            type: 'submit',
            handler: doUserSearch
        }]

    });

    function doUserSearch(){
    	var form = usersearchform.getForm();
        if (! form.isValid()){
              Ext.MessageBox.show({
                 title:'Error',
                 msg: 'Wrong input! Correct and try again.',
                 buttons: Ext.Msg.OK,
                 icon: Ext.MessageBox.ERROR
             });
        }
        else{
            var inv_el = Ext.fly('invite_container');
            inv_el.mask('searching...');
            form.submit({
                success: function(form, action){
                    //console.log(action.result)
                	inv_el.unmask();
                    biogps.friends.renderUserList('invite_container', action.result.users, action.result.thatisme);
                },
                failure: function(form, action){
                	var msg;
                    inv_el.unmask();
                    if (action.result && action.result.message=="You must be authenticated to run this method."){
                    	msg = "Your session has expired, please login and try again.";
                    }
                    else{
                    	msg = 'User search failed. Please <a href="mailto:help@biogps.org">report it to us</a>.';
                    }
                    Ext.MessageBox.show({
                        title:'Error',
                        msg: msg,
                        buttons: Ext.Msg.OK,
                        icon: Ext.MessageBox.ERROR
                    });
                }
            });
        }
    }
}

biogps.friends.formfailure = function(containerid, action){
    var msg = '<h3>Failed with unknown error.</h3>';
    if (action.result && action.result.message){
        msg = '<h3>'+action.result.message+'</h3>';
    }
    else if (action.result && action.result.errors){
        if (Ext.isArray(action.result.errors.to_user)){ //django form error for to_user field (InviteFriendForm)
            msg = '<h3>Failed with this error:</h3><div>'+action.result.errors.to_user[0]+'</div>';
        }
        if (Ext.isArray(action.result.errors.email)){ //django form error for email field (JoinRequestForm)
            msg = '<h3>Failed with this error:</h3><div>'+action.result.errors.email[0]+'</div>';
        }
        else if (Ext.isArray(action.result.errors.__all__)){ //django form error for general
            msg = '<h3>Failed with this error:</h3><div>'+action.result.errors.__all__[0]+'</div>';
        }
        else {
            msg = '<h3>Failed with an unknown error.</h3>'
        }
    }
    else if (action.failureType=='server'){
        msg = "<h3>Failed due to a server error.</h3><p>Sorry for the inconvenience and we have been notified and will work it out as soon as possible.</p>";
    }

    msg += '<div class="invite_error">You can try other emails above, or, if you need help, you can <a href="mailto:help@biogps.org">report it to us.</a></div>'

    var container = Ext.fly(containerid);
    container.dom.innerHTML = '';
    container.createChild({tag: 'div', html: msg});
}

biogps.friends.renderUserList = function(containerid, user_list, flag_thatisme){
    var container = Ext.fly(containerid);
    container.dom.innerHTML = '';
    var user_msg = '';

    if (user_list.length < 1){
        if (flag_thatisme){
            container.createChild({tag: 'p', cls:"ownemailnotice", html: "Note: that's your own email address. Please try another one."});
        }
        else {
    	   biogps.friends.renderJoinRequestForm(containerid, Ext.getCmp('id_usersearchform').form.getValues().email.trim());
        }
    }
    else {
        if (flag_thatisme){
            container.createChild({tag: 'p', cls:"ownemailnotice", html: "Note: that's your own email address. But we found other accounts matching this email."});
        }

        var user_to_invite = [];    //matched users who are not my friends.
        var user_invited = [];   //matched users who I have already sent invitation (but has not accepted yet)
        var friends_list = [];  //matched users who are already my friends.
        for (var i=0;i<user_list.length;i++){
        	var u = user_list[i];
        	if (u.is_friend) {
        	   friends_list.push(u);
        	}
        	else if (u.invited){
        		user_invited.push(u);
        	}
        	else {
        	   user_to_invite.push({boxLabel: String.format('<a href="{0}" target="_blank">{1}</a>', u.profile_url, u.name),
        	                    name: 'to_user',
        	                    inputValue: u.username
        	                   });
        	}
        }
        if (user_to_invite.length>0) user_to_invite[0]['checked'] = true;

        if (user_invited.length>0){
            var user_invited_html ="<div class='invited'>You have already sent "+(user_invited.length==1?"invitation to this account:":"invitations to these accounts:");
            user_invited_html += "<ul>";
            for (var i=0;i<user_invited.length;i++){
            	user_invited_html += String.format('<li><a href="{0}" target="_blank">{1}</a>&nbsp;&nbsp;(invitation status: &ldquo;{2}&rdquo;)', user_invited[i].profile_url, user_invited[i].name, user_invited[i].invited);
            }
            user_invited_html += '</ul>';
            html+='<div>';
        }

        if (friends_list.length>0){
        	container.createChild({tag: 'h3', html: 'You have already connected with this user:'});
        	var html = "<ul>"
        	for (var i=0;i<friends_list.length;i++){
        		html +='<li><a href="'+friends_list[i].profile_url+'" target="_blank">'+friends_list[i].name+'</a></li>';
        	}
        	html += '</ul>';
        	container.createChild({tag: 'div', html: html});

        	if (user_invited.length > 0 || user_to_invite.length > 0){
        		//found multiple accounts
        		if (user_to_invite.length > 0){
                    html = "<h4>Note: This user might have signed up multiple accounts. If you want, you can connect to his/her other accounts here:</h4>";
                    if (user_invited.length > 0){
                    	html+=user_invited_html;
                    }
        		}
        		else {
        			html = "<h4>Note: This user might have signed up multiple accounts.</h4>";
                    html+=user_invited_html;
        		}
        		container.createChild({tag: 'div', html: html});
        	}
        }
        else {
            if (user_invited.length > 0 || user_to_invite.length > 0){
            	html = '<h3>Found this user\'s account.</h3>';
                if (user_invited.length==1 && user_to_invite.length == 0){
                	//only one invited account found
                	html += user_invited_html;
                }
                else if (user_invited.length==0 && user_to_invite.length == 1){
                	//only one account, but not invited yet, no need to do anything here.
                }
                else{
                    if (user_invited.length>0 && user_to_invite.length == 0){
                        //found multiple invited users only
                        html += '<h4>Note: This user might have signed up multiple accounts.</h4>';
                        html += user_invited_html;
                    }
                    else {
                        html += '<h4>Note: This user might have signed up multiple accounts. Pick the one you want to connect to:</h4>';
                        if (user_invited.length>0){
                        	html += user_invited_html;
                        }
                    }
                }
            }
            container.createChild({tag: 'div', html: html});

//        	if (user_to_invite.length == 1){
//                container.createChild({tag: 'h3', html: 'Found this user\'s account.'});
//            }else {
//                container.createChild({tag: 'h3', html: 'This user might have signed up multiple accounts. Pick the one you want to connect to'});
//            }
        }

        if (user_to_invite.length > 0){
            var userinviteform = new Ext.FormPanel({
                border:false,
                width: 475,
                labelWidth: 120,
                style: 'padding:15px 0 5px 15px',
                bodyStyle: 'background: transparent',
                renderTo: containerid,
                api: {submit: biogps.ed.friends.invite_friend},
                items: [{xtype: 'radiogroup',
                        fieldLabel: 'Friend to invite',
                        columns: 1,
                        items: user_to_invite
                       },{
                        xtype: 'textarea',
                        height: 100,
                        width: 200,
                        fieldLabel: "Leave a message",
                        name: 'message',
                        style: 'overflow:auto',
                        value: "I'd like to add you to my BioGPS network."
                        //submitEmptyText: false,     //this parameter will be available in ExtJS v3.2 or svn build
                        //                            //Ref: http://www.extjs.com/forum/showthread.php?t=66409&page=2
                        //emptyText: "Leave it blank to use default invitation message."
                       }],
                buttons: [{
                    text: 'Send invitation',
                    type: 'submit',
                    handler: function(){
                    	//to avoid submiting EmptyText. No need in EXTJS v3.2 with submitEmptyText set to false.
//                    	var form = userinviteform.getForm();
//                    	var message_field = userinviteform.items.get(1)
//                    	var empty_text = message_field.emptyText;
//                    	if (empty_text && (message_field.el.dom.value==empty_text)){
//                    		message_field.el.dom.value='';
//                    	}
                    	//end

                        userinviteform.getForm().submit({
                            success: function(form, action){
                                var msg = '<h3>Invitation sent.</h3><p>You can invite more users above or go back to your "<a href="/friends/">friends list</a>".</p>';
                                var container = Ext.fly(containerid);
                                container.dom.innerHTML = '';
                                container.createChild({tag: 'div', html: msg});
                            },
                            failure: function(form, action){
                            	biogps.friends.formfailure(containerid, action);
                            }
                        });

                        }
                       }]
            });
        }
    }
}

biogps.friends.renderJoinRequestForm = function(containerid, email){
    var container = Ext.fly(containerid);
    container.dom.innerHTML = '';
    container.createChild({tag: 'h3', html: 'This user has not signed up at BioGPS yet.'});
    container.createChild({tag: 'h4', html: "But you can invite him/her to join BioGPS here:"});

        var joinrequestform = new Ext.FormPanel({
            border:false,
            width: 475,
            labelWidth: 120,
            style: 'padding:15px 0 5px 15px',
            bodyStyle: 'background: transparent',
            renderTo: containerid,
            api: {submit: biogps.ed.friends.invite_to_join},
            items: [{xtype: 'hidden',
                    name: 'email',
                    value: email
                   },{
                    xtype: 'textarea',
                    height: 100,
                    width: 200,
                    fieldLabel: "Leave a message",
                    name: 'message',
                    style: 'overflow:auto',
                    //value: '',
                    //emptyText: "I found BioGPS to be a useful tool for accessing gene annotation.  I think you might find it interesting as well."
                    value: "I found BioGPS to be a useful tool for accessing gene annotation.  I think you might find it interesting as well."
                   }],
            buttons: [{
                text: 'Send invitation',
                type: 'submit',
                handler: function(){
                    joinrequestform.getForm().submit({
                        success: function(form, action){
                            var msg = '<h3>Invitation sent.</h3><p>You can invite more users above or go back to your "<a href="/friends/">friends list</a>".</p>';
                            var container = Ext.fly(containerid);
                            container.dom.innerHTML = '';
                            container.createChild({tag: 'div', html: msg});
                        },
                        failure: function(form, action){
                        	biogps.friends.formfailure(containerid, action);
                        }
                    });
                    }
                   }]
        });
}

Ext.onReady(function(){
    //Ext.Direct.addProvider({"url": "/extdirect/remoting/router/", "type": "remoting", "namespace": "biogps.ed", "actions": {"friends": [{"formHandler": true, "name": "invite_friend", "len": 0}, {"formHandler": true, "name": "search_user_by_email", "len": 0}, {"formHandler": false, "name": "list", "len": 0}, {"formHandler": false, "name": "accept", "len": 0}, {"formHandler": false, "name": "invitations", "len": 0}, {"formHandler": true, "name": "invite_to_join", "len": 0}, {"formHandler": false, "name": "reject", "len": 0}]}});
	Ext.Direct.addProvider(biogps.ed.Descriptor);
	var containerid = 'usersearch_container';

    if(Ext.fly(containerid)) {
        biogps.friends.renderUserSearchForm(containerid)
        Ext.fly(containerid).createChild({tag: 'div', html: '<h4>Or you can pick from your contact list <a href="/friends/contacts/">here...</a></h4>'});
    }
});