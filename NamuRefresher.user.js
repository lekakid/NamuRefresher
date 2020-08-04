// ==UserScript==
// @name        NamuRefresher
// @icon        https://image.flaticon.com/icons/svg/929/929614.svg
// @author      LeKAKiD
// @version     1.9.5
// @include     https://arca.live/*
// @include     https://*.arca.live/*
// @run-at      document-start
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @require     https://unpkg.com/file-saver@2.0.2/dist/FileSaver.min.js
// @downloadURL https://raw.githubusercontent.com/lekakid/NamuRefresher/master/NamuRefresher.user.js
// @homepageURL https://github.com/lekakid/NamuRefresher
// @supportURL  https://github.com/lekakid/NamuRefresher/issues
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM.xmlHttpRequest
// ==/UserScript==
const UNSUPPORTED_VERSION = '1.5.2';
const COMPATIBLE_VERSION = '1.10.0';

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
`;
function initLoader() {
    removeLoader();
    $('.root-container').append('<div id="article_loader"></div>');
    playLoaderAnimation();
}

function playLoaderAnimation() {
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
    loader_loop = setInterval(getNewArticle, Setting.refreshTime * 1000);
}

function stopArticleRefresh() {
    clearInterval(loader_loop);
    loader_loop = null;
}

var current_request = null;
function getNewArticle() {
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
            playLoaderAnimation();
            refreshArticle(data);
        },
        error: () => {
            current_request = null;
            console.log("AJAX Request Failed");
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

    var list_length = article_list.find('a.vrow').not('.notice, .hide-notice-button').length;
    var latest_num = article_list.find('a.vrow').not('.notice, .hide-notice-button').first().find('span.col-id > span').text();

    for(var i = 0; i < list_length; i++) {
        if(parseInt(newlist.eq(i).find('span.col-id > span').text()) > parseInt(latest_num)) {
            newlist.eq(i).addClass('new');
        }
    }

    article_list.find('a.vrow').not('.notice, .hide-notice-button').remove();
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
    applyBoardBlock();
}

function initRefresher() {
    if(Setting.refreshTime == 0)
        return;

    addCSS(LOADER_CSS);

    $(document).ready(function() {
        if(loader_loop != null) {
            stopArticleRefresh();
        }
        
        startArticleRefresh();
        
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                stopArticleRefresh();
            } else {
                if (loader_loop == null) {
                    startArticleRefresh();
                }
            }
        });
    });
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
            applyCommentBlock();
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
}

function addReplyRefreshBtn() {
    var btn = '<span>　</span><a class="btn btn-success" href="#"><span class="icon ion-android-refresh"></span> 새로고침</a>';

    $(document).ready(function() {    
        function onClickReplyRefresh() {
            tryRefreshComment();
            return false;
        }

        $(btn).insertAfter('.article-comment .title a').click(onClickReplyRefresh);
        $(btn).appendTo('.article-comment .write-area .subtitle').click(onClickReplyRefresh);
    });
}
// #endregion

// #region Hide Notice
const HIDE_NOTICE_CSS = `
    .article-list .notice {
        display: none !important;
    }
`
const HIDE_NOTICE_BUTTON_CSS = `
    .article-list .hide-notice-button {
        display: flex !important;
        justify-content: center;
        width: 100%;
        background-color: #eee !important;
        color: #000 !important;
    }

    .article-list .hide-notice-button:focus {
        text-decoration: none;
    }
`;
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

function applyHideNotice() {
    addCSS(HIDE_NOTICE_BUTTON_CSS);

    var hide_btn = $(`
                        <a class="vrow hide-notice-button" href="#">
                            <div class="">공지사항 숨기기 ▲</div>
                        </a>
                    `);

    if(Setting.hideNotice) {
        hideNotice();
        hide_btn.text('공지사항 펼치기 ▼');
    }

    $(document).ready(function() {
        hide_btn.insertAfter($('.vrow.notice').last());
        hide_btn.click(function() {
            if(Setting.hideNotice) {
                showNotice();
                hide_btn.text('공지사항 숨기기 ▲');
            }
            else {
                hideNotice();
                hide_btn.text('공지사항 펼치기 ▼');
            }

            Setting.hideNotice = !Setting.hideNotice;
            saveSetting();
            return false;
        });
    });
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
                
                unsafeWindow.summernote.summernote('insertNode', $(Setting.myImage)[0]);
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
        $(`
            <div id="progress" style="width:100%;height:20px;background-color:#e2e2e2;position:relative">
                <div style="position:absolute;width:100%;text-align:center;font-weight:bold;color:#FFF">이미지 업로드 중...</div>
                <div id="progressBar" style="background-color:#00b3a1;height:100%;width:0%;text-align:center;"></div>
            </div>
        `).insertBefore("#content");
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
            unsafeWindow.summernote.summernote('insertNode', parentNode);
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
function applyPreviewFilter() {
    article_list.children().each(function(index, item) {
        var tag = $(item).find('span.tag').text();
        tag = (tag == "") ? "일반" : tag;

        if(Setting.filteredCategory[channel]['전체'] || Setting.filteredCategory[channel][tag]) {
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
const COPY_IMAGE = '원본 이미지 클립보드에 복사';
const SAVE_IMAGE = '원본 이미지 저장';
const SAVE_VIDEO = '원본 동영상 저장';
const SET_MY_IMAGE = '선택한 짤을 저장했습니다.\n다음에 게시물 작성 시 게시물 상단에 자동으로 추가됩니다.';
const CONNECTION_ABORT = '서버 연결 거부';
const ON_ERROR = '오류 발생';
function applyImageMenu() {
    addCSS(CONTEXT_MENU_CSS);

    $(document).ready(function() {
        var context_menu_image = $(`
            <div class="image-context-wrapper">
                <div class="image-context-menu" data-url="" data-html="">
                    <a href="#" onclick="return false;" class="list-item context-copyimage">${COPY_IMAGE}</a>
                    <a href="#" onclick="return false;" class="list-item context-saveimage">SAVE_SOMETHING</a>
                    <a href="#" onclick="return false;" class="list-item context-copyurl">원본 주소 복사</a>
                    <a href="#" onclick="return false;" class="list-item context-applymyimage">자짤로 등록</a>
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

            context_menu_image.find('.image-context-menu').attr('data-url', this.src);
            context_menu_image.find('.image-context-menu').attr('data-html', this.outerHTML);
            context_menu_image.find('.context-search-google').attr('href', `https://www.google.com/searchbyimage?safe=off&image_url=${this.src}`);
            context_menu_image.find('.context-search-yandex').attr('href', `https://yandex.com/images/search?rpt=imageview&url=${this.src}`);
            context_menu_image.find('.context-search-iqdb').attr('href', `https://iqdb.org/?url=${this.src}`);
            context_menu_image.find('.context-search-saucenao').attr('href', `https://saucenao.com/search.php?db=999&dbmaski=32768&url=${this.src}`);

            if(e.target.nodeName == 'IMG') {
                $('.image-context-menu .context-copyimage').show();
                $('.image-context-menu .context-saveimage').text(SAVE_IMAGE);
                $('.image-context-menu .context-search-wrapper').show();
            }
            else {
                $('.image-context-menu .context-copyimage').hide();
                $('.image-context-menu .context-saveimage').text(SAVE_VIDEO);
                $('.image-context-menu .context-search-wrapper').hide();
            }

            if(!context_menu_image.hasClass('mobile')) {
                context_menu_image.find('.image-context-menu').css('top', e.pageY + 3 - $(document).scrollTop());
                context_menu_image.find('.image-context-menu').css('left', e.pageX + 3);
            }
            context_menu_image.fadeIn(200);
            return false;
        });

        $('.context-copyimage').click(function() {
            var url = $('.image-context-menu').attr('data-url') + '?type=orig';
            GM.xmlHttpRequest({
                method: 'GET',
                url,
                responseType: 'arraybuffer',
                onprogress: function(event) {
                    $('.context-copyimage').text(`다운로드 중...(${Math.round(event.loaded / event.total * 100)}%)`);
                },
                onload: function(response) {
                    var buffer = response.response;
                    var blob = new Blob([buffer], {type: 'image/png'});
                    
                    var item = new ClipboardItem({[blob.type]: blob});
                    navigator.clipboard.write([item]);
                    context_close_event();
                    $('.context-copyimage').text(COPY_IMAGE);
                },
                onabort: function() {
                    alert(CONNECTION_ABORT);
                },
                onerror: function() {
                    alert(ON_ERROR);
                }
            });
            return false;
        });
        
        $('.context-saveimage').click(function() {
            var url = $('.image-context-menu').attr('data-url') + '?type=orig';
            GM.xmlHttpRequest({
                method: 'GET',
                url,
                responseType: 'blob',
                onload: function(response) {
                    var data = response.response;
                    
                    saveAs(data, url.substring(url.lastIndexOf('/'), url.indexOf('?')));
                },
                onabort: function() {
                    alert(CONNECTION_ABORT);
                },
                onerror: function() {
                    alert(ON_ERROR);
                }
            });
        });

        $('.context-applymyimage').click(function() {
            Setting.myImage = $('.image-context-menu').attr('data-html');
            saveSetting();
            alert(SET_MY_IMAGE);
        });
    });
}
// #endregion

// #region Content Block
function applyCommentBlock() {
    const articles = document.querySelectorAll('.comment-item');

    articles.forEach((item) => {
        const author = item.querySelector('.user-info');
        const message = item.querySelector('.message');

        const author_allow = Setting.blockUser == '' ? false : new RegExp(Setting.blockUser.join('|')).test(author.innerText);
        const text_allow = Setting.blockKeyword == '' ? false : new RegExp(Setting.blockKeyword.join('|')).test(message.innerText);

        if(text_allow || author_allow) {
            author.innerText = '차단됨';
            message.innerText = '차단된 댓글입니다.';
            if(message) message.style = 'background-color: rgb(200, 200, 200)';
        }
    });
}

function applyBoardBlock() {
    const board = document.querySelector('.included-article-list, .board-article-list');
    const articles = board.querySelectorAll('a[class="vrow"]');

    articles.forEach((item) => {
        const title = item.querySelector('.col-title');
        const author = item.querySelector('.col-author');
        const preview = item.querySelector('.vrow-preview');

        const title_allow = Setting.blockKeyword == '' ? false : new RegExp(Setting.blockKeyword.join('|')).test(title.innerText);
        const author_allow = Setting.blockUser == '' ? false : new RegExp(Setting.blockUser.join('|')).test(author.innerText);

        if(title_allow || author_allow) {
            item.setAttribute('data-url', item.href);
            item.removeAttribute('href');
            item.style = 'background-color: rgb(200, 200, 200)';
            title.innerText = '차단된 게시물입니다.';
            author.innerText = '차단됨';
            if(preview) preview.style = 'display: none';
        }
    });
}
// #endregion

// #region Setting
const SETTNG_BUTTON_NAME = '스크립트 설정';
const SETTING_HEADER = '아카 리프레셔 (Arca Refresher) 설정';
const REMOVE_MY_IMAGE_CONFIRM = '등록한 자짤을 삭제하시겠습니까?';
const REMOVE_MY_IMAGE_RESULT = '삭제되었습니다.';
const SETTING_RESET_CONFIRM = '모든 설정이 초기화 됩니다. 계속하시겠습니까?';

const USE = '사용';
const UNUSE = '사용 안 함';

let Setting = {
    version: GM.info.script.version,
    refreshTime: 5,
    hideNotice: false,
    hideAvatar: true,
    hideContentImage: false,
    myImage: '',
    filteredCategory: {},
    blockKeyword: [],
    blockUser: []
}

const SettingInfo = {
    refreshTime: {
        name: '게시물 자동 새로고침',
        description: '일정 시간마다 자동으로 게시물 목록을 갱신합니다.'
    },
    hideNotice: {
        name: '공지사항 숨기기',
        description: '상단 공지사항을 제거해줍니다.'
    },
    hideAvatar: {
        name: '프로필 아바타 숨기기',
        description: '게시물 조회 시 이용자 옆 프로필 이미지를 제거합니다.'
    },
    hideContentImage: {
        name: '본문 미디어 컨텐츠 숨기기',
        description: '게시물 조회 시 본문의 이미지, 동영상을 제거합니다.'
    },
    myImage: {
        name: '등록한 자짤 삭제',
        description: '등록한 자짤을 삭제합니다.'
    },
    filteredCategory: {
        name: '카테고리 미리보기 숨기기',
        description: '체크한 카테고리의 미리보기를 표시하지 않습니다.'
    },
    blockUser: {
        name: '이용자 차단',
        description: '작성한 키워드를 포함하는 닉네임을 가진 인원이 쓴 글과 댓글을 표시하지 않습니다.'
    },
    blockKeyword: {
        name: '키워드 차단',
        description: '작성한 키워드가 포함된 제목의 글, 댓글을 표시하지 않습니다.'
    }
}

const DefaultCategory = {
    '전체': false,
    '일반': false
}

function compareVersion(saved_data, criteria) {
    if(saved_data == null || saved_data.version == undefined)
        return true;
    
    var a = saved_data.version.split('.');
    var b = criteria.split('.');

    var c = 0;
    for(i = 0; i < a.length; i++) {
        if(parseInt(a[i]) > parseInt(b[i])) 
            break;
        else if(parseInt(a[i]) < parseInt(b[i]))
            return true;
    }

    return false;
}

function convertSetting(LoadedSetting) {
    const NewSetting = Object.assign({}, Setting);
    NewSetting.refreshTime = LoadedSetting.refreshTime.value;
    NewSetting.hideNotice = LoadedSetting.hideNotice.value;
    NewSetting.hideAvatar = LoadedSetting.hideAvatar.value;
    NewSetting.hideContentImage = LoadedSetting.hideContentImage.value;
    NewSetting.myImage = LoadedSetting.myImage.value;

    const tmp = {};
    for(key in LoadedSetting.filteredCategory) {
        if(key == 'name' || key == 'description')
            continue;

        tmp[key] = Object.assign({}, LoadedSetting.filteredCategory[key]);
    }

    NewSetting.filteredCategory = tmp;

    return NewSetting;
}

async function loadSetting() {
    const LoadedSetting = JSON.parse(await GM.getValue('Setting', 'null'));

    if(compareVersion(LoadedSetting, UNSUPPORTED_VERSION))
        return;

    if(compareVersion(LoadedSetting, COMPATIBLE_VERSION)) {
        Setting = convertSetting(LoadedSetting);
        saveSetting();
    }
    else {
        Setting = Object.assign(Setting, LoadedSetting);
    
    }
    if(Setting.filteredCategory[channel] == undefined)
        Setting.filteredCategory[channel] = Object.assign({}, DefaultCategory);
}

async function saveSetting() {
    await GM.setValue('Setting', JSON.stringify(Setting));
}

async function resetSetting() {
    await GM.setValue('Setting', '');
}

const SETTING_CSS = `
    .script-setting-wrapper {
        margin: 0 auto;
        max-width: 1300px;
        border: 1px solid #bbb;
        background-color: #fff;
        padding: 1rem;
    }

    .script-setting-wrapper select,
    .script-setting-wrapper textarea {
        display: block;
        width: 100%;
        padding: .5rem .75rem;
        color: #55595c;
        background-color: #fff;
        border: 1px solid #bbb;
    }

    .script-setting-wrapper input {
        width: 0;
    }

    .script-setting-wrapper input+label {
        border: 1px solid transparent;
        border-radius: 100px;
        padding: 0 10px;
        cursor: pointer;
    }

    .script-setting-wrapper input:checked+label {
        border-color: #3d414d;
        color: #fff;
        background: #3d414d;
    }

    .script-setting-wrapper input+label:hover {
        border: 1px solid #3d414d;
    }

    .script-setting-wrapper .align-right {
        text-align: right;
    }
`;
function addSettingMenu() {
    addCSS(SETTING_CSS);

    $(document).ready(function() {
        var nav = $('ul.navbar-nav').first();
        var menubtn = `
            <li class="nav-item dropdown">
                <a aria-expanded="false" class="nav-link" href="#">
                <span class="hidden-sm-down">${SETTNG_BUTTON_NAME}</span>
                <span class="hidden-md-up"><span class="ion-gear-a"></span></span>
                </a>
            </li>`;
        $(menubtn).appendTo(nav).click(function () {
            if($('.script-setting-wrapper').css('display') != 'none')
                return false;

            applySettingView();

            $('.content-wrapper').fadeOut(200, function() {
                $('.script-setting-wrapper').fadeIn(200);
            });
            return false;
        });

        var menu_wrapper = `
            <div class="script-setting-wrapper clearfix">
                <div class="row">
                    <div class="col-sm-0 col-md-2"></div>
                    <div class="col-sm-12 col-md-8">
                        <div class="dialog card">
                            <div calss="card-block">
                                <h4 class="card-title">${SETTING_HEADER}</h4>
                                <div class="row">
                                    <label class="col-xs-3">${SettingInfo.refreshTime.name}</label>
                                    <div class="col-xs-9">
                                        <select id="useRefresh">
                                            <option value="0">사용 안 함</option>
                                            <option value="3">3초</option>
                                            <option value="5">5초</option>
                                            <option value="10">10초</option>
                                        </select>
                                        <p class="text-muted">${SettingInfo.refreshTime.description}</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <label class="col-xs-3">${SettingInfo.hideAvatar.name}</label>
                                    <div class="col-xs-9">
                                        <select id="hideAvatar">
                                            <option value="0">사용 안 함</option>
                                            <option value="1">사용</option>
                                        </select>
                                        <p class="text-muted">${SettingInfo.hideAvatar.description}</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <label class="col-xs-3">${SettingInfo.hideContentImage.name}</label>
                                    <div class="col-xs-9">
                                        <select id="hideContentImage">
                                            <option value="0">사용 안 함</option>
                                            <option value="1">사용</option>
                                        </select>
                                        <p class="text-muted">${SettingInfo.hideContentImage.description}</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <label class="col-xs-3">${SettingInfo.myImage.name}</label>
                                    <div class="col-xs-9">
                                        <a href="#" id="removeMyImage" class="btn btn-success">삭제</a>
                                        <p class="text-muted">${SettingInfo.myImage.description}</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <label class="col-xs-3">${SettingInfo.filteredCategory.name}</label>
                                    <div class="col-xs-9">
                                        <div class="category-group"></div>
                                        <p class="text-muted">${SettingInfo.filteredCategory.description}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <label class="col-xs-3">${SettingInfo.blockUser.name}</label>
                                <div class="col-xs-9">
                                    <textarea id="blockUser" rows="6" placeholder="차단할 이용자의 닉네임을 입력, 줄바꿈으로 구별합니다."></textarea>
                                    <p class="text-muted">${SettingInfo.blockUser.description}</p>
                                </div>
                            </div>
                            <div class="row">
                                <label class="col-xs-3">${SettingInfo.blockKeyword.name}</label>
                                <div class="col-xs-9">
                                    <textarea id="blockKeyword" rows="6" placeholder="차단할 키워드를 입력, 줄바꿈으로 구별합니다."></textarea>
                                    <p class="text-muted">${SettingInfo.blockKeyword.description}</p>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-xs-6">
                                    <a href="#" id="resetSetting" class="btn btn-danger">설정 초기화</a>
                                </div>
                                <div class="col-xs-6 align-right">
                                    <a href="#" id="saveAndClose" class="btn btn-primary">저장</a>
                                    <a href="#" id="closeSetting" class="btn btn-success">닫기</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        $(menu_wrapper).insertAfter('.content-wrapper').hide();

        var category = $('.content-wrapper .board-category a');
        var category_btn = `
            <span>
                <input type="checkbox" id="">
                <label for=""></label>
            </span>
        `;
        var general = $(category_btn);
        general.find('input').attr('id', '전체');
        general.find('label').attr('for', '전체');
        general.find('label').text('전체');
        general.appendTo('.category-group');
        category.each(function(index, item) {
            var data = $(item).text();
            data = data == "전체" ? "일반" : data;
            var btn = $(category_btn);
            btn.find('input').attr('id', data);
            btn.find('label').attr('for', data);
            btn.find('label').text(data);
            btn.appendTo('.category-group');
        });

        $('#removeMyImage').click(function() {
            if(!confirm(REMOVE_MY_IMAGE_CONFIRM))
                return false;

            Setting.myImage = '';
            saveSetting();
            alert(REMOVE_MY_IMAGE_RESULT);
        });

        $('#resetSetting').click(function() {
            if(!confirm(SETTING_RESET_CONFIRM))
                return false;

            resetSetting();
            location.reload();
            return false;
        });

        $('#saveAndClose').click(function() {
            Setting.refreshTime = $('.script-setting-wrapper #useRefresh').val();
            Setting.hideAvatar = $('.script-setting-wrapper #hideAvatar').val() == 1;
            Setting.hideContentImage = $('.script-setting-wrapper #hideContentImage').val() == 1;

            var category = $('.script-setting-wrapper .category-group input');
            category.each(function(index, item) {
                if(Setting.filteredCategory[channel] == undefined) {
                    Setting.filteredCategory[channel] = $.extend({}, Setting.filteredCategory.default);
                }
                Setting.filteredCategory[channel][item.id] = $(item).is(':checked');
            });

            let blockUser = $('.script-setting-wrapper #blockUser').val();
            if(blockUser == "") {
                Setting.blockUser = [];
            }
            else {
                Setting.blockUser = blockUser.split('\n');
            }

            let blockKeyword = $('.script-setting-wrapper #blockKeyword').val();
            if(blockKeyword == "") {
                Setting.blockKeyword = [];
            }
            else {
                Setting.blockKeyword = blockKeyword.split('\n');
            }

            saveSetting();
            location.reload();
        });

        $('#closeSetting').click(function() {
            $('.script-setting-wrapper').fadeOut(200, function() {
                $('.content-wrapper').fadeIn(200);
            });
        });
    });
}

function applySettingView() {
    $('.script-setting-wrapper #useRefresh').val(Setting.refreshTime);
    $('.script-setting-wrapper #hideAvatar').val(Setting.hideAvatar ? 1 : 0);
    $('.script-setting-wrapper #hideContentImage').val(Setting.hideContentImage ? 1 : 0);
    
    for(key in Setting.filteredCategory[channel]) {
        if(Setting.filteredCategory[channel][key])
            $(`.category-group input#${$.escapeSelector(key)}`).prop('checked', 'checked');
    }

    $('.script-setting-wrapper #blockUser').text(Setting.blockUser.join('\n'));
    $('.script-setting-wrapper #blockKeyword').text(Setting.blockKeyword.join('\n'));
}
// #endregion

// #region Initilize
var channel = null;
async function initialize() {
    addCSS(HEADER_CSS);
    addCSS(HIDE_PREVIEW_CSS);

    var pathname = location.pathname.split('/');

    if(pathname[1] != 'b') {
        return;
    }

    channel = pathname[2];
    await loadSetting();

    if(pathname[3] == undefined || pathname[3] == '') {
        initBoard(false);
    }
    else if(pathname[4] == 'edit') {
        initWrite(true);
    }
    else if(pathname[3] == 'write') {
        initWrite(false);
    }
    else if(/[0-9]+/.test(pathname[3])) {
        initBoard(true);
    }

    addSettingMenu();
}

var article_list = null;
function initBoard(isArticleView) {
    article_list = $('.board-article-list .list-table, .included-article-list .list-table');

    if(isArticleView) {
        if(Setting.hideAvatar) hideAvatar();
        if(Setting.hideContentImage) hideContentImage();
        addReplyRefreshBtn();
        applyImageMenu();
        document.addEventListener('DOMContentLoaded', () => {
            applyCommentBlock();
        });
    }

    initRefresher();
    applyHideNotice();
    applyPreviewFilter();
    document.addEventListener('DOMContentLoaded', () => {
        applyBoardBlock();
    });
}

function initWrite(isEditView) {
    if(!isEditView) {
        applyMyImage();
    }

    applyAdvancedImgUploader();
}
// #endregion

initialize();