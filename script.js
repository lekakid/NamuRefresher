// ==UserScript==
// @name        NamuRefresher
// @author      LeKAKiD
// @version     1.4.0
// @include     https://namu.live/*
// @run-at      document-start
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @downloadURL https://raw.githubusercontent.com/lekakid/NamuRefresher/master/script.js
// @homepageURL https://github.com/lekakid/NamuRefresher
// @supportURL  https://github.com/lekakid/NamuRefresher/issues
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==

const CUSTOM_CSS = `
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
        bottom: 30px;
        left: 10px;
        width: 40px;
        height: 40px;
        z-index: 20;
    }

    .preview-hide {
        display:none;
    }

    .body .navbar-wrapper {
        top: 0px;
        position: fixed;
        width: 100%;
        z-index: 20;
    }
    .content-wrapper {
        padding-top: 42px;
    }
`;

const SETTNG_BUTTON_NAME = '스크립트 설정';
const SCRIPT_NAME = '나무 리프레셔 (Namu Refresher)';
const SETTING_RESET = '설정 초기화';
const USE_REFRESH = '게시물 자동 새로고침';
const REFRESH_TIME_INFO = '새로고침 시간 간격';
const REFRESH_TIME_UNIT = '초';
const HIDE_NOTICE = '채널 공지 숨기기';
const HIDE_AVATAR = '프로필 아바타 숨기기';
const SET_MY_IMAGE = '자짤 이미지 주소 등록';
const MY_IMAGE_PROMPT = '자짤로 사용할 이미지 주소를 입력';
const PREVIEW_FILTER = '짤 미리보기 숨기기';
const USE = '사용';
const UNUSE = '사용 안 함';

// #region Utility
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

// #endregion

// #region Article Refresher
function initLoader() {
    removeLoader();
    $('.root-container').append('<div id="article_loader"></div>');
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

var loader_loop = null;
function startArticleRefresh() {
    initLoader();
    loader_loop = setInterval(tryRefreshArticle, Setting.refreshTime * 1000);
}

function stopArticleRefresh() {
    clearInterval(loader_loop);
    loader_loop = null;
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

function initRefresher() {
    if(loader_loop !== null) {
        stopArticleRefresh();
    }

    startArticleRefresh();

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopArticleRefresh();
        } else {
            if (loader_loop === null && Setting.useRefresh) {
                $(document).ready(startArticleRefresh);
            }
        }
    });
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

    applyPreviewFilter();
}

// #endregion

// #region Reply Refresh Button
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

function refreshComment(data) {
    $('.article-comment > .list-area').remove();
    $('.article-comment > .title').after($(data).find('.article-comment > .list-area'));

    if(Setting.hideAvatar)
        hideAvatar();
}

function applyReplyRefreshBtn() {
    var btn = '<span>　</span><a class="btn btn-success" href="#"><span class="icon ion-android-refresh"></span> 새로고침</a>';

    $(btn).insertAfter('.article-comment .title a').click(onClickReplyRefresh);
    $(btn).appendTo('.article-comment .write-area .subtitle').click(onClickReplyRefresh);
}

function onClickReplyRefresh() {
    tryRefreshComment();
    return false;
}

// #endregion

// #region Hide Notice
function hideNotice() {
    list.find('.notice').css('display', 'none');
}

function showNotice() {
    list.find('.notice').removeAttr('style');
}

// #endregion

// #region Hide Profile Avatar
function hideAvatar() {
    $('.avatar').css('display', 'none');
    $('.input-wrapper > .input').css('width', 'calc(100% - 4.5rem - .5rem)');
}

function showAvatar() {
    $('.avatar').removeAttr('style');
    $('.input-wrapper > .input').removeAttr('style');
}

// #endregion

// #region Set My Posting Image
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
// #endregion

// #region Preview Filter
function applyPreviewFilter() {
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

// #endregion

// #region Right Click Menu
function addContextMenu() {
    $.contextMenu({

    })
}
// #endregion

// #region Setting
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

async function loadSetting() {
    Setting.useRefresh = await GM.getValue('Setting.useRefresh', DefaultSetting.useRefresh);
    Setting.refreshTime = await GM.getValue('Setting.refreshTime', DefaultSetting.refreshTime);
    Setting.hideNotice = await GM.getValue('Setting.hideNotice', DefaultSetting.hideNotice);
    Setting.hideAvatar = await GM.getValue('Setting.hideAvatar', DefaultSetting.hideAvatar);
    Setting.myImage = await GM.getValue('Setting.myImage', DefaultSetting.myImage);
    Setting.usePreviewFilter = await GM.getValue('Setting.usePreviewFilter', DefaultSetting.usePreviewFilter);
    Setting.filteredCategory = JSON.parse(await GM.getValue('Setting.filteredCategory.' + board, JSON.stringify(DefaultSetting.filteredCategory)));
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

function resetSetting() {
    Setting = JSON.parse(JSON.stringify(DefaultSetting));
    saveSetting();
    loadSetting();
}

function addSettingMenu() {
    $('.refresher-setting').remove();

    var nav = $('ul.navbar-nav').first();
    var menubtn = `<li class="nav-item dropdown">
                    <a aria-expanded="false" class="nav-link dropdown-toggle" href="#" title="Refresher 설정" data-toggle="dropdown" aria-haspopup="true">
                    <span class="hidden-sm-down">${SETTNG_BUTTON_NAME}</span>
                    <span class="hidden-md-up"><span class="ion-gear-a"></span></span>
                    </a>
                </li>`;
    var menulist = `<div class="dropdown-menu">
                    <div class="dropdown-item">${SCRIPT_NAME}</div>
                    <div class="dropdown-item refresher-setting-reset">${SETTING_RESET}</div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item refresher-setting-userefresh">${USE_REFRESH}</div>
                    <div class="dropdown-item refresher-setting-refreshtime">${REFRESH_TIME_INFO}</div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item refresher-setting-hidenotice">${HIDE_NOTICE}</div>
                    <div class="dropdown-item refresher-setting-hideavatar">${HIDE_AVATAR}</div>
                    <div class="dropdown-item refresher-setting-setmyimage">${SET_MY_IMAGE}</div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item refresher-setting-usepreviewfilter">${PREVIEW_FILTER}</div>
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

    $('.refresher-setting-userefresh').text(`${USE_REFRESH}: ${Setting.useRefresh ? USE : UNUSE}`);
    $('.refresher-setting-refreshtime').text(`${REFRESH_TIME_INFO}: ${Setting.refreshTime}${REFRESH_TIME_UNIT}`);
    $('.refresher-setting-hidenotice').text(`${HIDE_NOTICE}: ${Setting.hideNotice ? USE : UNUSE}`);
    $('.refresher-setting-hideavatar').text(`${HIDE_AVATAR}: ${Setting.hideAvatar ? USE : UNUSE}`);
    $('.refresher-setting-usepreviewfilter').text(`${PREVIEW_FILTER}: ${Setting.usePreviewFilter ? USE : UNUSE}`);

    if(!Setting.usePreviewFilter) {
        $('.refresher-previewfilter').hide();
    }

    $('a[category]').each(function(index, item) {
        var category = $(item).attr('category');
        var value = Setting.filteredCategory[category] || false;
        $(item).text(`${$(item).attr('category')}: ${value ? USE : UNUSE}`);
    });
}

function attachSettingMenuListener() {
    $('.refresher-setting-reset').click(function() {
        resetSetting();
        location.reload();
    });
    $('.refresher-setting-userefresh').click(function() {
        Setting.useRefresh = !Setting.useRefresh;
        $(this).text(`${USE_REFRESH}: ${Setting.useRefresh ? USE : UNUSE}`);
        if(Setting.useRefresh) {
            initRefresher();
        }
        else {
            stopArticleRefresh();
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
        $(this).text(`${REFRESH_TIME_INFO}: ${Setting.refreshTime}${REFRESH_TIME_UNIT}`);
        if(Setting.useRefresh) {
            stopArticleRefresh();
            startArticleRefresh();
        }
        saveSetting();
        return false;
    });
    $('.refresher-setting-hidenotice').click(function() {
        Setting.hideNotice = !Setting.hideNotice;
        $(this).text(`${HIDE_NOTICE}: ${Setting.hideNotice ? USE : UNUSE}`);
        if(Setting.hideNotice) {
            hideNotice();
        }
        else {
            showNotice();
        }
        saveSetting();
        return false;
    });
    $('.refresher-setting-hideavatar').click(function() {
        Setting.hideAvatar = !Setting.hideAvatar;
        $(this).text(`${HIDE_AVATAR}: ${Setting.hideAvatar ? USE : UNUSE}`);
        if(Setting.hideAvatar) {
            hideAvatar();
        }
        else {
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
        $(this).text(`${PREVIEW_FILTER}: ${Setting.usePreviewFilter ? USE : UNUSE}`);
        if(Setting.usePreviewFilter) {
            $('.refresher-previewfilter').show();
        }
        else {
            $('.refresher-previewfilter').hide();
        }
        applyPreviewFilter();
        saveSetting();
        return false;
    });
    
    $('.refresher-previewfilter-category').click(function() {
        var category = $(this).attr('category');
        Setting.filteredCategory[category] = !Setting.filteredCategory[category];
        $(this).text(`${category}: ${Setting.filteredCategory[category] ? USE : UNUSE}` );
        applyPreviewFilter();
        saveSetting();
        return false;
    });
}

// #endregion

var list = null;
var board = null;
async function init() {
    var custom_style = document.createElement('style');
    custom_style.textContent = CUSTOM_CSS;
    document.head.append(custom_style);

    var state;

    if(location.href.indexOf('/edit') > 0) {
        state = 'edit';
    }
    else if(location.href.indexOf('/write') > 0) {
        state = 'write';
    }
    else if(location.href.indexOf('/b/') > 0) {
        state = 'board';
    }
    else {
        state = 'not support';
    }

    if(state == 'not support')
        return;

    board = $('div.board-title > a').not('.subscribe-btn').attr('href').replace('/b/', '');
    list = $('.list-table');

    await loadSetting();

    addSettingMenu();
    attachSettingMenuListener();

    if(state == 'board') {
        if(Setting.useRefresh)
            initRefresher();

        if(Setting.hideNotice)
            hideNotice();

        if(Setting.hideAvatar)
            hideAvatar();

        applyPreviewFilter();
        applyReplyRefreshBtn();
    }
    else if(state == 'write') {
        applyMyImage();
    }
}

init();