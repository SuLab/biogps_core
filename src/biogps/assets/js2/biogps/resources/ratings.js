jQuery(document).ready(function ($) {
    // Hide ratings Delete button
    $.fn.rating.options.required = true;

    var ratingDetail = $('#rating-detail');
    var ratingStatic = $('.rating-static');
    var userRating = $('#user-rating');
    var communityRating = $('#community-rating');

    $('.rating').rating({
        focus: function(value, link){
            if (ratingDetail.text().indexOf('Your rating') != -1 ||
                ratingDetail.text().indexOf('Saving') != -1) {
                // Do nothing, leave user rating text in place
            } else {
                ratingDetail.text(link.title);
            }
        },

        blur: function(value, link){
            if (ratingDetail.text().indexOf('Your rating') != -1 ||
                ratingDetail.text().indexOf('Saving') != -1) {
                // Do nothing, leave user rating text in place
            } else {
                ratingDetail.text('Click star to rate.');
            }
        },

        callback: function(value, link){ 
            ratingDetail.html("Saving...");
            var ratingData = $('#meta_rating').data("options");
           
            $.ajax({
                type: "POST",
                url: "/rating/" + ratingData.model + "/" + ratingData.pk + "/",
                data: {rating: value},
                error: function(){
                    ratingDetail.html("There was an error submitting your rating.");
                },
                success: function(data){
                    ratingDetail.html('Your rating: ' + value);
                    var totalRatings = data['totalRatings'];
                    var ratingsText = (totalRatings == 1) ? ' rating' : ' ratings';
                    $('#object-ratings-total').html(totalRatings + ratingsText);
                    // Manual select is zero-based, subtract 1
                    // False flag for no callback after this rating
                    ratingStatic.rating('readOnly', false);
                    ratingStatic.rating('select', data['avgRating']-1, false);
                    ratingStatic.rating('readOnly');
                }
            });
        } 
    });
    $('#user-rating').hide();

    // Anonymous user
    ratingStatic.rating().rating('readOnly');

    if (userRating.length ) {
        $('#ratings').mouseover(function(){
            userRating.show();
            communityRating.hide();
        }).mouseout(function(){
            communityRating.show();
            userRating.hide();
        });
    }

    // Remove community rating star titles (displayed on mouseover)
    $('#community-rating').find('a').removeAttr("title");
}(jQuery));
