// ==UserScript==
// @name        NamuRefresher
// @author      LeKAKiD
// @version     1.8.0
// @include     https://arca.live/*
// @include     https://*.arca.live/*
// @run-at      document-start
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @downloadURL https://raw.githubusercontent.com/lekakid/NamuRefresher/master/NamuRefresher.user.js
// @homepageURL https://github.com/lekakid/NamuRefresher
// @supportURL  https://github.com/lekakid/NamuRefresher/issues
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==
const SETTNG_BUTTON_NAME = '스크립트 설정';
const SCRIPT_NAME = '아카 리프레셔 (Arca Refresher)';
const SETTING_RESET = '설정 초기화';
const USE_REFRESH = '게시물 자동 새로고침';
const REFRESH_TIME_INFO = '새로고침 시간 간격';
const REFRESH_TIME_UNIT = '초';
const HIDE_NOTICE = '채널 공지 숨기기';
const HIDE_AVATAR = '프로필 아바타 숨기기';
const HIDE_CONTENT_IMAGE = '본문 이미지 숨기기';
const REMOVE_MY_IMAGE = '등록한 자짤 삭제';
const REMOVE_MY_IMAGE_CONFIRM = '등록한 자짤을 삭제하시겠습니까?';
const REMOVE_MY_IMAGE_RESULT = '삭제되었습니다.';
const PREVIEW_FILTER = '짤 미리보기 숨기기';

const SET_MY_IMAGE = '선택한 짤을 저장했습니다.\n다음에 게시물 작성 시 게시물 상단에 자동으로 추가됩니다.';

const USE = '사용';
const UNUSE = '사용 안 함';

// #region Utility
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

function addCSS(css) {
    return $(`<style type="text/css">${css}</style>`).appendTo(document.head);
}
// #endregion

// #region Article Refresher
const LOADER_CSS = `
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

    .body .navbar-wrapper {
        top: 0px;
        position: fixed !important;
        width: 100%;
        z-index: 20;
    }
`;
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
        if(parseInt(newlist.eq(i).find('span.col-id > span').text()) > parseInt(latest_num)) {
            newlist.eq(i).addClass('new');
        }
    }

    article_list.find('a.vrow').not('.notice').remove();
    article_list.append(newlist);

    article_list.find('a.new').css('animation', 'highlight ease-in-out 0.5s');
    article_list.find('a.new').removeClass('new');

    var criteria = new Date();
    criteria = criteria.setHours(criteria.getHours() - 24);

    article_list.children().each(function(index, item) {
        var targettime = new Date($(item).find('time').attr('datetime'));

        if(targettime > criteria)
            $(item).find('time').text(getTimeString(targettime));
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
const HIDE_NOTICE_CSS = `
    .article-list .notice {
        display: none !important;
    }
`
var hide_notice_style = null;
function hideNotice() {
    if(hide_notice_style == null)
        hide_notice_style = addCSS(HIDE_NOTICE_CSS);
    else
        hide_notice_style.appendTo(document.head);
}

function showNotice() {
    if(hide_notice_style != null)
        hide_notice_style.remove();
}

// #endregion

// #region Hide Profile Avatar
const HIDE_AVATAR_CSS = `
    .avatar {
        display: none !important;
    }
    .input-wrapper > .input {
        width: calc(100% - 4.5rem - .5rem) !important;
    }
`;
var hide_avatar_style = null;
function hideAvatar() {
    if(hide_avatar_style == null)
        hide_avatar_style = addCSS(HIDE_AVATAR_CSS);
    else
        hide_avatar_style.appendTo(document.head);
}

function showAvatar() {
    if(hide_avatar_style != null)
        hide_avatar_style.remove();
}

// #endregion

// #region Hide Content 
const HIDE_CONTENT_IMAGE_CSS = `
    .article-body img, video {
        display: none;
    }
`;
var hide_content_image_css = null;
function hideContentImage() {
    if(hide_content_image_css == null)
        hide_content_image_css = addCSS(HIDE_CONTENT_IMAGE_CSS);
    else
        hide_content_image_css.appendTo(document.head);
}

function showContentImage() {
    if(hide_content_image_css != null)
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

// #region Advanced Image Uploader
function applyAdvancedImgUploader() {
    var observer = new MutationObserver((mutations) => {
        for(m of mutations) {
            if(m.target.className == 'note-editable') {
                observer.disconnect();
                $('.note-editable').on('paste', onPasteImage);
                $('.note-dropzone').on('drop', onDropImage);
                break;
            }
        }
    });
    observer.observe(document, {
        childList: true,
        subtree: true
    });
}

function onDropImage(event) {
    var files = event.originalEvent.dataTransfer.files;

    if(files.length < 1)
        return true;

    files = Array.from(files);

    files = files.reduce(function(acc, cur) {
        if(cur.size > 20 * 1024 * 1024) {
            alert(`20MB를 넘는 파일(${cur.name})입니다. 업로드에서 생략됩니다.`);
            return acc;
        } else if (['jpeg', 'jpg', 'png', 'gif', 'mp4', 'mov', 'webp', 'webm'].indexOf(cur.name.split('.').pop().toLowerCase()) === -1) {
            alert("지원하지 않는 확장자명입니다. 업로드에서 생략됩니다.");
            return acc;
        }
        acc.push(cur);
        return acc;
    }, []);

    if(files.length > 0)
        doUpload(files, 0, files.length);
    return true;
}

function onPasteImage(event) {
    var items = event.originalEvent.clipboardData.items;
    var files = [];

    for(i = 0; i < items.length; i++) {
        if(items[i].kind == 'file' && items[i].type.indexOf('image/') > -1) {
            var file = items[i].getAsFile();
            if(file.size > 20 * 1024 * 1024) {
                alert(`20MB를 넘는 파일(${cur.name})입니다. 업로드에서 생략됩니다.`);
                break;
            }
            files.push(file);
        }
    }

    if(files.length == 0)
        return true;

    if(files.length > 0) {
        doUpload(files, 0, files.length);
        return false;
    }
    return true;
}

function doUpload(files, count, total) {
    if (count == total) {
        $("#progress").remove();
        return;
    }

    if(count == 0) {
        $('<div id="progress" style="width:100%;height:20px;background-color:#e2e2e2;position:relative"><div style="position:absolute;width:100%;text-align:center;font-weight:bold;color:#FFF">이미지 업로드 중...</div><div id="progressBar" style="background-color:#00b3a1;height:100%;width:0%;text-align:center;"></div></div>').insertBefore("#content");
    }
    var progressBar = $("#progressBar");

    var file = files[count];
    var formData = new FormData;
    formData.append('upload', file);
    formData.append('token', document.getElementsByName("token")[0].value);
    $.ajax({
        url: "/b/upload",
        type: 'POST',
        data: formData,
        async: true,
        success: function(data) {
            var url = data.url;
            var parentNode = document.createElement("div");
            var node;
            if(file.type.split('/')[1] === "mp4" || file.type.split('/')[1] === "mov" || file.type.split('/')[1] === "webm") {
                node = document.createElement('video');
                node.src = url;
                node.loop = true;
                node.autoplay = false;
                node.controls = true;
                node.setAttribute("playsinline", "playsinline");
            }
            else {
                node = document.createElement('img');
                node.src = url;
            }

            parentNode.appendChild(node);
            parentNode.appendChild(document.createElement('p'));
            $('.note-editable').append(parentNode);
            progressBar.width((++count / total) * 100 + "%");
            doUpload(files, count, total);
        },
        error: function(data) {
            data = data.responseJSON;
            alert(data.error.message);
        },
        cache: false,
        contentType: false,
        processData: false
    });
}
// #endregion

// #region Preview Filter
const HIDE_PREVIEW_CSS = `
    .preview-hide {
        display:none;
    }
`;
var hide_preview_style = null;
function applyPreviewFilter() {
    if(hide_avatar_style == null)
        hide_preview_style = addCSS(HIDE_PREVIEW_CSS);

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

// #region Fixed Header
const HEADER_CSS = `
    .body .root-container {
        padding-top: 42px;
    }
    .body .navbar-wrapper {
        top: 0px;
        position: fixed !important;
        width: 100%;
        z-index: 20;
    }
    .body .nav-item.hidden-md-up {
        display: none !important;
    }
`;
// #endregion

// #region Image Right Click Menu
const CONTEXT_MENU_CSS = `
    .image-context-wrapper {
        position: fixed;
        display:flex;
        justify-content: center;
        align-items: center;
        top: 0;
        left: 0;
        background-color: rgba(0, 0, 0, 0);
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .image-context-wrapper.mobile {
        background-color: rgba(0, 0, 0, 0.5);
        pointer-events: auto;
    }

    .image-context-menu {
        position: absolute;
        width: 300px;
        padding: .5rem;
        border: 1px solid #bbb;
        background-color: #fff;
        z-index: 20;
        pointer-events: auto;
    }

    .image-context-wrapper.mobile .image-context-menu {
        width: 80%;
    }

    .image-context-menu .list-devider {
        height: 1px;
        margin: .5rem 0;
        overflow: hidden;
        background-color: #e5e5e5;
    }

    .image-context-menu .list-item {
        display: block;
        width: 100%;
        padding: 3px 20px;
        clear: both;
        font-weight: 400;
        color: #373a3c;
        white-space: nowrap;
        border: 0;
    }

    .image-context-menu .list-item:hover,
    .image-context-menu .list-item:focus {
        color: #2b2d2f;
        background-color: #f5f5f5;
        text-decoration: none;
    }
`;

function applyImageMenu() {
    addCSS(CONTEXT_MENU_CSS);

    var context_menu_image = $(`
        <div class="image-context-wrapper">
            <div class="image-context-menu" data-url="" data-html="">
                <a href="" class="list-item context-opentab" target="_blank">새 탭에서 원본 보기</a>
                <a href="#" onclick="return false;" class="list-item context-copyurl">짤 주소 복사</a>
                <a href="#" onclick="return false;"  class="list-item context-applymyimage">자짤로 등록</a>
                <div class="context-search-wrapper">
                    <div class="list-devider"></div>
                    <a href="" class="list-item context-search-google" target="_blank">구글 검색</a>
                    <a href="" class="list-item context-search-yandex" target="_blank">Yandex 검색</a>
                    <a href="" class="list-item context-search-iqdb" target="_blank">IQDB 검색</a>
                    <a href="" class="list-item context-search-saucenao" target="_blank">SauceNao 검색</a>
                </div>
            </div>
        </div>
    `).appendTo('.root-container').hide();
    context_menu_image.contextmenu(function() { return false; });

    if(window.outerWidth <= 768) {
        context_menu_image.addClass('mobile');
    }

    function context_close_event() {
        if(context_menu_image.css('display') != 'none') {
            context_menu_image.hide();
            return true;
        }
        return false;
    }

    $(document).click(function() {
        context_close_event();
        return true;
    }).contextmenu(function() {
        context_close_event();
        return true;
    });
    document.addEventListener('scroll', context_close_event);
    
    $('.article-body img, .article-body video').contextmenu(function(e) {
        if(context_close_event())
            return true;

        context_menu_image.find('.image-context-menu').attr('data-url', e.target.src);
        context_menu_image.find('.image-context-menu').attr('data-html', e.target.outerHTML);
        context_menu_image.find('.context-opentab').attr('href', e.target.src + '?type=orig');
        context_menu_image.find('.context-search-google').attr('href', `https://www.google.com/searchbyimage?safe=off&image_url=${e.target.src}`);
        context_menu_image.find('.context-search-yandex').attr('href', `https://yandex.com/images/search?rpt=imageview&url=${e.target.src}`);
        context_menu_image.find('.context-search-iqdb').attr('href', `https://iqdb.org/?url=${e.target.src}`);
        context_menu_image.find('.context-search-saucenao').attr('href', `https://saucenao.com/search.php?db=999&dbmaski=32768&url=${e.target.src}`);

        if(e.target.nodeName == 'IMG') {
            $('.image-context-menu .context-search-wrapper').show();
        }
        else {
            $('.image-context-menu .context-search-wrapper').hide();
        }

        if(!context_menu_image.hasClass('mobile')) {
            context_menu_image.find('.image-context-menu').css('top', e.pageY + 3 - $(document).scrollTop());
            context_menu_image.find('.image-context-menu').css('left', e.pageX + 3);
        }
        context_menu_image.fadeIn(200);
        return false;
    });

    $('.context-copyurl').click(function() {
        var tmp = document.createElement('textarea');
        $(document.body).append(tmp);
        tmp.value = $('.image-context-menu').attr('data-url') + '?type=orig';
        tmp.select();
        document.execCommand('copy');
        tmp.remove();
    });

    $('.context-applymyimage').click(function() {
        Setting.myImage = $('.image-context-menu').attr('data-html');
        saveSetting();
        alert(SET_MY_IMAGE);
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
                    <div class="dropdown-item refresher-setting-removemyimage">${REMOVE_MY_IMAGE}</div>
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

    $('.refresher-setting-removemyimage').click(function() {
        if(confirm(REMOVE_MY_IMAGE_CONFIRM)) {
            alert(REMOVE_MY_IMAGE_RESULT);
            Setting.myImage = "";
            saveSetting();
        }
        return true;
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
    addCSS(HEADER_CSS);

    var state;
    var pathname = location.pathname.split('/');

    if(pathname[1] != 'b') {
        return;
    }

    channel = pathname[2];

    if(pathname[3] == undefined || pathname[3] == '') {
        state = 'board';
    }
    else if(pathname[3] == 'edit') {
        state = 'edit';
    }
    else if(pathname[3] == 'write') {
        state = 'write';
    }
    else if(/[0-9]+/.test(pathname[3])) {
        state = 'article';
    }

    addCSS(LOADER_CSS);

    await loadSetting();

    switch(state) {
        case 'article':
            if(Setting.hideAvatar) hideAvatar();
            if(Setting.hideContentImage) hideContentImage();
        case 'board':
            if(Setting.hideNotice) hideNotice();
            break;
        case 'write':
            applyMyImage();
        case 'edit':
            applyAdvancedImgUploader();
            break;
    }

    $(document).ready(function() {
        article_list = $('.board-article-list .list-table, .included-article-list .list-table');

        addSettingMenu();
        attachSettingMenuListener();

        switch(state) {
            case 'article':
                applyReplyRefreshBtn();
                applyImageMenu();
            case 'board':
                if(Setting.useRefresh) initRefresher();
                applyPreviewFilter();
                break;
        }
    });
}

init();