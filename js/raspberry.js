'use strict';


$(document).ready(function () {

//fade for menuButtons
    $('.menuButton').mouseenter(function () {
        $(this).fadeTo('fast', 1);
    });
    $('.menuButton').mouseleave(function () {
        $(this).fadeTo('fast', 0.7);
    });
//Scroll capabilities for 'about' button on top screen
    $('.aboutLink').click(function () {
        $('html,body').animate({
            scrollTop: $('#two').offset().top - 57
        });
    });
//Scroll capabilities for 'features' button on top screen
    $('.featuresLink').click(function () {
        $('html,body').animate({
            scrollTop: $('#features').offset().top - 63
        });
    });
//Scroll capabilities for 'faqs' button on top screen
    $('.faqsLink').click(function () {
        $('html,body').animate({
            scrollTop: $('#faqs').offset().top - 63
        });
    });
//Scroll capabilities for 'contact' button on top screen
    $('.contactLink').click(function () {
        $('html,body').animate({
            scrollTop: $('#footer').offset().top - 63
        });
    });
//Scroll capabilities for 'WheeTalks' title at top of page
    $('#navName').click(function () {
        $('html,body').animate({
            scrollTop: 0
        });
    });
//Makes side menubar static when it hits the header
//    var top = $('.menuBar').offset().top - 103;
//    $(window).scroll(function (event) {
//        var y = $(this).scrollTop();
//        if (y >= top) {
//            $('.menuBar').addClass('menuBarFixed');
//        } else {
//            $('.menuBar').removeClass('menuBarFixed');
//        }
//    });
//Makes 'about' section static 
//    var top = $('#wrapperTwo').offset().top + 200;
//    $(window).scroll(function (event) {
//        var y = $(this).scrollTop();
//        if (y >= top) {
//            $('#wrapperTwo').addClass('wrapperTwoFixed');
//        } else {
//            $('#wrapperTwo').removeClass('wrapperTwoFixed');
//        }
//    });
//Display answer to FAQs on click
    $('.question').click( function () {
        $(this).next('.answer').slideToggle("fast");
    });
//display sidebar
    $('#sideBarButton').click(function() {
        $('body').toggleClass('active')
    });

//End
});

//JAVASCRIPT CODE
function getUrlLoginFailed() {
    var loginUrl = location.search.substring(11);
    if (loginUrl == "invalid-password") {
        $("#failedLogIn").append("Please enter a valid username and password");
    }
};
// JavaScript Document