// edit_profile.js
// Authors: Marc Leglise (mleglise@gnf.org)
//          Chunlei Wu (cwu@gnf.org)
// Created: Feb 25, 2010

// Renders and processes the forms needed to edit a BioGPS User Profile.

(function($) {
    // ------------------------ Baseline setup ---------------------------
    
    // Set up the jQuery.metadata plugin to read a certain way.
    $.metadata.setType("attr","data");
    
    // Create a safe reference to the Controls object.
    var controls = function(obj) { return new wrapper(obj); };
    biogps.profileControls = controls;
    
    controls.init = function() {
        // Read in the initial data using the jQuery.metadata plugin.
        var profileData = $('#meta_profile').metadata(),
            privacyData = $('#meta_privacy').metadata(),
            infoData = $('#meta_info').metadata(),
            linkData = $('#meta_links').metadata();
        
        // If info and links have empty first children, they are placeholders for the Metadata
        // plugin and need to be cleared out.
        if (!infoData[0]['name']) {infoData = [];}
        if (!linkData[0]['name']) {linkData = [];}
        
        // Convert the <br> tags in infoData to line breaks
        $.each(infoData, function(k,i) {
            i.body = i.body.replace(/<br \/>/g,'\n');
        });
        
        // Assign the read-in data hashes to the control object.
        controls.profile_id = profileData.id;
        controls.privacy = privacyData;
        controls.info = infoData;
        controls.links = linkData;
        
        // Call the rendering functions for all data to initialize the editing buttons.
        controls.renderPrivacyForm();
        controls.renderInfo();
        controls.renderLinks();
        
        // Trigger privacy form on link click
        $('#privacyLink').click(function() {
            // Center the privacy control box in the window and show it.
            var box = $('#profileControlBox'),
                top = 100,
                left = Math.max(($(window).width() - box.outerWidth()) / 2, 0);
            
            $('.popup-mask').show();
            box.css({top: top, left: left, position: 'absolute'});
            box.show();
        });
    };
    
    
    // ------------------------ Template Functions: ---------------------------
    // 
    // Micro-Templates for rendering the different controls and outputs.
    var templates = {
        // Privacy control templates.
        profilePriv: "<span class='profilePrivacyField'> \
            <select name='<%= name %>' onChange='biogps.profileControls.submitPrivacy(this);'> \
                <option value='public' <% if(current==='public'){ %>selected='selected'<% }; %>>Public</option> \
                <option value='friends' <% if(current==='friends'){ %>selected='selected'<% }; %>>Friends Only</option> \
                <option value='private' <% if(current==='private'){ %>selected='selected'<% }; %>>Private (Hidden)</option> \
            </select></span>",
        
        // Info block templates.
        infoForm: "<% $.each(info, function(k,i) { %> \
            <div class='profileInfoField'> \
                <label>Name:</label>&nbsp; \
                <input type='text' value='<%= i.name %>' size='40' /> \
                <br>\
                <label>Body Text:</label><br> \
                <textarea rows='5' cols='65'><%= i.body.replace(/<br \\/>/g,'\\n') %></textarea> \
            </div><div class='orbar'></div> \
            <% }); %>",
        
        infoRender: "<% $.each(info, function(k,i) { %> \
            <h2><%= i.name %></h2> \
		    <%= i.body.replace(/\\n/g,'<br \\/>') %> \
		    <br>&nbsp; \
		    <% }); %> \
		    <div class='profileControls'> \
		    <input type='button' value='Edit Info' onClick='biogps.profileControls.renderInfoForm();' /></div>",
        
        // Link templates.
        linkForm: "<% $.each(links, function(k,i) { %> \
            <% if(i.url==''){i.url='http://'} %> \
            <div class='profileLinkField'> \
                <label>Name:</label>&nbsp; \
                <input type='text' value='<%= i.name %>' class='profileLinkName' /><br> \
                <label>URL:</label>&nbsp;&nbsp;&nbsp; \
                <input type='text' value='<%= i.url %>' class='profileLinkUrl' size='25' /> \
            </div><div class='orbar'></div> \
            <% }); %>",
        
        linkRender: "<ul><% $.each(links, function(k,i) { %> \
            <li><a href='<%= i.url %>' target='_blank'><%= i.name %></a></li> \
		    <% }); %> \
		    </ul><div class='profileControls'> \
		    <input type='button' value='Edit Links' onClick='biogps.profileControls.renderLinkForm();' /></div>"
    };
    
    
    
    // Called by the init method. Renders select boxes for each of the three privacy controls.
    controls.renderPrivacyForm = function() {
        $('#profilePrivacy').html( "<h2>Profile Privacy Control</h2><br><div>Affiliation:" +
            $.template( templates.profilePriv,
                {name: 'name_visible', current: controls.privacy.name_visible} ) + "</div>" +
            "<br><div>Email address:" +
            $.template( templates.profilePriv,
                {name: 'email_visible', current: controls.privacy.email_visible} ) +
            "</div><br><div>My profile details: " +
            $.template( templates.profilePriv,
                {name: 'profile_visible', current: controls.privacy.profile_visible} ) +
            "<p class='smallNote'>(posted info, links and friends.)</p></div> \
            <div class='profileControls'><a id='privacyLinkClose' href='#'>close [x]</a></div>"
        );
        $('#privacyLinkClose').click(function() { $('#profileControlBox').hide();$('.popup-mask').hide(); });
    };
    
    
    
    // Info editing control functions
    controls.renderInfoForm = function() {
        var newHtml = "<h2>Edit your Info</h2><div id='profileInfoFields'>" +
            $.template(templates.infoForm, {info: controls.info}) +
            "</div><div class='profileControls'> \
            <input type='button' value='Add More (+)' onClick='biogps.profileControls.renderBlankInfoForm();' /> \
            <input type='button' value='SAVE' onClick='biogps.profileControls.submitInfo();' />&nbsp;&nbsp;&nbsp; \
            <input type='button' value='Cancel' onClick='biogps.profileControls.cancelInfo();' /> \
            </div>";
        $('#profileInfo').html( newHtml );
        
        // Catch the case where the user has no info.
        if (controls.info.length < 1) {controls.renderBlankInfoForm();}
    };
    
    controls.renderBlankInfoForm = function() {
        var blank = [{name: '', body: ''}],
            newHtml = $.template(templates.infoForm, {info: blank});
        $('#profileInfoFields').append( newHtml );
    };
    
    controls.renderInfo = function() {
        var newHtml = '';
        if (controls.info.length < 1) {
            newHtml = "<h2>Info</h2>You haven't shared any info about yourself yet.";}
        newHtml += $.template(templates.infoRender, {info: controls.info});
        $('#profileInfo').html( newHtml );
    };
    controls.cancelInfo = controls.renderInfo;
    
    
    
    // Link editing control functions
    controls.renderLinkForm = function() {
        var newHtml = "<h2>Edit your Links</h2><div id='profileLinkFields'>" +
            $.template(templates.linkForm, {links: controls.links}) +
            "</div><div class='profileControls'> \
            <input type='button' value='Add More (+)' onClick='biogps.profileControls.renderBlankLinkForm();' /> \
            <input type='button' value='SAVE' onClick='biogps.profileControls.submitLinks();' />&nbsp;&nbsp;&nbsp; \
            <input type='button' value='Cancel' onClick='biogps.profileControls.cancelLinks();' /> \
            </div>";
        $('#profileLinks').html( newHtml );
        
        // Catch the case where the user has no links.
        if (controls.links.length < 1) {controls.renderBlankLinkForm();}
    };
    
    controls.renderBlankLinkForm = function() {
        var blank = [{name: '', url: ''}],
            newHtml = $.template(templates.linkForm, {links: blank});
        $('#profileLinkFields').append( newHtml );
    };
    
    controls.renderLinks = function() {
        var newHtml = '<h2>Links</h2>';
        if (controls.links.length < 1) {
            newHtml += "You haven't shared any links yet.";}
        newHtml += $.template(templates.linkRender, {links: controls.links});
        $('#profileLinks').html( newHtml );
    };
    controls.cancelLinks = controls.renderLinks;
    
    
    
    // ------------------------ Data Submission: ---------------------------
    
    // Called by the privacy select boxes.  Updates the in memory privacy hash
    // and submits the full profile form up to the server.
    controls.submitPrivacy = function(field) {
        var changed = $(field);
        controls.privacy[changed[0].name] = changed.val();
        controls.submit();
    };
    
    // Called by the 'Save' button in the info editing block.
    controls.submitInfo = function() {
        var names = $('.profileInfoField input').map(function() {
            return this.value;
        }).get();
        var bodies = $('.profileInfoField textarea').map(function() {
            return this.value;
        }).get();
        
        // Construct a new info hash
        var infoData = [];
        for(var i=0; i<names.length; i++) {
            if (names[i] == '') { continue; }
            infoData[i] = {name: names[i], body: bodies[i]};
        }
        
        controls.info = infoData;
        controls.submit();
        controls.renderInfo();
    };
    
    // Called by the 'Save' button in the link editing block.
    controls.submitLinks = function() {
        var names = $('.profileLinkName').map(function() {
            return this.value;
        }).get();
        var urls = $('.profileLinkUrl').map(function() {
            return this.value;
        }).get();
        
        // Construct a new link hash
        var linkData = [];
        for(var i=0; i<names.length; i++) {
            if (names[i] == '') { continue; }
            linkData[i] = {name: names[i], url: urls[i]};
        }
        
        controls.links = linkData;
        controls.submit();
        controls.renderLinks();
    };
    
    // Called by other submit functions once they have finished processing input.
    // Submits the in memory hashes of data up to the server for saving.
    controls.submit = function() {
        
        var submitData = {
            info: $.toJSON(controls.info),
            links: $.toJSON(controls.links),
            privacy: $.toJSON(controls.privacy)
        };
        
        // Call the server to submit the info objects
        $.ajax({
            async: true,
            data: $.param(submitData),
            dataType: 'json',
            type: 'post',
            url: '/profile/edit/',
            beforeSend: function(request){
                $('#savingProfile').html('<img src="/assets/img/loading.gif">&nbsp;&nbsp;SAVING PROFILE').show();
            },
            success: function(data){
                // console.log('Call to /profile/edit/ returned: %o', data);
                $('#savingProfile').html('PROFILE SAVED').delay(2000).fadeOut(600);
            }
        });
        
        _gaq.push(['_trackPageview', '/profile/edit/' + controls.profile_id]);
    };
        
})(jQuery);

jQuery(document).ready(function(){
    // If a div with ID 'meta_info' is present, then the editing controls should be enabled.
    if (jQuery('#meta_info').length > 0) {
        biogps.profileControls.init();
    }
});