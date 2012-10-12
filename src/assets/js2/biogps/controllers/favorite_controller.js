/**
 * Simple favorite controller for responding to Favorite checkbox clicks.
 * @codestart
 new Biogps.Controllers.Favorite( $('#object-favorite') );
 * @codeend
 * @tag controllers, home
 */
$.Controller.extend('Biogps.Controllers.Favorite',
/* @Prototype */
{
    /**
     * Posts the data to the server.
     * @param {jQuery} el The link wrapping the Favorite heart image.
     */
    '.favorite click' : function(el, ev) {
        // Add loading class while working on favorite
        el.addClass('favorite-saving');

        var modelType = el.data("options").modelType;
        var objectID = el.data("options").objectID;
        var favorited = false;

        var favoriteClass = 'favorite-true';
        if ( el.hasClass(favoriteClass) ) {
          el.removeClass(favoriteClass);
          el.attr('title', 'Favorite this');
        } else {
          el.addClass(favoriteClass);
          el.attr('title', 'Un-favorite this');
          favorited = true;
        }

        // POST the favorite data
        $.ajax({
          type: 'POST',
          url: '/favorite/' + modelType + '/' + objectID + '/',
          data: {choice: favorited},
          success: function(data, textStatus) {
          },
          error: function(XMLHttpRequest) {
          }
        });

        el.removeClass('favorite-saving');
    }
});
