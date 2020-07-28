// ==UserScript==
// @name        NamuRefresher
// @author      LeKAKiD
// @version     1.3.2
// @include     https://namu.live/b/*
// @run-at      document-end
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==
var NRstyle = document.createElement('style');
NRstyle.textContent = `
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

    .preview-hide {
        display:none;
    }
`;
document.head.append(NRstyle);

const SETTING_RESET = '설정 초기화';
const USE_REFRESH_ENABLED = '게시물 자동 새로고침 중단';
const USE_REFRESH_DISABLED = '게시물 자동 새로고침 사용 중';
const REFESH_TIME_INFO = '새로고침 시간 간격(초):';
const HIDE_NOTICE_ENABLED = '채널 공지 숨김';
const HIDE_NOTICE_DISABLED = '채널 공지 표시';
const HIDE_AVATAR_ENABLED = '프로필 아바타 숨김';
const HIDE_AVATAR_DISABLED = '프로필 아바타 표시';
const SET_MY_IMAGE = '복사한 주소를 자짤로 등록';
const MY_IMAGE_PROMPT = '자짤로 사용할 이미지 주소를 입력';
const PREVIEW_FILTER_ENABLED = '미리보기 필터 사용 중';
const PREVIEW_FILTER_DISABLED = '미리보기 필터 사용 안함';
const HIDE = "숨김"
const SHOW = "표시"

var loader_loop = null;
var list = null;
var board = null;

function initLoader() {
    removeLoader();
    $('.root-container').append('<div id="article_loader"></div>');

    var loader = $('#article_loader');

    if ($(window).scrollTop() < 50) {
        loader.addClass('fixed');
    } else {
        loader.removeClass('fixed');
    }

    $(window).on('scroll', function () {
        if ($(window).scrollTop() < 50) {
            loader.addClass('fixed');
        } else {
            loader.removeClass('fixed');
        }
    });

    setLoader();
}

function setLoader() {
    var loader = $('#article_loader');

    if (loader) {
        loader.removeAttr('style');
        setTimeout(function() {
            loader.css('animation', 'loaderspin ' + Setting.refreshTime + 's ease-in-out');
        }, 50);
    }
}

function removeLoader() {
    $('#article_loader').remove();
}

var current_request = null;
function tryRefreshArticle() {
    if(current_request !== null) {
        current_request.abort();
        initLoader();
    }

    current_request = $.ajax({
        type: "GET",
        url: window.location.href,
        timeout: 2000,
        dataType: "html",
        success: (data) => {
            current_request = null;
            setLoader();
            refreshArticle(data);
        },
        error: () => {
            current_request = null;
            console.log("AJAX Request Failed");
        }
    });
}

var comment_requeset = null;
function tryRefreshComment() {
    if(comment_requeset !== null) {
        comment_requeset.abort();
    }

    comment_requeset = $.ajax({
        type: "GET",
        url: window.location.href,
        timeout: 2000,
        dataType: "html",
        success: (data) => {
            comment_requeset = null;
            refreshComment(data);
        },
        error: () => {
            comment_requeset = null;
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

function refreshArticle(data) {
    var newlist = $(data).find('.list-table').find('a.vrow').not('.notice');
    newlist.find('.vrow-preview > noscript').each(function(index, item) {
        $(item).parent().html($(item).text());
    });
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

    applyPreview();
}

function refreshComment(data) {
    $('.article-comment > .list-area').remove();
    $('.article-comment > .title').after($(data).find('.article-comment > .list-area'));

    if(Setting.hideAvatar)
        hideAvatar();
}

function initRefresher() {
    if(loader_loop !== null) {
        stopRefresher();
    }
    initLoader();
    loader_loop = setInterval(tryRefreshArticle, Setting.refreshTime * 1000);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopRefresher();
        } else {
            if (loader_loop === null && Setting.useRefresh) {
                $(document).ready(() => {
                    initLoader();
                    loader_loop = setInterval(tryRefreshArticle, Setting.refreshTime * 1000);
                });
            }
        }
    });
}

function stopRefresher() {
    clearInterval(loader_loop);
    loader_loop = null;
    removeLoader();
}

function hideNotice() {
    list.find('.notice').css('display', 'none');
}

function showNotice() {
    list.find('.notice').removeAttr('style');
}

function hideAvatar() {
    $('.avatar').css('display', 'none');
    $('.input-wrapper > .input').css('width', 'calc(100% - 4.5rem - .5rem)');
}

function showAvatar() {
    $('.avatar').removeAttr('style');
    $('.input-wrapper > .input').removeAttr('style');
}

function applyMyImage() {
    if(Setting.myImage == '')
        return;

    var observer = new MutationObserver((mutations) => {
        for(m of mutations) {
            if(m.target.className == 'note-editable') {
                observer.disconnect();
                $('.note-editable').prepend(`<img src="${Setting.myImage}">`);
                break;
            }
        }
    });
    observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: false
    });
}

function applyPreview() {
    list.children().each(function(index, item) {
        var tag = $(item).find('span.tag').text();
        tag = (tag == "") ? "일반" : tag;

        if(Setting.usePreviewFilter && (Setting.filteredCategory['전체'] || Setting.filteredCategory[tag])) {
            $(item).find('.vrow-preview').css('display', 'none');
        }
        else {
            $(item).find('.vrow-preview').removeAttr('style');
        }
    });
}

function applyReplyRefresh() {
    var btn = '<a class="btn btn-success" href="#"><span class="icon ion-android-refresh"></span> 새로고침</a>';

    $(btn).insertAfter('.article-comment .title a').click(() => {
        tryRefreshComment();
        return false;
    });
}

var DefaultSetting = {
    useRefresh: true,
    refreshTime: 5,
    hideNotice: false,
    hideAvatar: true,
    myImage: '',
    usePreviewFilter: false,
    filteredCategory: {
        전체: false,
        일반: false
    }
}
var Setting = {};

function resetSetting() {
    Setting = JSON.parse(JSON.stringify(DefaultSetting));
    saveSetting();
    loadSetting();
}

async function loadSetting() {
    Setting.useRefresh = await GM.getValue('Setting.useRefresh', DefaultSetting.useRefresh);
    Setting.refreshTime = await GM.getValue('Setting.refreshTime', DefaultSetting.refreshTime);
    Setting.hideNotice = await GM.getValue('Setting.hideNotice', DefaultSetting.hideNotice);
    Setting.hideAvatar = await GM.getValue('Setting.hideAvatar', DefaultSetting.hideAvatar);
    Setting.myImage = await GM.getValue('Setting.myImage', DefaultSetting.myImage);
    Setting.usePreviewFilter = await GM.getValue('Setting.usePreviewFilter', DefaultSetting.usePreviewFilter);
    Setting.filteredCategory = JSON.parse(await GM.getValue('Setting.filteredCategory.' + board, JSON.stringify(DefaultSetting.filteredCategory)));

    $('.refresher-setting-userefresh').text(Setting.useRefresh ? USE_REFRESH_DISABLED : USE_REFRESH_ENABLED);
    $('.refresher-setting-refreshtime').text(REFESH_TIME_INFO + Setting.refreshTime);
    $('.refresher-setting-hidenotice').text(Setting.hideNotice ? HIDE_NOTICE_DISABLED : HIDE_NOTICE_ENABLED);
    $('.refresher-setting-hideavatar').text(Setting.hideAvatar ? HIDE_AVATAR_DISABLED : HIDE_AVATAR_ENABLED);
    $('.refresher-setting-usepreviewfilter').text(Setting.usePreviewFilter ? PREVIEW_FILTER_ENABLED : PREVIEW_FILTER_DISABLED);

    if(!Setting.usePreviewFilter) {
        $('.refresher-previewfilter').hide();
    }

    $('a[category]').each(function(index, item) {
        var category = $(item).attr('category');
        var value = Setting.filteredCategory[category];
        if(value === undefined)
            Setting.filteredCategory[category] = false;

        if(value) {
            $(item).text(`${$(item).attr('category')}: ${HIDE}`);
        }
        else {
            $(item).text(`${$(item).attr('category')}: ${SHOW}`);
        }
    });
}

async function saveSetting() {
    await GM.setValue('Setting.useRefresh', Setting.useRefresh);
    await GM.setValue('Setting.refreshTime', Setting.refreshTime);
    await GM.setValue('Setting.hideNotice', Setting.hideNotice);
    await GM.setValue('Setting.hideAvatar', Setting.hideAvatar);
    await GM.setValue('Setting.myImage', Setting.myImage);
    await GM.setValue('Setting.usePreviewFilter', Setting.usePreviewFilter);
    await GM.setValue('Setting.filteredCategory.' + board, JSON.stringify(Setting.filteredCategory));
}

function initSettingView() {
    $('.refresher-setting').remove();

    var nav = $('ul.navbar-nav').first();
    var menubtn = `<li class="nav-item dropdown">
                    <a aria-expanded="false" class="nav-link dropdown-toggle" href="#" title="Refresher 설정" data-toggle="dropdown" aria-haspopup="true">
                    <span class="hidden-sm-down">Refresher 설정</span>
                    <span class="hidden-md-up">Refresher 설정</span>
                    </a>
                </li>`;
    var menulist = `<div class="dropdown-menu left">
                    <div class="dropdown-item refresher-setting-reset">${SETTING_RESET}</div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item refresher-setting-userefresh">USE_REFRESH</div>
                    <div class="dropdown-item refresher-setting-refreshtime">REFRESH_TIME_INFO</div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item refresher-setting-hidenotice">HIDE_NOTICE</div>
                    <div class="dropdown-item refresher-setting-hideavatar">HIDE_AVATAR</div>
                    <div class="dropdown-item refresher-setting-setmyimage">${SET_MY_IMAGE}</div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item refresher-setting-usepreviewfilter">USE_PREVIEW_FILTER</div>
                    <div class="refresher-previewfilter"></div>
                </div>`;

    $(menubtn).appendTo(nav).append(menulist);

    
    var category = $('.board-category a');
    $('.refresher-previewfilter').append('<a class="dropdown-item refresher-previewfilter-category" category="전체">PREVIEW_CATEGORY</a>');
    category.each(function(index, item) {
        var data = $(item).text();
        data = data == "전체" ? "일반" : data;
        $('.refresher-previewfilter').append(`<a class="dropdown-item refresher-previewfilter-category" category="${data}">PREVIEW_CATEGORY</a>`);
    });
    
    $('.refresher-setting-reset').click(function() {
        resetSetting();
        location.reload();
    });
    $('.refresher-setting-userefresh').click(function() {
        Setting.useRefresh = !Setting.useRefresh;
        if(Setting.useRefresh) {
            $(this).text(USE_REFRESH_DISABLED);
            initRefresher();
        }
        else {
            $(this).text(USE_REFRESH_ENABLED);
            stopRefresher();
        }
        saveSetting();
        return false;
    });
    $('.refresher-setting-refreshtime').click(function() {
        switch(Setting.refreshTime) {
            case 3:
                Setting.refreshTime = 5;
                break;
                case 5:
                    Setting.refreshTime = 10;
                break;
            case 10:
                Setting.refreshTime = 3;
                break;
            }
            $(this).text(REFESH_TIME_INFO + Setting.refreshTime);
            if(Setting.useRefresh) {
                clearInterval(loader_loop);
            initLoader();
            loader_loop = setInterval(tryRefreshArticle, Setting.refreshTime * 1000);
        }
        saveSetting();
        return false;
    });
    $('.refresher-setting-hidenotice').click(function() {
        Setting.hideNotice = !Setting.hideNotice;
        if(Setting.hideNotice) {
            $(this).text(HIDE_NOTICE_DISABLED);
            hideNotice();
        }
        else {
            $(this).text(HIDE_NOTICE_ENABLED);
            showNotice();
        }
        saveSetting();
        return false;
    });
    $('.refresher-setting-hideavatar').click(function() {
        Setting.hideAvatar = !Setting.hideAvatar;
        if(Setting.hideAvatar) {
            $(this).text(HIDE_AVATAR_DISABLED);
            hideAvatar();
        }
        else {
            $(this).text(HIDE_AVATAR_ENABLED);
            showAvatar();
        }
        saveSetting();
        return false;
    });

    $('.refresher-setting-setmyimage').click(function() {
        var value = prompt(MY_IMAGE_PROMPT, Setting.myImage);
        if(value !== null) {
            Setting.myImage = value;
            saveSetting();
        }
        return false;
    });

    $('.refresher-setting-usepreviewfilter').click(function() {
        Setting.usePreviewFilter = !Setting.usePreviewFilter;
        if(Setting.usePreviewFilter) {
            $(this).text(PREVIEW_FILTER_ENABLED);
            $('.refresher-previewfilter').show();
        }
        else {
            $(this).text(PREVIEW_FILTER_DISABLED);
            $('.refresher-previewfilter').hide();
        }
        applyPreview();
        saveSetting();
        return false;
    });
    
    $('.refresher-previewfilter-category').click(function() {
        var category = $(this).attr('category');
        Setting.filteredCategory[category] = !Setting.filteredCategory[category];
        $(this).text(category + (Setting.filteredCategory[category] ? `: ${HIDE}` : `: ${SHOW}`));
        applyPreview();
        saveSetting();
        return false;
    });
}

async function init() {
    board = $('div.board-title > a').not('.subscribe-btn').attr('href').replace('/b/', '');
    list = $('.list-table');

    var state;

    if(location.href.indexOf('/edit') > 0) {
        state = 'edit';
    }
    else if(location.href.indexOf('/write') > 0) {
        state = 'write';
    }
    else {
        state = 'board';
    }

    initSettingView();
    await loadSetting();

    if(state == 'board') {
        if(Setting.useRefresh)
            initRefresher();

        if(Setting.hideNotice)
            hideNotice();

        if(Setting.hideAvatar)
            hideAvatar();

        applyPreview();
        applyReplyRefresh();
    }
    else if(state == 'write') {
        applyMyImage();
    }
}

init();