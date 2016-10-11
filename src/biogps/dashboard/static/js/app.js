// JavaScript Document

	jQuery(document).ready(function ($) {
		
		
		//for menu
		
		 $(".navbar-toggle").click(function(){
        $("ul.main-menu").slideToggle("slow");
		
		
    });
	
	
	
	
// banner slider

  $("#slideshow > div:gt(0)").hide();

setInterval(function() { 
  $('#slideshow > div:first')
    .fadeOut(1000)
    .next()
    .fadeIn(1000)
    .end()
    .appendTo('#slideshow');
},  5000);


// testmonial slider code



var slideCount = $('#testmonials ul li').length;
	var slideWidth = $('#testmonials ul li').width();
	var slideHeight = $('#testmonials ul li').height();
	var sliderUlWidth =  slideWidth * 3;
        var sliderUlWidth_s =  slideWidth * slideCount;
	
	$('#testmonials').css({ width: sliderUlWidth, height: slideHeight });
	
	$('#testmonials ul').css({ width: sliderUlWidth_s,marginLeft:-slideWidth });
	
    $('#testmonials ul li:last-child').prependTo('#testmonials ul');

    function moveLeft() {
        $('#testmonials ul').animate({
            left: + slideWidth
        }, 300, function () {
            $('#testmonials ul li:last-child').prependTo('#testmonials ul');
            $('#testmonials ul').css('left', '');
        });
    };

    function moveRight() {
        $('#testmonials ul').animate({
            right: + slideWidth
        }, 300, function () {
            $('#testmonials ul li:first-child').appendTo('#testmonials ul');
            $('#testmonials ul').css('right', '');
        });
    };

    $('button.control_prev').click(function () {
        moveLeft();
		clearInterval(stratSlide);
		
		
    });

    $('button.control_next').click(function () {
        moveRight();
		clearInterval(stratSlide);
		
    });
	///////////////////////////////////////
												var stratSlide=setInterval(interval,3000);
												function interval(){
											
												$('#testmonials ul').animate({
															right: + slideWidth
														}, 600, function () {
															$('#testmonials ul li:first-child').appendTo('#testmonials ul');
															$('#testmonials ul').css('right', '');
														});
												
												}
												
												////////////////////////////////////////
												//$(window).onload(stratSlide);
		
		
		///#account-holder-descripation-edit button
		$("#account-holder-descripation-edit").click(function(){
												$(".editable-box").css("display","block");
												$("#editable-box-para").css("display","none");
									});



	 $("#menu-plugin-open").click(function(){
        $("ul.menu-plugin").slideToggle("slow");
	 });



});    
