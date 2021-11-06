//JSON en entrada
/*[
    {
        "PRODUCTO":"ARROZ",
        "ID":1,
        "2021-01":0,
        "2021-02":0,
        "2021-03":0,
        "2021-04":0,
        "2021-05":200,
        "2021-06":3300
    },
    {
        "PRODUCTO":"ATUN",
        "ID":2,
        "2021-01":0,
        "2021-02":0,
        "2021-03":0,
        "2021-04":3500,
        "2021-05":2000,
        "2021-06":2000,
    }
]*/

//Html en Salida
//|PRODUCTO|2021-01|2021-02|2021-03|2021-04|2021-05|2021-06
//|ARROZ   |      0|      0|      0|      0|    200| $3.300    
//|ATUN    |      0|      0|      0| $3.500| $2.000| $2.000   
//--------------------------------------------------------- 
//|        |      0|      0|      0| $3.500| $2.200| $5.300 

(function ($) { 

    $.AutoDatatable = function (contentId, ajaxData, keyColumn) { 
        //Contenedor de la tabla
        this.contentId    = (contentId instanceof $) ? contentId : $(contentId);
        //Array de variables para ejecutar la consulta por lado de servidor
        this.ajaxData     = ajaxData;
        //Columna número 0
        this.keyColumn    = keyColumn;
        //Array json que viene del lado servidor
        this.responseAjax = null;
        //Id de la tabla creada
        this.uuid         = null;
        //Objeto datatable
        this.tableDtt     = null;
        //Explotable querie decir si se le puede añadir un evento a la celda, la celda se mostrara como un link
        this.explotable   = { ok : false, minValue: 0, ignoreColFromKey : null};
        //Recibe un array con los indices de las columnas que no deben sumar un total
        this.ignoreTotal  = [0];
        //Definición por defecto para el formato de los números
        this.defaultNF    = {Prefix: '', ThousandSeparator: '.', DecimalSeparator: ',', Decimals: 0};  
        //Columnas invisibles 
        this.columInvisible = [];
        //Titulo para la exportación de los documentos, por defecto toma el tag title del Html
        this.titleExportDocs = null;
        //Agregar contenido html a una celda
        this.prependColumn = [];
        //Example
        /*adtt.prependColumn = [ 
            {
                indexs : [0,1],
                type : "button",
                callbackId : 'drawchart',
                element : "<button class='btn btn-primary btn-sm drawchart'><i class='fas fa-chart-bar'></i></button>"
            },
            {
                //Si el index esta vacio se agregara dom a todas las celdas númericas > 0
                indexs : [],
                type : "button",
                callbackId : 'detail',
                element: "<button class='btn btn-success btn-sm detail'><i class='fas fa-eye'></i></button>"
            }
        ];
        Uso de la llamada
        adtt.events.on('cellexplotable', function(obj) {
            console.log(obj);
        });
        */
        //Js Date
        this.date = new Date();
        //PdfDoc
        this.pdf = {
            header : null, 
            subheader: null, 
            imgLogo: null, 
            orientation: 'landscape', 
            w : 150, 
            h: 70,
            footerTextLeft : ' Creado el ' + this.date.getDate() + '-' + (this.date.getMonth() + 1) + '-' + this.date.getFullYear() + " por Gestmaq One - ERP",
            footerTextRight : {
                page : 'Página ',
                of   : ' de '
            }
        };
        //Eventos customizados
        this.events = new function() {
            var _triggers = {};
            this.on = function(event,callback) {
                if(!_triggers[event])
                    _triggers[event] = [];
                _triggers[event].push( callback );
            }

            this.triggerHandler = function(event,params) {
                if( _triggers[event] ) {
                    for( i in _triggers[event] )
                        _triggers[event][i](params);
                }
            }
        };

    };

    $.AutoDatatable.prototype = {
        //Creación del id de la tabla
        uuidCreate: function(){
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        //Propiedades por defecto
        defaultProperties: function () {
            $.extend( $.fn.dataTable.defaults, {
                dom: "<'row'<'col-sm-12 col-md-6'B><'col-sm-12 col-md-6'f>>" +
                     "<'row'<'col-sm-12'tr>>" +
                     "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
                scrollY        : '450px',
                scrollX        : true,
                select         : false,
                processing     : true,
                scrollCollapse : true,
                paging         : true,
                info           : false,
                lengthChange   : false, 
                searching      : true,
                ordering       : true,
                pageLength     : 12,
                language: {
                    decimal     : ",",
                    thousands   : ".",
                    search       : "Filtrar",
                    zeroRecords  : "Sin filas que mostrar",
                    infoEmpty    : "No hay filas que mostrar",
                    info         : "Mostrando _TOTAL_ filas ",
                    infoFiltered : " de un total de _MAX_ filas",
                    processing   : "Procesando datos...",
                    paginate: {
                        previous: "<",
                        next    : ">",
                        first   : "<<",
                        last    : ">>"
                    }
                },
            } );
        },
        //Formateo del valor de la celda
        onNumberFormat: function(value){
            return $.fn.dataTable.render.number(
                this.defaultNF.ThousandSeparator, 
                this.defaultNF.DecimalSeparator, 
                this.defaultNF.Decimals, 
                this.defaultNF.Prefix ).display(value);
        },
        onConvertToNumber: function(value){
            if (typeof value !== 'undefined') {
                if (value != null) { 
                    //Limpieza de las celdas para los números
                    value = value.toString().replaceAll("$","");
                    value = value.toString().replaceAll("%","");
                    value = value.replace(/<br\s*\/?>/ig, "\n");
                    value  = jQuery('<p>' + value + '</p>').text();
                    return value;                             
                }
                return 0;
            }
            return 0;
        },
        onIsNumber: function(value){
            if (typeof value !== 'undefined') {
                if (value != null) { 
                    //Limpieza de las celdas para los números
                    value = value.toString().replaceAll("$","");
                    //value = value.toString().replaceAll(",","");
                    //value = value.toString().replaceAll(".","");
                    value = value.replace(/<br\s*\/?>/ig, "\n");
                    value  = jQuery('<p>' + value + '</p>').text();
                    return $.isNumeric(value);                               
                }
                return false;
            }
            return false;
        },
        //Inicialización del proceso de creación
        onInit: function(){

            var responseObject;
            var $this = this;

            $.ajax({
                url      : this.ajaxData.url,
                data     : this.ajaxData.data,
                type     : 'GET',
                datatype : 'json',
                success:function(r){
                    responseObject = r;
                },
                complete:function(){
                    $this.onDrawTable(responseObject, $this.uuidCreate());        
                },
                error: function (r,s,e) {
                    console.log(r.responseText);    
                } 
            });

        },
        onDrawTable: function(object, tableUuid){

            var $this = this;

            $this.responseAjax = object;
            $this.uuid         = tableUuid;
            $this.defaultProperties();

            //console.log($this.responseAjax);
            
            var columns     = [];
            var columnsDef  = [];
            var doomTfoot   = "";
            var dataSet     = JSON.parse($this.responseAjax);

            var index = 0;
            $.each(dataSet[0], function( key, value ) {
                var item    = {};
                item.data   = key;
                item.title  = anoMesString(key);

                if (key != $this.keyColumn) {
                    item.class  = 'text-right';
                };
                columns.push(item); 
                doomTfoot += "<th></th>";


                if ($this.explotable.ok) {
                    if ($.inArray(key, $this.explotable.ignoreColFromKey)) {

                        columnsDef.push({
                            targets: index,
                            data   : null,
                            render: function ( data, type, row ) {
                                if ($.isNumeric(data)) {
                                    if (data > $this.explotable.minValue) {
                                        return "<a href='javascript:void(0)' class='text-right cellexplotable'>" + $this.onNumberFormat(data) + "</a>";
                                    };
                                    return "<p class='text-right'>" + $this.onNumberFormat(data) + "</p>";
                                }else{
                                    return "<a href='javascript:void(0)' class='cellexplotable'>" + data + "</a>";
                                };
                            },
                            defaultContent: ""
                        });

                    }else{

                        columnsDef.push({
                            targets: index,
                            data   : null,
                            render: function ( data, type, row ) {
                                if ($.isNumeric(data)) {
                                    return "<p class='text-right'>" + $this.onNumberFormat(data) + "</p>";
                                };
                                return data;
                            },
                            defaultContent: ""
                        });

                    };
                }else{

                    columnsDef.push({
                        targets: index,
                        data   : null,
                        render: function ( data, type, row ) {
                            if ($.isNumeric(data)) {
                                return "<p class='text-right'>" + $this.onNumberFormat(data) + "</p>";
                            };
                            return data;
                        },
                        defaultContent: ""
                    });
                };
                index++;
            });

            if ($this.columInvisible.length > 0) {
                columnsDef.push({
                    targets: $this.columInvisible,
                    visible: false,
                    searchable: false
                });
            };

           

            $this.contentId.empty().append(
                '<table id="' +  $this.uuid + '" class= "table table-sm table-striped table-filter nowrap" cellspacing="0" width="100%"><tfoot>' + doomTfoot +'</tfoot></table>'
            );


            $this.tableDtt = $('#' + $this.uuid)
            .DataTable( {
                data           : dataSet,
                columns        : columns,
                footerCallback : function ( row, data, start, end, display ) {
                    var intVal = function ( i ) {
                        return typeof i === 'string' ?
                            i.replace(/[\$.]/g, '') * 1 :
                            typeof i === 'number' ?
                                i : 0;     
                    };
                    var api = this.api(), c = 0;
                    api.columns({ page: 'current'}).every(function () {
                        //Si c no esta en alguno de los siguientes array se procede a calcular un total
                        if ($.inArray(c, $this.columInvisible) == -1) {
                            if ($.inArray(c, $this.ignoreTotal) == -1) {
                                var sum = this
                                .data()
                                .reduce( function (a, b) {
                                    return intVal(a) + intVal(b);
                                }, 0 );
                                $( api.column(c).footer()).html( $this.onNumberFormat(sum));
                            };
                        };
                        c++;
                    });
                },
                columnDefs: columnsDef,
                createdRow : function( row, data, dataIndex ) {
                    //Se ignoran los tipos númericos < 1
                    if ($this.prependColumn.length > 0) {
                        $.each($this.prependColumn, function( idx, obj ) {
                            //Si tiene indices se agrega a los mensionados
                            if (obj.indexs.length > 0) {
                                $.each(obj.indexs, function( i, x ) {
                                    if ($.inArray(x, $this.columInvisible) == -1){ 
                                        var Cellkey = Object.keys(data);
                                        Cellkey     = Cellkey[x];
                                        //Valor del key del json de la celda
                                        var CellVal = data[Cellkey];
                                        if ($this.onIsNumber(CellVal)) {
                                            console.log("onIsNumber " + CellVal);
                                            if ( $this.onConvertToNumber(CellVal) > 0){
                                                $(row).find('td:eq(' + x + ')').prepend( $.trim(obj.element) + " " );
                                            };
                                        }else{
                                            $(row).find('td:eq(' + x + ')').prepend( $.trim(obj.element) + " " );
                                        };
                                    };
                                });
                            }else{
                                //de lo contrario a todos excluyendo los invisibles y los ignorados
                                var c = 0;
                                $.each(data, function( i, x ) {
                                    if ($.inArray(c, $this.columInvisible) == -1){ 
                                        if ($this.onIsNumber(x)) {
                                            if ( $this.onConvertToNumber(x) > 0){
                                                if ($.inArray(i, $this.explotable.ignoreColFromKey) == -1) {
                                                    $(row).find('td:eq(' + (c-1) + ')').prepend( $.trim(obj.element) + " " );
                                                };
                                            };
                                        };
                                    };
                                    c++;
                                });
                            };
                        });
                    };
                },
                buttons: [
                    {
                        extend : 'excelHtml5',
                        text   : 'EXCEL',
                        title  : $this.titleExportDocs,
                        footer : false,
                        exportOptions: {    
                            columns: ':visible',    
                            format: {
                                body: function ( data, row, column, node ) {
                                    if (typeof data !== 'undefined') {
                                        if (data != null) { 
                                            //Limpieza de las celdas para los números
                                            data = data.toString().replaceAll("$","");
                                            data = data.toString().replaceAll(",","");
                                            data = data.toString().replaceAll(".","");
                                            data = data.replace(/<br\s*\/?>/ig, "\n");
                                            data = jQuery('<p>' + data + '</p>').text();
                                            return data;                               
                                        }
                                    }
                                    return data;
                                }
                            }
                        }
                    },
                    {
                        extend: 'pdfHtml5',
                        orientation: 'landscape',
                        pageSize: 'LEGAL',
                        footer: true,
                        title : $this.titleExportDocs,
                        exportOptions: {    
                            columns: ':visible'
                        },
                        customize: function(doc) {

                            doc.content.splice( 0, 0, {
                                margin: [ 0, 0, 0, 0 ],
                                alignment: 'right',
                                image  : $this.pdf.imgLogo, 
                                width  : $this.pdf.w,
                                height : $this.pdf.h,
                            } );

                            doc.content.splice( 1, 0, {
                                margin: [ 10, 0, 0, 2 ],
                                alignment: 'center',
                                text : $this.pdf.header,
                            } );

                            doc.content.splice( 2, 0, {
                                margin: [ 10, 0, 0, 10 ],
                                alignment: 'center',
                                text : $this.pdf.subheader
                            } );

                            doc.content[3].alignment = 'right';
                            doc.content[3].width = 'auto';
                           
                            doc.styles.tableHeader.color        = '#2d3436';
                            doc.styles.tableHeader.fillColor    = '#dfe6e9';
                            doc.styles.tableHeader.fontSize     = 8;
                            doc.styles.tableBodyEven.fontSize   = 8;
                            doc.styles.tableBodyOdd.fontSize    = 8;
                            doc.styles.tableFooter.fontSize     = 8;
                            doc.styles.tableFooter.alignment    = 'right';
                            doc.styles.tableFooter.fillColor    = '#718093';

                            $this.tableDtt.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
                                var obj = doc.content[3].table.body[rowIdx + 1];
                                $.each(obj, function( index, value ) {
                                    if ($this.onIsNumber(value.text)) {
                                        doc.content[3].table.body[rowIdx + 1][index].alignment = 'right';
                                    };
                                });
                            });

                            doc['footer'] = (function(page, pages) {
                                return {
                                    columns: [
                                        $this.pdf.footerTextLeft,
                                        {
                                            alignment: 'right',
                                            text: [$this.pdf.footerTextRight.page, { text: page.toString() },  $this.pdf.footerTextRight.of, { text: pages.toString() }]
                                        }
                                    ],
                                    margin: [10, 10]
                                }
                            });

                        }  
                    },
                    {
                        text: '<i class="fas fa-redo"></i>',
                        titleAttr: 'Reload',
                        action: function ( e, dt, node, config ) {
                            //Destrucción de la tabla
                            $this.tableDtt.clear().destroy();
                            //Reiniciación
                            $this.events.triggerHandler('reload');
                        }
                    }
                ]
            } ).on('click', 'a.cellexplotable', function (e, data) { 
                //data del datatable
                var mdata    = $this.tableDtt.row( $(this).closest('tr') ).data();
                //Número de indice de la celda clickeada
                var idx      = $this.tableDtt.cell($(e.target).closest('td')).index().column;
                //Key del json de la celda
                var Cellkey = Object.keys(mdata);
                Cellkey     = Cellkey[idx];
                //Valor del key del json de la celda
                var CellVal = mdata[Cellkey];
                //Se invoca la llamada el evento customisable
                $this.events.triggerHandler('cellexplotable', {Idx: idx, CellKey: Cellkey, CellVal: CellVal, Data: mdata});
            });

            if ($this.prependColumn.length > 0) {
                $.each($this.prependColumn, function( idx, obj ) {
                    $this.tableDtt.on('click', obj.type + '.' + obj.callbackId, function (e, data) { 
                        //data del datatable
                        var mdata    = $this.tableDtt.row( $(this).closest('tr') ).data();
                        //Número de indice de la celda clickeada
                        var idx      = $this.tableDtt.cell($(e.target).closest('td')).index().column;
                        //Key del json de la celda
                        var Cellkey = Object.keys(mdata);
                        Cellkey     = Cellkey[idx];
                        //Valor del key del json de la celda
                        var CellVal = mdata[Cellkey];
                        //Se invoca la llamada el evento customisable
                        $this.events.triggerHandler(obj.callbackId, 
                            {
                                Idx: idx, 
                                CellKey: Cellkey, 
                                CellVal: CellVal, 
                                Data: mdata, 
                                callbackId: obj.callbackId
                            }
                        );
                    }); 
                });
            };
        },
        onPrepareLogo : async (url) => {
            const data = await fetch(url);
            const blob = await data.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob); 
                reader.onloadend = () => {
                    const base64data = reader.result;   
                    resolve(base64data);
                }
            });
        }
    } 
}(jQuery));