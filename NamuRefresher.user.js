// ==UserScript==
// @name        NamuRefresher
// @author      LeKAKiD
// @version     1.5.5
// @include     https://minor.town/*
// @run-at      document-end
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @downloadURL https://raw.githubusercontent.com/lekakid/NamuRefresher/master/NamuRefresher.user.js
// @homepageURL https://github.com/lekakid/NamuRefresher
// @supportURL  https://github.com/lekakid/NamuRefresher/issues
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==

const CUSTOM_CSS = `
    <style type="text/css">
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
            position: fixed !important;
            width: 100%;
            z-index: 20;
        }
    </style>
`;
const HEADER_PADDING = `<div class="navbar-padding" style="width:100%; height:42px"></div>`;
const HIDE_CONTENT_IMAGE_CSS = `
    <style type="text/css">
        .article-body img, video {
            display: none;
        }
    </style>
`;
const HIDE_AVATAR_CSS = `
    <style type="text/css">
        .avatar {
            display: none !important;
        }
        .input-wrapper > .input {
            width: calc(100% - 4.5rem - .5rem) !important;
        }
    </style>
`;
const CONTEXT_MENU_CSS = `
    <style type="text/css">
        .image-context-wrapper {
            position: absolute;
            max-width: 300px;
            padding: 1rem;
            border: 1px solid #bbb;
            background-color: #fff;
            z-index: 20;
        }

        .image-context-wrapper .list-devider {
            height: 1px;
            margin: .5rem 0;
            overflow: hidden;
            background-color: #e5e5e5;
        }

        .image-context-wrapper .list-item {
            display: block;
            width: 100%;
            padding: 3px 20px;
            clear: both;
            font-weight: 400;
            color: #373a3c;
            white-space: nowrap;
            border: 0;
        }

        .image-context-wrapper .list-item:hover,
        .image-context-wrapper .list-item:focus {
            color: #2b2d2f;
            background-color: #f5f5f5;
            text-decoration: none;
        }
    </style>
`;

const SETTNG_BUTTON_NAME = '스크립트 설정';
const SCRIPT_NAME = '나무 리프레셔 (Namu Refresher)';
const SETTING_RESET = '설정 초기화';
const USE_REFRESH = '게시물 자동 새로고침';
const REFRESH_TIME_INFO = '새로고침 시간 간격';
const REFRESH_TIME_UNIT = '초';
const HIDE_NOTICE = '채널 공지 숨기기';
const HIDE_AVATAR = '프로필 아바타 숨기기';
const HIDE_CONTENT_IMAGE = '본문 이미지 숨기기';
const MY_IMAGE_PROMPT = '자짤로 사용할 이미지 주소를 입력';
const PREVIEW_FILTER = '짤 미리보기 숨기기';
const USE = '사용';
const UNUSE = '사용 안 함';

// #region Time Utility
function getTimeString(datetime) {
    var date = new Date(datetime);
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

function getFullDateString(datetime) {
    var date = new Date(datetime);

    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hh = date.getHours();
    var mm = date.getMinutes();
    var ss = date.getSeconds();

    if (("" + month).length == 1) {
        month = "0" + month;
    }
    if (("" + day).length == 1) {
        day = "0" + day;
    }
    if (("" + hh).length == 1) {
        hh = "0" + hh;
    }
    if (("" + mm).length == 1) {
        mm = "0" + mm;
    }
    if (("" + ss).length == 1) {
        ss = "0" + ss;
    }

    return `${year}-${month}-${day} ${hh}:${mm}:${ss}`;
}

function isToday(datetime) {
    var today = new Date();
    var target = new Date(datetime);

    if(today.toLocaleDateString() == target.toLocaleDateString())
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
    var newlist = $(data).find('.board-article-list .list-table, .included-article-list .list-table').find('a.vrow').not('.notice');
    if(newlist.length == 0)
        return;

    newlist.find('.vrow-preview > noscript').each(function(index, item) {
        $(item).parent().html($(item).text());
    });

    var list_length = article_list.find('a.vrow').not('.notice').length;
    var latest_num = article_list.find('a.vrow').not('.notice').first().find('span.col-id > span').text();

    for(var i = 0; i < list_length; i++) {
        if(newlist.eq(i).find('span.col-id > span').text() > latest_num) {
            newlist.eq(i).addClass('new');
        }
    }

    article_list.find('a.vrow').not('.notice').remove();
    article_list.append(newlist);

    article_list.find('a.new').css('animation', 'highlight ease-in-out 0.5s');
    article_list.find('a.new').removeClass('new');

    article_list.children().each(function(index, item) {
        var datetime = $(item).find('time').attr('datetime');

        if(isToday(datetime))
            $(item).find('time').text(getTimeString(datetime));
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

    $('.article-comment time').each(function(index, item) {
        $(item).text(getFullDateString($(item).attr('datetime')));
    });

    if(Setting.hideAvatar)
        hideAvatar();
}

function applyReplyRefreshBtn() {
    var btn = '<span>　</span><a class="btn btn-success" href="#"><span class="icon ion-android-refresh"></span> 새로고침</a>';

    if($('.article-comment').length == 0)
        return;

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
    article_list.find('.notice').css('display', 'none');
}

function showNotice() {
    article_list.find('.notice').removeAttr('style');
}

// #endregion

// #region Hide Profile Avatar
var hide_avatar_css = $(HIDE_AVATAR_CSS);
function hideAvatar() {
    hide_avatar_css.appendTo($(document.head));
}

function showAvatar() {
    hide_avatar_css.remove();
}

// #endregion

// #region Hide Content Image
var hide_content_image_css = $(HIDE_CONTENT_IMAGE_CSS);
function hideContentImage() {
    hide_content_image_css.appendTo($(document.head));
}

function showContentImage() {
    hide_content_image_css.remove();
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
                $('.note-editable').prepend(`${Setting.myImage}`);
                break;
            }
        }
    });
    observer.observe(document, {
        childList: true,
        subtree: true
    });
}
// #endregion

// #region Preview Filter
function applyPreviewFilter() {
    article_list.children().each(function(index, item) {
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

// #region Image Right Click Menu
function applyImageMenu() {
    $(CONTEXT_MENU_CSS).appendTo($(document.head));
    var context_menu_image = $(`
        <div class="image-context-wrapper" data-url="" data-html="">
            <a href="#" class="list-item context-opentab" target="_blank">새 탭에서 원본 보기</a>
            <a href="#" class="list-item context-copyurl">짤 주소 복사</a>
            <a href="#" class="list-item context-applymyimage">자짤로 등록</a>
            <div class="context-search-wrapper">
                <div class="list-devider"></div>
                <a href="" class="list-item context-search-google" target="_blank">구글 검색</a>
                <a href="" class="list-item context-search-yandex" target="_blank">Yandex 검색</a>
                <a href="" class="list-item context-search-iqdb" target="_blank">IQDB 검색</a>
                <a href="#" class="list-item context-search-saucenao" target="_blank">SauceNao 검색</a>
            </div>
        </div>
    `).appendTo('.root-container').hide();
    context_menu_image.contextmenu(function() { return false; });

    var context_close_event = function() {
        if(context_menu_image.css('display') != 'none') {
            context_menu_image.hide();
            return true;
        }
        return false;
    }

    $(document).click(function() {
        context_close_event();
        return true;
    });
    
    $('.article-body img, .article-body video').contextmenu(function(e) {
        if(context_close_event())
            return true;

        context_menu_image.attr('data-url', e.target.src);
        context_menu_image.attr('data-html', e.target.outerHTML);
        context_menu_image.find('.context-opentab').attr('href', e.target.src + '?type=orig');
        context_menu_image.find('.context-search-google').attr('href', `https://www.google.com/searchbyimage?safe=off&image_url=${e.target.src}`);
        context_menu_image.find('.context-search-yandex').attr('href', `https://yandex.com/images/search?rpt=imageview&url=${e.target.src}`);
        context_menu_image.find('.context-search-iqdb').attr('href', `https://iqdb.org/?url=${e.target.src}`);
        context_menu_image.find('.context-search-saucenao').attr('href', `https://saucenao.com/search.php?db=999&dbmaski=32768&url=${e.target.src}`);

        if(e.target.nodeName == 'IMG') {
            $('.image-context-wrapper .context-search-wrapper').show();
        }
        else {
            $('.image-context-wrapper .context-search-wrapper').hide();
        }

        context_menu_image.show();
        context_menu_image.css('top', e.pageY + 3);
        context_menu_image.css('left', e.pageX + 3);
        return false;
    });

    $('.context-copyurl').click(function() {
        var tmp = document.createElement('textarea');
        $(document.body).append(tmp);
        tmp.value = $('.image-context-wrapper').attr('data-url') + '?type=orig';
        tmp.select();
        document.execCommand('copy');
        tmp.remove();
    });

    $('.context-applymyimage').click(function() {
        Setting.myImage = $('.image-context-wrapper').attr('data-html');
        saveSetting();
        alert('자짤이 저장되었습니다. 다음 게시물 작성 시에 상단에 자동으로 짤이 추가됩니다.');
    });
}
// #endregion

// #region Setting
var DefaultSetting = {
    useRefresh: true,
    refreshTime: 5,
    hideNotice: false,
    hideAvatar: true,
    hideContentImage: false,
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
    Setting.hideContentImage = await GM.getValue('Setting.hideContentImage', DefaultSetting.hideContentImage);
    Setting.myImage = await GM.getValue('Setting.myImage', DefaultSetting.myImage);
    Setting.usePreviewFilter = await GM.getValue('Setting.usePreviewFilter', DefaultSetting.usePreviewFilter);
    Setting.filteredCategory = JSON.parse(await GM.getValue('Setting.filteredCategory.' + channel, JSON.stringify(DefaultSetting.filteredCategory)));
}

async function saveSetting() {
    await GM.setValue('Setting.useRefresh', Setting.useRefresh);
    await GM.setValue('Setting.refreshTime', Setting.refreshTime);
    await GM.setValue('Setting.hideNotice', Setting.hideNotice);
    await GM.setValue('Setting.hideAvatar', Setting.hideAvatar);
    await GM.setValue('Setting.hideContentImage', Setting.hideContentImage);
    await GM.setValue('Setting.myImage', Setting.myImage);
    await GM.setValue('Setting.usePreviewFilter', Setting.usePreviewFilter);
    await GM.setValue('Setting.filteredCategory.' + channel, JSON.stringify(Setting.filteredCategory));
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
                    <div class="dropdown-item refresher-setting-hidecontentimage">${HIDE_CONTENT_IMAGE}</div>
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
    $('.refresher-setting-hidecontentimage').text(`${HIDE_CONTENT_IMAGE}: ${Setting.hideContentImage ? USE : UNUSE}`);
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
            removeLoader();
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

    $('.refresher-setting-hidecontentimage').click(function() {
        Setting.hideContentImage = !Setting.hideContentImage;
        $(this).text(`${HIDE_CONTENT_IMAGE}: ${Setting.hideContentImage ? USE : UNUSE}`);
        if(Setting.hideContentImage) {
            hideContentImage();
        }
        else {
            showContentImage();
        }
        saveSetting();
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
        Setting.filteredCategory[category] = !(Setting.filteredCategory[category] || false);
        $(this).text(`${category}: ${Setting.filteredCategory[category] ? USE : UNUSE}` );
        applyPreviewFilter();
        saveSetting();
        return false;
    });
}

// #endregion

var article_list = null;
var channel = null;
async function init() {
    $(CUSTOM_CSS).appendTo($(document.head));
    $('.navbar-wrapper').after(HEADER_PADDING)
    $('.nav-item.hidden-md-up').remove();

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

    channel = location.href.substring(20, location.href.lastIndexOf('/'));
    article_list = $('.board-article-list .list-table, .included-article-list .list-table');

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

        if(Setting.hideContentImage)
            hideContentImage();

        applyPreviewFilter();
        applyReplyRefreshBtn();
        applyImageMenu();
    }
    else if(state == 'write') {
        applyMyImage();
    }
}

init();