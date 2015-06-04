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
        if(method == '现金'){
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

    $('#txtCallUser').droptxt('/general/user/getCallUserByName','data');

    $('#txtCallSearchUser').droptxt('/general/user/getCallUserByName','data');

    // 创建财务下拉 by nele
    $('#txtAddFinanceUser').droptxt('/general/user/getSalesmanByName','data');

    //  财务管理检索业务员检索 by nele
    $('#txtFinanceSearchUser').droptxt('/general/user/getSalesmanByName','data');

    // 统计页面加载部门  by nele
    if($('#frmStatisticsSearch').length>0){
        $.getJSON('/general/getDepartmentsWithId',function(data){
            var str='<option value="">选择部门</option>';
            for(var i=0;i<data.length;i++){
                str+='<option value='+data[i].id+'>'+data[i].title+'</option>'
            }
            $('#slStatisticsDepartment').html(str);
        });
    }

    // 得到财务报表  by nele
    $('#btnGetFinanceStatistics').click(function () {
        var department = $('#slStatisticsDepartment').val();
        var begin = $('#begin').val();
        var end = $('#end').val();
        $.getJSON('/order/getStatistics',{department:department,begin:begin,end:end}, function (data) {
               console.log(data);
        });
    });

    // 押金单是否拆箱改变  by nele
    $('#slDepositGiveBackFlag').change(function () {
        if($(this).val()=='1'){
            $('#trDepositGiveBackDone').show();
        }else{
            $('#trDepositGiveBackDone').hide();
            $('#slDepositGiveBackDone').val('');
            $('#trDepositTime').hide();
            $('#txtDepositTime').val('');
        }
    });

    // 押金单是否已经拆箱改变  by nele
    $('#slDepositGiveBackDone').change(function () {
        if($(this).val()=='1'){
            $('#trDepositTime').show();
        }else{
            $('#trDepositTime').hide();
            $('#txtDepositTime').val('');
        }
    });

    // 押金单是否装箱改变  by nele
    $('#slDepositBoxedFlag').change(function () {
        if($(this).val()=='1'){
            $('#trDepositBoxedDone').show();
        }else{
            $('#trDepositBoxedDone').hide();
            $('#slDepositBoxedDone').val('');
            $('#trDepositBoxedTime').hide();
            $('#txtBoxedTime').val('');
        }
    });

    // 押金单是否已经装箱改变  by nele
    $('#slDepositBoxedDone').change(function () {
        if($(this).val()=='1'){
            $('#trDepositBoxedTime').show();
        }else{
            $('#trDepositBoxedTime').hide();
            $('#txtBoxedTime').val('');
        }
    });

    //鼠标移动订单上去 显示详情  by nele
    $('.orderDataTr').mouseover(function () {
        var top = $(this).position().top;
        var orderId = $(this).attr('data-id');
        var str='';
        $.getJSON('/order/getById/'+orderId, function (data) {
          //   console.log(data);
            str+='<span>订单号：'+data['number']+'</span><br/><span>价格：'+data['price']+'</span><br/><span>地址：' + data['address']['city']+data['address']['district']+data['address']['address']+'</span><br />';
            str+='<span>订单类型：' + data['orderType'] +'</span><br /><span>订单时间：'+ moment(data['time']).format('YYYY-MM-DD')+'</span><br />';
            str+='<span>业务员：'+data['user']['name']+'</span>';
            str+='<table class="table-inline"><thead><tr class="tl"><th>品相</th><th>总瓶数</th><th>起送时间</th><th>配送方式</th><th>每次配送瓶数</th></tr></thead>'
            for(var i=0;i<data.orders.length;i++){
                str+='<tbody><tr><td>'+data.orders[i].milkType+'</td><td>'+data.orders[i].count+'</td><td>'+moment(data.orders[i].begin).format('YYYY-MM-DD')+'</td><td>'+data.orders[i].distributeMethod+'</td><td>'+data.orders[i].distributeCount+'</td></tr>'
            }
            str+='</tbody></table>';
            $("#divInfo").css("z-index",999);//让层浮动
            $("#divInfo").css("top",top+35);//设置提示div的位置
            $("#divInfo").css("left",300);
            $('#divInfo').html(str);
            $("#divInfo").css("display","block");
        });
    });

    $('.orderDataTr').mouseout(function () {
        $("#divInfo").css("display","none");
    });

    //  变更 顺延数量隐藏 by nele
    $('#slOrderChangeType').change(function () {
        var value =  $('#slOrderChangeType').val();
        if(value=='顺延'){
            $('#trOrderChangeCount').hide();
            $('#trOrderChangeMilkType').hide();
            $('#trOrders').hide();
            $('#txtOrderChangeMilkType').val('');
            $('#txtOrderChangeCount').val('');
            $('#trOrderChangeBegin').show();
            $('#trOrderChangeEnd').show();
            $('#trOrderChangeHint').show();
        }
        if(value=='品相变更'){
            $('#trOrders').show();
            $('#trOrderChangeCount').hide();
            $('#trOrderChangeMilkType').hide();
            $('#trOrderChangeBegin').hide();
            $('#trOrderChangeEnd').hide();
            $('#trOrderChangeHint').hide();
            $('#txtOrderChangeMilkType').val('');
            $('#txtOrderChangeCount').val('');
            var orderId = $('#orderId').val();
            $.getJSON('/order/getOrdersById/'+orderId, function (data) {
                var str='<option value="">选择品相</option>';
                for(var i=0;i<data.length;i++){
                  str+='<option value="'+data[i]._id+'">'+data[i].milkType+'</option>'
                }
                $('#lsChangeOreders').html(str);
            });

           $('#lsChangeOreders').change(function () {
               if($('#lsChangeOreders').val()!=''){
                   $('#trOldOrder').show();
                   $('#trNewOrder').show();
                   $('#trBalance').show();
                   var orderId = $('#orderId').val();
                   var oid = $('#lsChangeOreders').val();
                   $.getJSON('/order/getOneOrderById/'+orderId,{oid:oid}, function (data) {
                       var data= data[0];
                       var str=' <table><thead><tr><td>品相</td><td>总瓶数</td><td>起送时间</td><td>配送方式</td><td>每次配送瓶数</td>'+
                           '</tr></thead><tbody class="lstOrder"><tr><td><input name="oid" type="hidden" value="'+data._id+'"  /><span>'+data.milkType+'</span></td>'+
                           '<td><span>'+data.count+'</span></td><td>'+moment(data.begin).format('YYYY-MM-DD')+'</td>'+
                           '<td>'+data.distributeMethod+'</td><td><span>'+data.distributeCount+'</span></td>'+
                           '</tr></tbody></table>';

                       $('#tdOldOrder').html(str);
                   });

                   var str=' <table><thead><tr><td>品相</td><td>总瓶数</td><td>起送时间</td><td>配送方式</td><td>每次配送瓶数</td>'+
                       '</tr></thead><tbody class="lstOrder"><tr><td><input type="text" class="textbox w-0-6" name="omilkType" /></td>'+
                       '<td><input type="text" class="textbox w-0-6"  name="ocount" /></td><td><input type="text" class="textbox datetime w-0-6" name="obegin" /></td>'+
                       '<td><select name="distributeMethod"><option>天天送</option><option>隔日送</option><option>周末停送</option></select>'+
                       '</td><td><input type="text" class="textbox w-0-6"  name="distributeCount" /></td>'+
                       '</tr></tbody></table>';

                   $('#tdNewOrder').html(str);
                   $('.datetime').datetimepicker();
               }
               else{
                   $('#trOldOrder').hide();
                   $('#trNewOrder').hide();
                   $('#trBalance').hide();
                   $('#trOrderChangeBegin').hide();
                   $('#trOrderChangeEnd').hide();
               }
           });
        }
        else{
            $('#trOrders').hide();
            $('#trOldOrder').hide();
            $('#trNewOrder').hide();
            $('#trBalance').hide();
            $('#trOrderChangeCount').show();
            $('#trOrderChangeMilkType').show();
            $('#trOrderChangeBegin').show();
            $('#trOrderChangeEnd').show();
            $('#trOrderChangeHint').show();
        }
    });


    //鼠标移动职工上去 显示详情  by nele
    $('.employeeDataTr').mouseenter(function () {
        var top = $(this).position().top;
        var employeeId = $(this).attr('data-id');
        var str='';
        $.getJSON('/general/getEmployeeById/'+employeeId, function (data) {
              console.log(data);
            str+='工号：'+data['jobNumber']+'<br />姓名：'+data['name']+'<br />角色：' + data['role']+'<br />';
            str+='部门：'+ ((data['department']==null)?"没有设置奶站": (data['department']['title']))+ '<br />性别：' + data['sex'] +'<br />电话：'+data['phone']+'<br />';
            str+='入职时间：'+moment(data['takeOfficeTime']).format('YYYY-MM-DD');
            $("#divInfo").css("z-index",999);//让层浮动
            $("#divInfo").css("top",top+35);//设置提示div的位置
            $("#divInfo").css("left",300);
            $('#divInfo').html(str);
            $("#divInfo").css("display","block");
        });
    });
    $('.employeeDataTr').mouseleave(function () {
        $("#divInfo").css("display","none");
    });

    $('.table').mouseleave(function () {
        $("#divInfo").css("display","none");
    })

    // 鼠标移动地址上去 显示详情  by nele
    $('.addressDataTr').mouseenter(function () {
        var top = $(this).position().top;
        var orderId = $(this).attr('data-id');
        var str='';
        $.getJSON('/general/getAddressById/'+orderId, function (data) {
           // console.log(data);
            str+='城市：'+data['city']+'<br />县区：'+data['district']+'<br />联系人：' + data['name']+'<br />';
            str+='联系电话：'+ data['phone']+ '<br />楼层：' + data['storey'] +'<br />';
            $("#divInfo").css("z-index",999);//让层浮动
            $("#divInfo").css("top",top+35);//设置提示div的位置
            $("#divInfo").css("left",300);
            $('#divInfo').html(str);
            $("#divInfo").css("display","block");
        });
    });
    $('.addressDataTr').mouseleave(function () {
        $("#divInfo").css("display","none");
    });


    // 鼠标移动押金单上去 显示详情  by nele
    $('.depositDataTr').mouseenter(function () {
        var top = $(this).position().top;
        var dId = $(this).attr('data-id');
        var str='';
        $.getJSON('/milkBox/deposit/getDepositById/'+dId, function (data) {
            console.log(data);
            str+='订单号：'+data['number']+'<br />地址：'+data['address']['city'] + data['address']['district']+data['address']['address']+'<br />';
            str+='时间：'+moment(data['time']).format('YYYY-MM-DD');
            $("#divInfo").css("z-index",999);//让层浮动
            $("#divInfo").css("top",top+35);//设置提示div的位置
            $("#divInfo").css("left",300);
            $('#divInfo').html(str);
            $("#divInfo").css("display","block");
        });
    });
    $('.depositDataTr').mouseleave(function () {
        $("#divInfo").css("display","none");
    });

    $('#slCreateStoreOperateType').change(function () {
         if($('#slCreateStoreOperateType').val()=='转入'){
             $('#trExportDepartment').show();
             $('#trImportDepartment').hide();
             $.getJSON('/general/getDepartmentsByType',{ dtype:$('#txtAddStoreDepartmentType').val()}, function (data) {
                            var str="<option value=''>请选择转出部门</option>";
                           for(var i=0;i<data.length;i++){
                               str+="<option value='"+data[i].id+"'>"+data[i].title+"</option>"
                           }
                      $('#slExportDepartment').html(str);
             });
         }
         if($('#slCreateStoreOperateType').val()=='转出'){
             $('#trImportDepartment').show();
             $('#trExportDepartment').hide();
             $.getJSON('/general/getDepartmentsByType',{ dtype:$('#txtAddStoreDepartmentType').val()}, function (data) {
                 var str="<option value=''>请选择转入部门</option>";
                 for(var i=0;i<data.length;i++){
                     str+="<option value='"+data[i].id+"'>"+data[i].title+"</option>"
                 }
                 $('#slImportDepartment').html(str);
             });
         }
    });


    //  赠品下拉  by nele
    $('#txtStoreGift').dropGiftJson('/gift/getGiftByName','data');



    $('.btnAddTr').click(function () {
       var str = '<tr class="trOrderDetail"><td><input type="text" class="textbox w-0-6" name="milkType" /></td><td><input type="text" class="textbox w-0-6"  name="count" /></td>'+
        '<td><input type="text" class="textbox datetime w-0-6" name="begin" /></td>'+
        '<td><select name="distributeMethod"><option>天天送</option><option>隔日送</option><option>周末停送</option>'+
        '</select></td><td><input type="text" class="textbox w-0-6"  name="distributeCount" /></td>'+
        '<td><a href="javascript:void(0);" class="btnDeltr">删除</a></td></tr>';
        $('.lstOrder').append(str);
        $('.datetime').datetimepicker();
        //  订单详情删除行
        $('.btnDeltr').unbind().click(function () {
            $(this).parents('.trOrderDetail').remove();
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

// 修改财务  by nele
function saveFinance(id) {
    $.post('/order/finance/edit/' + id, $('#frmEditFinance').serialize(), function () {
        popMsg('财务信息修改成功');
    });
}

// 修改押金单  by nele
function saveDeposit(id) {
    $.post('/milkBox/deposit/edit/' + id, $('#frmEditDeposit').serialize(), function () {
        popMsg('押金单信息修改成功');
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
    var name = $('#txtOrderSetUser').val();
    $.get('/order/verifyAddress',{name:name,city:city,district:district,address:address}, function (data) {
        console.log(data);
        if(data=='no') {
            $('#trOrderSetStorey').show();
            $('#trOrderSetMilkStation').show();
            $.getJSON('/general/getDepartments',function(data){
                var str='<option value="">选择奶站</option>';
                for(var i=0;i<data.length;i++){
                    str+='<option value='+data[i]+'>'+data[i]+'</option>'
                }
                $('#lstOrderMilkStation').html(str);

                $('#btnAddOrderAddress').hide();
                $('#btnAddOrderAddressNew').show();
            });
        }else{
            $('#orderAddress').val(data);
            closeDialog();
            var str='<span>'+city+'  '+district+'   '+address+'</span>';
            $('#showOrderAddress').html(str);
        }
    });
}


// 增加订单设置地址  by nele
function createOrderSelectAddress(){
    var html = '<div class="dialog"><input id="txtAid" type="hidden" />' +
        '<h3 class="dialog-title">编辑地址</h3>' +
        '<table class="detail-table">' +
        '<tr id="trOrderSetUser"><td>联系人</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetUser" /></td></tr>' +
        '<tr id="trOrderSetPhone"><td>电话</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetPhone" /></td></tr>' +
        '<tr><td>城市</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetCity" /></td></tr>' +
        '<tr><td>区县</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetDistrict" /></td></tr>' +
        '<tr><td>地址</td><td><input value="" type="text" class="textbox w-3" id="txtOrderSetAddress" /></td></tr>' +
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
    $('#txtOrderSetUser').dropjson('/general/address/getAddressByUserName','data');

    $('#txtOrderSetPhone').dropjson('/general/address/getAddressByPhone','data');

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

