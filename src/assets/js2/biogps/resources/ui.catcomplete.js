/**
 * Blatantly ripped off from:
 * http://jqueryui.com/demos/autocomplete/#categories
 */
$.widget( "custom.catcomplete", $.ui.autocomplete, {
    _renderMenu: function( ul, items ){
        var self = this,
            currentCategory = '';
        $.each( items, function( index, item ){
            if( item.category != currentCategory ){
                ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
                currentCategory = item.category;
            }
            self._renderItem( ul, item );
        });
    }
});

$.widget( "custom.urltemplate", {
    _create: function() {
        var self = this,
            input = this.element,
            all_keywords = input.data('complete');
        all_keywords = $.parseJSON( all_keywords );
        input
            // don't navigate away from the field on tab when selecting an item
            .bind( "keydown", function( event ){
                if( event.keyCode === $.ui.keyCode.TAB &&
                    $(this).data('autocomplete').menu.active ) { event.preventDefault(); }
            })
            .catcomplete({
                minLength: 2,
                source: function( request, response ){
                    // delegate back to autocomplete, but extract the last term
                    response( $.ui.autocomplete.filter(
                        all_keywords, request.term.split('{{').pop()
                    ) );
                },
                focus: function(){
                    // prevent value inserted on focus
                    return false;
                },
                select: function( event, ui ){
                    var terms, t;
                    // if curly braces already exist, start parsing
                    if( this.value.indexOf( '{{' ) > -1 ){
                        terms = this.value.split('{{');
                        t = terms.pop(); // remove the current input
                        
                        // if the last item had end braces in it, put it back in
                        if( t.indexOf( '}}' ) > -1 ){
                            terms.push( t );
                        }
                    }
                    // if no curly braces exist, leave the existing value alone
                    else {
                        terms = [this.value];
                    }
                    
                    // add the selected item
                    terms.push( ui.item.value + '}}' );
                    this.value = terms.join( '{{' );
                    return false;
                }
            });
        
        this.button = $( "<button type='button'>Add Keyword</button>" )
            .attr( "tabIndex", -1 )
            .attr( "title", "Show All Keywords" )
            .insertAfter( input )
            .button({
                icons: {
                    secondary: "ui-icon-triangle-1-s"
                }
            })
            .click( function(){
                // close if already visible
                if( input.catcomplete( "widget" ).is( ":visible" ) ){
                    input.catcomplete( "close" );
                    return;
                }
                // pass empty string as value to search for, displaying all results
                input.catcomplete( "search", "{{" );
                input.focus();
            });
    },
    
    destroy: function() {
        this.input.remove();
        this.button.remove();
        this.element.show();
        $.widget.prototype.destroy.call( this );
    }
});
