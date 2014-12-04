/*
 * CSS Loading Start
 * Adds the class "js-loading" to the html tag.
 * Meant to be called in the head of an HTML page, to hide elements that
 * rely on JS to work, but won't be functional until the full JS stack on the
 * page has loaded.
 * A separate call should be used at the end of page-load to remove this
 * class from the body.
 */

function css_loading_start() {
    var h = document.documentElement;
    h.className += ' js-loading';
};
css_loading_start();
