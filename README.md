# AutoDatatable
Creación dinámica de tablas numéricas


var adtt = new $.AutoDatatable( $("#div-table-1"), {
    url : 'json/manager-tables',
    data : {
        action     : 'table-26',
        _desde     : $("#_desde").val(),
        _hasta     : $("#_hasta").val()
    }
},'FAMILIA');
