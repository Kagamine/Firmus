function resize() {
    $('.main').width($(window).width() - 280);
}

$(window).resize(function () {
    resize();
});

$(document).ready(function () {
    resize();
    $('#logo').click(function () {
        window.location = '/';
    });
    $('.datetime').datetimepicker();
    $('.chk-permission').change(function () {
        $.post('/general/permission', {
            _csrf: csrf,
            permission: $(this).attr('data-permission'),
            type: $(this).attr('data-type'),
            chkrole: $(this).attr('data-role'),
            mode: $(this).is(':checked') ? 'allow' : 'forbidden'
        }, function () {
            popMsg('权限设置成功');
        });
    });

    //城市改变事件 by nele
    $('#lstCity').change(function(){
        var city=$('#lstCity').val();
        $('#lstDistrict option').remove();
        $.getJSON("/general/address/getDistrictByCity",{city:city},function(data){
            var str='<option value="">区县</option>';
            for(var i =0;i<data.length;i++){
               str+='<option value='+data[i].city+'>'+data[i].district+'</option>';
            }
            $('#lstDistrict').append(str);
        });
    });


    //区县改变事件 by nele
    $('#lstDistrict').change(function(){
        var district=$('#lstDistrict').val();
        $('#lstMilkStation option').remove();
        $.getJSON("/general/address/getMilkStationByDistrict",{district:district},function(data){
            var str='<option value="">所属奶站</option>';
            for(var i =0;i<data.length;i++){
                str+='<option value='+data[i].id+'>'+data[i].title+'</option>';
            }
            $('#lstMilkStation').append(str);
        });
    });
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

function closeDialog() {
    $('.dialog').removeClass('active');
    setTimeout(function () {
        $('.dialog').remove();
    }, 200);
}

function postDelete(url, id) {
    $.post(url, { _csrf: csrf }, function () {
        $('#' + id).remove();
        popMsg('删除成功');
        closeDialog();
    });
}

function deleteDialog(url, id)
{
    var html = '<div class="dialog">' +
        '<h3 class="dialog-title">提示</h3>' +
        '<p>您确认要删除这条记录吗？</p>' +
        '<div class="dialog-buttons"><a href="javascript:postDelete(\'' + url + '\', \'' + id + '\')" class="button red">删除</a> <a href="javascript:closeDialog()" class="button blue">取消</a></div>' +
        '</div>';
    var dom = $(html);
    dom.css('margin-left', -(dom.outerWidth() / 2));
    $('body').append(dom);
    setTimeout(function () { dom.addClass('active'); }, 10);
}

function editAddress(id) {
    $.post('/general/address/edit/' + id, $('#frmEditAddress').serialize(), function (msg) {
        popMsg(msg);
    });
}

function saveCarStation(id) {
    var ids = '';
    $('.chk-station').each(function () {
        if ($(this).is(':checked'))
            ids += $(this).attr('data-id') + ' ';
    });
    ids = ids.trim();
    $.post('/general/car/station/edit/' + id, { _csrf: csrf,  ids: ids }, function () {
        popMsg('配送车辆行驶站点修改成功');
    });
}