function resize() {
    $('.main').width($(window).width() - 280);
}

$(window).resize(function () {
    resize();
});

$(document).ready(function () {
    resize();
});

function popMsg(txt) {
    var msg = $('<div class="msg hide">' + txt + '</div>');
    msg.css('left', '50%');
    $('body').append(msg);
    msg.css('margin-left', '-' + parseInt(msg.outerWidth() / 2) + 'px');
    msg.removeClass('hide');
    setTimeout(function () {
        msg.addClass('hide');
        setTimeout(function () {
            msg.remove();
        }, 400);
    }, 2600);
}

function editDepartment()
{
    $.post(window.location.pathname, $('#frmEditDepartment').serialize(), function () {
        popMsg('部门信息保存成功');
    });
}