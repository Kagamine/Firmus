var enums = {};

enums.role = ['离职人员', '配送人员', '服务人员', '装箱人员', '业务员', '热线员', '录入员', '人事专员', '部门主管', '系统管理员'];
enums.sex = ['男', '女'];
enums.departmentType = ['普通部门', '赠品仓库', '奶箱仓库', '奶站'];
enums.billType = enums.payMethod = ['现金', 'POS'];
enums.storey = ['楼梯', '电梯'];
enums.distributeMethod = ['天天送', '隔日送', '周末停送'];
enums.orderChangeType = ['停送', '加送', '整单停送','品相变更','赠饮','顺延'];
enums.operateType = ['入库', '出库', '转入','转出'];

module.exports = enums;