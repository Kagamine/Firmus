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
        var city=$('#lstCity').val();
        $('#lstMilkStation option').remove();
        $.getJSON("/general/address/getMilkStationByDistrict",{district:district,city:city},function(data){
            console.log(data);
            var str='<option value="">所属奶站</option>';
            for(var i =0;i<data.length;i++){
                str+='<option value='+data[i].id+'>'+data[i].title+'</option>';
            }
            $('#lstMilkStation').append(str);
        });
    });

    // 增加地址下拉选择  by nele
    $('#txtAddAddressCity').droptxt('/general/address/getCitiesByName','data');
    $('#txtAddAddressDistrict').droptxt('/general/address/getDistrictsByName','data');
    $('#txtAddAddressAddress').droptxt('/general/address/getAddressByName','data');

    // 修改地址下拉选择 by nele
    $('#txtEditAddressCity').droptxt('/general/address/getCitiesByName','data');
    $('#txtEditAddressDistrict').droptxt('/general/address/getDistrictsByName','data');
    $('#txtEditAddressAddress').droptxt('/general/address/getAddressByName','data');


    //修改地址信息时 地址的改变奶站改变
    $('#txtEditAddressCity').blur(function(){
         var city =  $('#txtEditAddressCity').val();
         var district=$('#txtEditAddressDistrict').val();
         $('#lstEditAddressMilkStation option').remove();
         $.getJSON('/general/address/getDeparmentByCity',{city:city,district:district},function(data){
             var str='';
             for(var i=0;i<data.length;i++){
                 str+='<option value='+data[i].id+'>'+data[i].title+'</option>';
             }
             $('#lstEditAddressMilkStation').append(str);
         });
    });

    $("#txtAddAddressCity").droptxt('/general/address/getCitiesByName', 'data');

    //修改区县信息时 地址的改变奶站改变
    $('#txtEditAddressDistrict').blur(function(){
        var city =  $('#txtEditAddressCity').val();
        var district=$('#txtEditAddressDistrict').val();
        $('#lstEditAddressMilkStation option').remove();
        $.getJSON('/general/address/getDeparmentByCity',{city:city,district:district},function(data){
            var str='<option value="">选择奶站</option>';
            for(var i=0;i<data.length;i++){
                str+='<option value='+data[i].id+'>'+data[i].title+'</option>';
            }
            $('#lstEditAddressMilkStation').append(str);
        });
    });

    // 修改地址页面中的奶站的变化服务人员的改变服务人员
    $('#lstEditAddressMilkStation').change(function(){
         var departmentId = $('#lstEditAddressMilkStation').val();
         $('#lstEditAddressServiceUser option').remove();
         $.getJSON('/general/getServiceUserByDepartmentId',{departmentId:departmentId},function(data){
             var str='<option value="">选择服务人员</option>';
             for(var i=0;i<data.length;i++){
                 str+='<option id='+data[i].id+'>'+data[i].username+'</option>'
             }
             $('#lstEditAddressServiceUser').append(str);
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
    $.post(url, { _csrf: csrf }, function (data) {
        $('#' + id).remove();
        if (data == 'ok' || data == 'OK')
            popMsg('删除成功');
        else
            popMsg(data);
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

function saveOrder(id) {
    $.post('/order/edit/' + id, $('#frmEditOrder').serialize(), function () {
        popMsg('订单信息修改成功');
    });
}