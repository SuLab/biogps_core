steal(
    '../models/plugin',
    '../resources/ui.catcomplete'
).then(function( $ ) {
    /**
     * @tag controllers, home
     * Enables plugin editing forms.  Lets the user 
     * ["Biogps.Controllers.Pluginform.prototype.form submit" create], 
     * ["Biogps.Controllers.Pluginform.prototype.&#46;edit click" edit],
     * or ["Biogps.Controllers.Pluginform.prototype.&#46;destroy click" destroy] plugins.
     */
    $.Controller.extend('Biogps.Controllers.Pluginform',
    /* @Prototype */
    {
        /**
         * When the page loads, instantiate a Plugin object and link it to the form.
         */
        init: function(el){
            // Initialize URL Template autocompletion
            this.find('#id_url').urltemplate();
            this.find('#btn-test_url').button();
            
            // Start counter for short_description length
            this.find('#id_short_description').NobleCount('#id_short_description_count');
            
            // Initialize permissions display
            this.find('#id_rolepermission').buttonset();
            this.displayPermission( el.formParams()['rolepermission'] );
            
            // Initialize species buttons
            this.find('#id_species label').addClass('btn_species');
            this.find('#id_species input')
                .button({
                    icons: { primary: 'ui-icon-blank' }
                })
                .click( function(){
                    if( this.checked ){
                        $(this).button('option', 'icons', { primary: 'ui-icon-check' });
                    }
                    else {
                        $(this).button('option', 'icons', { primary: 'ui-icon-blank' });
                    }
                })
                .filter(':checked').button({ icons: { primary: 'ui-icon-check' } });
            
            // Initialize Tag autocompletion
            var $id_tags = this.find('#id_tags'),
                all_tags = $id_tags.data('complete');
            all_tags = $.parseJSON( all_tags );
            $id_tags
                // don't navigate away from the field on tab when selecting an item
                .bind( "keydown", function( event ){
                    if( event.keyCode === $.ui.keyCode.TAB &&
                        $(this).data('autocomplete').menu.active ) { event.preventDefault(); }
                })
                .autocomplete({
                    minLength: 0,
                    source: function( request, response ){
                        // delegate back to autocomplete, but extract the last term
                        response( $.ui.autocomplete.filter(
                            all_tags, request.term.split(' ').pop()
                        ) );
                    },
                    focus: function(){
                        // prevent value inserted on focus
                        return false;
                    },
                    select: function( event, ui ){
                        var terms = this.value.split(' ');
                        // remove the current input
                        terms.pop();
                        // add the selected item
                        terms.push( ui.item.value );
                        // add a blank to force the comma at the end
                        terms.push( '' );
                        this.value = terms.join(' ');
                        return false;
                    }
                });
            
        },
        /**
         * Responds to the create form being submitted by creating a new Biogps.Models.Plugin.
         * @param {jQuery} el A jQuery wrapped element.
         * @param {Event} ev A jQuery event whose default action is prevented.
         */
        "form submit" : function(el, ev){
            ev.preventDefault();
            new Biogps.Models.Plugin( el.formParams() ).save(
                // Success
                function( p ){
                    $.popup({
                        title: 'Plugin Saved',
                        message: 'Go to <a href="/plugin/'+ p.id +'/">your plugin</a>.',
                        modal: false
                    });
                },
                // Failure
                function( jqXHR, textStatus, errorThrown ){
                    var response = $.parseJSON( jqXHR.responseText );
                    // Check for duplicate plugins
                    if( response.hasOwnProperty('dup_plugins') ){
                        // Prepare the HTML content for the popup window
                        var dup_html = '';
                        if( response.dup_plugins.length === 1){
                            dup_html = '<p>We detected that there is <b>an existing plugin</b> with exactly the same URL template as you provided. You can click the link below to view this existing plugin:</p>';
                        }
                        else {
                            dup_html = '<p>We detected that there are <b>' +
                                response.dup_plugins.length.toString() +
                                ' existing plugins</b> with exactly the same URL template as you provided. You can click the links below to view the existing plugins:</p>';
                        }
                        $.each( response.dup_plugins, function(i, p){
                            dup_html += '<a href="'+p.url+'" target="_blank">'+p.text+'</a><br>';
                        });

                        // Display the popup window
                        $.popup({
                            title: 'Duplicate Plugins Exist',
                            html: dup_html,
                            modal: true,
                            buttons: {
                                "Save Anyway": function(){
                                    $('#plugin-form form')
                                        .append('<input type="hidden" name="allowdup" value="1">')
                                        .submit();
                                    $(this).dialog('close');
                                },
                                Cancel: function(){
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                    
                    // Check for form errors
                    if( response.hasOwnProperty('errors') ){
                        for( var e in response.errors ){
                            if( response.errors.hasOwnProperty(e) ){
                                // e  = name of field
                                // response.errors[e]  = array of errors for field
                                $("label[for=\'id_"+e+"\']").addClass('fieldErrors');
                            }
                        }
                    }
                });
        },
        
        /**
         * Responds to the "Test URL" button getting clicked.
         */
        "#btn-test_url click" : function(el, ev){
            var testUrl = this.find('#id_url').val(),
                previewDiv = $('<div></div>'),
                resultSpan = this.find('#result-test_url');
            
            $.ajax({
                type: 'GET',
                url: '/plugin/test/',
                data: {
                    url: testUrl,
                    geneid: '1017'
                },
                success: function(data, textStatus, XMLHttpRequest) {
                    $.popup({
                        html: '<div class="preview-url"><a href=\"' +data.url+
                            '\" target="blank">' +data.url+ '</a></div>'+
                            '<iframe src=\"' +data.url+ '\" height="400" width="670">',
                        title: 'URL Template Preview',
                        modal: true,
                        resizable: false,
                        show: 'fade',
                        height: 520,
                        width: 700
                    });
                },
                error: function( jqXHR, textStatus, errorThrown ){
                    resultSpan.html( '<span class="fieldErrors">INVALID URL</a>' );
                }
            });
        },
        
        /**
         * Handles clicking on a plugin's destroy link.
         */
        '.destroy click' : function(el){
            if(confirm("Are you sure you want to destroy this plugin?"))
                this.plugin.destroy();
        },
        
        /**
         * Handles clicking on the permission toggles.
         */
        'input[type="radio"] change': function(el){
            this.displayPermission( el[0].value );
        },
        displayPermission: function(perm){
            var summary = this.find('.object-summary');
            summary.removeClass('object-restricted object-private');
            
            if( perm == 'myself' ){
                summary.addClass('object-private');
            }
            else if( perm == 'novartisusers' || perm == 'friendusers' ){
                summary.addClass('object-restricted');
            }
        }
    });
});