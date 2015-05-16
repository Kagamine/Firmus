var departmentId;

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

    // 城市改变事件 by nele
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


    // 区县改变事件 by nele
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

    // 修改页面加载的时候显示奶厂
    if($('#frmEditAddress').length>0){
        var city =  $('#txtEditAddressCity').val();
        var district=$('#txtEditAddressDistrict').val();
        $('#lstEditAddressMilkStation option').remove();
        $.getJSON('/general/address/getDeparmentByCity',{city:city,district:district},function(data){
            var str='<option value="">选择奶站</option>';
            if(departmentId!=null){
                for(var i=0;i<data.length;i++){
                    if(data[i].id==departmentId){
                        str+='<option value='+data[i].id+' selected>'+data[i].title+'</option>';
                    }
                    else{
                        str+='<option value='+data[i].id+'>'+data[i].title+'</option>';
                    }
                }
            }
            $('#lstEditAddressMilkStation').append(str);
        });
    }

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

    // 订单加载页面时根据城市选择县区
    if($('#lstOrderCity').length>0){
        var city=$('#lstOrderCity').val();
        $('#lstOrderDistrict option').remove();
        $.getJSON("/general/address/getDistrictByCity",{city:city},function(data){
            var str='<option value="">区县</option>';
            for(var i =0;i<data.length;i++){
                str+='<option value='+data[i].city+'>'+data[i].district+'</option>';
            }
            $('#lstOrderDistrict').append(str);
        });
    }

    // 订单城市改变显示县区
    $('#lstOrderCity').change(function(){
        var city=$('#lstOrderCity').val();
        $('#lstOrderDistrict option').remove();
        $.getJSON("/general/address/getDistrictByCity",{city:city},function(data){
            var str='<option value="">区县</option>';
            for(var i =0;i<data.length;i++){
                str+='<option value='+data[i].city+'>'+data[i].district+'</option>';
            }
            $('#lstOrderDistrict').append(str);
        });
    });

    // 订单县城改变选择奶站 by nele
    $('#lstOrderDistrict').change(function(){
        var district=$('#lstOrderDistrict').val();
        var city=$('#lstOrderCity').val();
        $('#lstOrderDepartment option').remove();
        $.getJSON("/general/address/getMilkStationByDistrict",{district:district,city:city},function(data){
            console.log(data);
            var str='<option value="">所属奶站</option>';
            for(var i =0;i<data.length;i++){
                str+='<option value='+data[i].id+'>'+data[i].title+'</option>';
            }
            $('#lstOrderDepartment').append(str);
        });
    });

    // 创建订单付款方式的改变隐藏或显示POS号 by nele
    $('#lstPaymentMethod').change(function () {
        var method = $('#lstPaymentMethod').val();
        if(method == '0'){
            $('#pos-number-row').hide();
        }
        else{
            $('#pos-number-row').show();
        }
    });

    // 是否回访单选按钮戳发事件 by nele
    $('#slCallNeedFeedback').change( function() {
        if($(this).val()=='1'){
            $('#trCallIsFeedbacked').show();
        }
        else{
            $('#trCallIsFeedbacked').hide();
            $('#trCallFeedbackResult').hide();
            $('#slCallIsFeedbacked').val('0')
            $('#trCallFeedbackResult').val('');
        }
    });

    // 是否已经回访单选按钮戳发事件 by nele
    $('#slCallIsFeedbacked').change( function() {
        if($(this).val()=='1'){
            $('#trCallFeedbackResult').show();
        }
        else{
            $('#trCallFeedbackResult').hide();
            $('#trCallFeedbackResult').val('');
        }
    });

    $('#txtCallUser').droptxt('/general/user/getSalesmanByName','data');

    $('#txtCallSearchUser').droptxt('/general/user/getSalesmanByName','data');

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

//  保存来电修改 by nele
function saveCall(id) {
    $.post('/call/edit/' + id, $('#frmEditCall').serialize(), function () {
        popMsg('来电信息修改成功');
    });
}

// 确定地址触发事件  by nele
function saveOrderAddress(){
    var city = $('#txtOrderSetCity').val();
    var district = $('#txtOrderSetDistrict').val();
    var address = $('#txtOrderSetAddress').val();
    $.get('/order/verifyAddress',{city:city,district:district,address:address}, function (data) {
         console.log(data);
        if(data=='no') {
            $('#trOrderSetUser').show();
            $('#trOrderSetPhone').show();
            $('#trOrderSetStorey').show();
            $('#trOrderSetMilkStation').show();
            $.getJSON('/general/getDepartments',function(data){
                var str='<option>选择奶站</option>';
                for(var i=0;i<data.length;i++){
                    str+='<option value='+data[i]+'>'+data[i]+'</option>'
                }
                $('#lstOrderMilkStation').html(str);

                $('#btnAddOrderAddress').hide();
                $('#btnAddOrderAddressNew').show();
            });
        }else{
            $('#orderAddress').val(data);
        }
    });
}


// 增加订单设置地址  by nele
function createOrderSelectAddress(){
    var html = '<div class="dialog">' +
        '<h3 class="dialog-title">编辑地址</h3>' +
        '<table class="detail-table">' +
        '<tr><td>城市</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetCity" /></td></tr>' +
        '<tr><td>区县</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetDistrict" /></td></tr>' +
        '<tr><td>地址</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetAddress" /></td></tr>' +
        '<tr id="trOrderSetUser" style="display: none"><td>联系人</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetUser" /></td></tr>' +
        '<tr id="trOrderSetPhone" style="display: none"><td>电话</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetPhone" /></td></tr>' +
        '<tr id="trOrderSetStorey" style="display: none"><td>楼层指示</td><td><select id="lstOrderStorey"><option value="电梯">电梯</option><option value="楼梯">楼梯</option></select></td></tr>' +
        '<tr id="trOrderSetMilkStation" style="display: none"><td>奶站</td><td><select id="lstOrderMilkStation"></select></td></tr>' +
        '</table>' +
        '<div class="dialog-buttons"><input onclick="saveOrderAddress()" class="button blue" type="button" id="btnAddOrderAddress" disabled="disabled" value="确定" />' +
        '<input onclick="saveOrderAddress()" class="button blue" type="button" id="btnAddOrderAddressNew" value="确定" style="display: none;" /><a href="javascript:closeDialog()" class="button">取消</a></div>' +
        '</div>';
    var dom = $(html);
    dom.css('margin-left', -(dom.outerWidth() / 2));
    $('body').append(dom);
    dom.addClass('active');



    $('#txtOrderSetAddress').droptxt('/general/address/getAddressByName','data');
    $('#txtOrderSetCity').droptxt('/general/address/getCitiesByName','data');
    $('#txtOrderSetDistrict').droptxt('/general/address/getDistrictsByName','data');

    $('#txtOrderSetCity').on('keyup',function(){
        if($('#txtOrderSetCity').val()!="" && $('#txtOrderSetDistrict').val()!="" && $('#txtOrderSetAddress').val()!=""){
            $('#btnAddOrderAddress').attr('disabled',false);
            $('#btnAddOrderAddressNew').attr('disabled',false);
        }
    });

    $('#txtOrderSetDistrict').on('keyup',function(){
        if($('#txtOrderSetCity').val()!="" && $('#txtOrderSetDistrict').val()!="" && $('#txtOrderSetAddress').val()!=""){
            $('#btnAddOrderAddress').attr('disabled',false);
            $('#btnAddOrderAddressNew').attr('disabled',false);
        }
    });

    $('#txtOrderSetAddress').on('keyup',function(){
        if($('#txtOrderSetCity').val()!="" && $('#txtOrderSetDistrict').val()!="" && $('#txtOrderSetAddress').val()!=""){
            $('#btnAddOrderAddress').attr('disabled',false);
            $('#btnAddOrderAddressNew').attr('disabled',false);
        }
    });

    $('#txtOrderSetUser').on('keyup',function(){
        if($('#txtOrderSetCity').val()!="" && $('#txtOrderSetDistrict').val()!="" && $('#txtOrderSetAddress').val()!=""){
            $('#btnAddOrderAddress').attr('disabled',false);
            $('#btnAddOrderAddressNew').attr('disabled',false);
        }
    });

    $('#btnAddOrderAddressNew').click(function(){
        var city = $('#txtOrderSetCity').val();
        var district = $('#txtOrderSetDistrict').val();
        var address = $('#txtOrderSetAddress').val();
        var name = $('#txtOrderSetUser').val();
        var phone = $('#txtOrderSetPhone').val();
        var storey = $('#lstOrderStorey').val();
        var milkStation = $('#lstOrderMilkStation').val();
        $.get('/general/address/orderAdd',{city:city,district:district,address:address,name:name,phone:phone,storey:storey,milkStation:milkStation},function(data){
            $('#orderAddress').val(data);
            closeDialog();
            var str='<span>'+city+'  '+district+'   '+address+'</span>';
            $('#showOrderAddress').html(str);
        });
    })
}