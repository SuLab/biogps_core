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
		var defaultlayout = store.get('defaultlayoutid') || biogps.LayoutMgr.defaultlayout_for_anonymoususer;
		this.profile.defaultlayout = defaultlayout;
        this.set_defaultspecies_for_anonymoususer();
		//biogps.LayoutMgr.loadAllLayout();
        biogps.LayoutMgr.loadAllLayout({layout_id: biogps.alt_defaultlayout});
		this.is_anonymoususer = true;

		this.fireEvent('logout');   //in order to trigger fn registered with this.linkWithAuthentication

//		var mystuff_link= Ext.get('mystuff-link');
//		if (mystuff_link){
//			mystuff_link.mask();
//		}
	},

    set_defaultspecies_for_anonymoususer: function(){
        if (window.$ && $.jStorage && $.jStorage.storageAvailable()) {
            var defaultspecies = $.jStorage.get('defaultspecies');
            if (defaultspecies){
                this.profile.defaultspecies = defaultspecies;
            }
        }
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
        var user_link = String.format('<div>Hello&nbsp;<a href="/profile/" title="Manage your account in a new window"><span id="login_div_username">{0}</span></a>&nbsp;/&nbsp;<a id="logout" href="javascript:biogps.usrMgr.logout()">Logout</a></div>',
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
												biogps.showmsg('', config.msg + biogps.dismiss_msg_html, 5);
											if (config.callback)
												config.callback.call(config.scope || this);
										}
										else{
											biogps.showmsg('', 'Your profile failed to save!' + biogps.dismiss_msg_html, 5);
										}
			                         },
			                       method: 'POST',
			                       scope: this});

	},

    saveUserOptions: function(options) {
        //save options to localstorage for anonymous user
        //             to server-side profile for logged in user
        //saving to localstorage requires jStorage.js (http://github.com/andris9/jStorage)
        //For older browser has no localstorage support, it will be quietly ignored.
        //options.showmsg true/false: show message or not
        var showmsg = options.showmsg == true;
        delete options.showmsg;

        if (this.is_anonymoususer){
            //save to localstorage
            if ($ && $.jStorage && $.jStorage.storageAvailable()) {
                for (var key in options) {
                    this.profile[key] = options[key];
                    $.jStorage.set(key, options[key]);
                }
                if (showmsg) {
                    biogps.showmsg('', 'Your options saved locally!' + biogps.dismiss_msg_html, 5);
                }
            }
        }
        else {
            //save to server-side user profile
            for (var key in options) {
                this.profile[key] = options[key];
            }
            this.saveUserProfile({showmsg: showmsg});
        }
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
