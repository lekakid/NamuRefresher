// ==UserScript==
// @name        NamuRefresher
// @auther      LeKAKiD
// @version     1.0.0
// @exclude     https://namu.live/b/*/write
// @include     https://namu.live/b/*
// @run-at      document-start
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==
GM_addStyle (`
    @keyframes highlight{
        0% {
            background-color: rgba(240, 248, 255, 1);
            opacity:1
        }
        100% {
            background-color: rgba(240, 248, 255, 0);
            opacity:1
        }
    
    }
    
    @keyframes loaderspin {
        0% { transform: rotate(0deg);
            box-shadow: 0 0 15px #3d414d;
        }
        5% {
            box-shadow: 0 0 -10px #3d414d;
        }
        15%{
            box-shadow: 0 0 0px #3d414d;
        }
        100% { transform: rotate(360deg);
            box-shadow: 0 0 0px #3d414d;
        }
    }

    #article_loader {
        border: 6px solid #d3d3d3;
        border-top: 6px solid #3d414d;
        border-radius: 50%;
        position: fixed;
        top: 5px;
        left: 10px;
        width: 40px;
        height: 40px;
        z-index: 14 !important;
    }
    
    #article_loader.fixed {
        top:50px;
    }

    #time_display {
        position: fixed;
        top: 45px;
        left: 10px;
        width: 40px;
        text-align: center;
        opacity: 0;
    }

    #time_display.fixed {
        top: 90px;
    }
`);

function initLoader() {
    removeLoader();
    $('.root-container').append('<div id="article_loader"></div>');
    $('.root-container').append('<div id="time_display">0초</div>');

    var loader = $('#article_loader');
    var time_display = $('#time_display');

    if ($(window).scrollTop() < 50) {
        loader.addClass('fixed');
        time_display.addClass('fixed');
    } else {
        loader.removeClass('fixed');
        time_display.removeClass('fixed');
    }

    $(window).on('scroll', function () {
        if ($(window).scrollTop() < 50) {
            loader.addClass('fixed');
            time_display.addClass('fixed');
        } else {
            loader.removeClass('fixed');
            time_display.removeClass('fixed');
        }
    });

    loader.click(function() {
        clearInterval(loader_loop);

        var refreshtime = GM_getValue('refreshtime', 5);

        switch(refreshtime) {
            case 3:
                refreshtime = 5;
                break;
            case 5:
                refreshtime = 10;
                break;
            case 10:
                refreshtime = 3;
                break;
        }

        GM_setValue('refreshtime', refreshtime);
        time_display.text(refreshtime + '초');
        time_display.css('opacity', '1');
        time_display.fadeTo(300, 0);
        setLoader(refreshtime);
        loader_loop = setInterval(function() {
            loader.css('animation', '');
            getData(refreshtime);
        }, refreshtime * 1000);
    });
}

function setLoader(time) {
    var loader = $('#article_loader');

    if (loader) {
        loader.css('animation', 'loaderspin ease-in-out ' + time + 's');
    }
}

function removeLoader() {
    $('#article_loader').remove();
    $('#time_display').remove();
}

function getData(interval) {
    if(current_request != null) {
        current_request.abort();
        setLoader(0, 'init');
    }

    current_request = $.ajax({
        type: "GET",
        url: window.location.href,
        timeout: 2000,
        dataType: "html",
        success: (data) => {
            current_request = null;
            setLoader(interval);
            refreshList(data);
        },
        error: () => {
            current_request = null;
            console.log("AJAX Request Failed");
        }
    });
}

function getDaystamp(datetime) {
    var date;
    if(datetime)
        date = new Date(datetime);
    else
        date = new Date();

    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    if (("" + month).length == 1) {
        month = "0" + month;
    }
    if (("" + day).length == 1) {
        day = "0" + day;
    }

    return `${year}.${month}.${day}`;
}

function getTimestamp(datetime) {
    var date = new Date(datetime);
    date.set
    var hh = date.getHours();
    var mm = date.getMinutes();

    if (("" + hh).length == 1) {
        hh = "0" + hh;
    }
    if (("" + mm).length == 1) {
        mm = "0" + mm;
    }

    return `${hh}:${mm}`;
}

function isToday(datetime) {
    var today = getDaystamp();
    var target = getDaystamp(datetime);

    if(today == target)
        return true;

    return false;
}

function refreshList(data) {
    var newlist = $(data).find('.list-table').find('a.vrow').not('.notice');
    if(newlist.length == 0)
        return;

    var list_length = list.find('a.vrow').not('.notice').length;
    var latest_num = list.find('a.vrow').not('.notice').first().find('span.col-id > span').text();

    for(var i = 0; i < list_length; i++) {
        if(newlist.eq(i).find('span.col-id > span').text() > latest_num) {
            newlist.eq(i).addClass('new');
        }
    }

    list.find('a.vrow').not('.notice').remove();
    list.append(newlist);

    list.find('a.new').css('animation', 'highlight ease-in-out 0.5s');
    list.find('a.new').removeClass('new');

    list.children().each(function(index, item) {
        var datetime = $(item).find('time').attr('datetime');

        if(isToday(datetime))
            $(item).find('time').text(getTimestamp(datetime));
    });
}

var current_request = null;
var loader_loop = null;
var list = null;
function initRefresher() {
    list = $('.list-table');

    var refreshtime = GM_getValue('refreshtime', 5);

    initLoader();
    setLoader(refreshtime);
    loader_loop = setInterval(function() {
        $('#article_loader').css('animation', '');
        getData(refreshtime);
    }, refreshtime * 1000);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            removeLoader();
            clearInterval(loader_loop);
            loader_loop = null;
        } else {
            if (loader_loop === null) {
                $(document).ready(function() {
                    initLoader();
                    loader_loop = setInterval(function() {
                        $('#article_loader').css('animation', '');
                        getData(refreshtime);
                    }, refreshtime * 1000);
                });
            }
        }
    });
}

initRefresher();