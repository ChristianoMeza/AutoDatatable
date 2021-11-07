# AutoDatatable
Creación dinámica de tablas numéricas, esta es una extensión para Datatables.net

![image](https://user-images.githubusercontent.com/22845311/140598626-ad77167f-d61e-4732-a972-91664113e24a.png)

Instalación básica
```
var adtt = new $.AutoDatatable( $("#div-content"), {
    url : 'miurltojson',
    //Ajax Params
    data : {
    
    }
},'MY FIRST COLUMN');
```
Personalización

Quitar totales las columnas
```
adtt.ignoreTotal = [0,1];
```

Celdas con eventos en un link
```
adtt.explotable.ok  = true;

adtt.events.on('cellexplotable', function(obj) {
    console.log(obj);
});
```

Quitar link de evento por el nombre de la columna
```
dtt.explotable.ignoreColFromKey = ["TOTAL"];
```

Establecer un prefijo al valor por defecto
```
adtt.defaultNF.Prefix = '$';
```

Columnas invisibles
```
adtt.columInvisible   = [1];
```

Titulo de los documentos de exportación
```
adtt.pdf.header = 'Mi titulo';
adtt.pdf.subheader = 'Mi Sub titulo';
```

Agregar botones al lado izquierdo de la celda
Si el indexs (Indice de columna) es vacio se agregan a todas las celdas númericas > 0
callbackId debe ir como clase en el elemeto para poder utilizar los eventos
```
adtt.prependColumn = [ 
  {
      indexs : [0,1],
      type : "button",
      callbackId : 'drawchart',
      element : "<button class='btn btn-primary btn-sm drawchart'><i class='fas fa-chart-bar'></i></button>"
  },
  {
      indexs : [],
      type : "button",
      callbackId : 'detail',
      element: "<button class='btn btn-success btn-sm detail'><i class='fas fa-eye'></i></button>"
  }
];

adtt.events.on('detail', function(obj) {
    console.log(obj);
});
```



Agregar un logo JPG al documento PDF
```
adtt.onPrepareLogo('pathtoImgJpg').then(
    function(result) {
       adtt.pdf.imgLogo = result;
       adtt.pdf.w = 120;
       adtt.pdf.h = 35;
    }
);
```

Recupera el array de datos de Ajax
```
adtt.events.on('ajaxComplete', function(data) {
    console.log(data);
});

```

Recupera en un array la suma de las columnas
```
adtt.events.on('completeTotal', function(data) {
    console.log(data);
});

```

Ejemplo completo, PRODUCTO representa la columna Clave que es muy importante para el dibujo de la tabla

En tu archivo HTML
```
<div id="div-content"></div>
```
En tu JS
```
var adtt = new $.AutoDatatable( $("#div-content"), {
    url : 'controller.php',  
    data : {
        action : 'LISTA-PRODUCTOS'
    }
},'PRODUCTO');
```
JSON RESPONSE
```
[
    {
        "PRODUCTO":"ARROZ",
        "2021-01":0,
        "2021-02":0,
        "2021-03":0,
        "2021-04":0,
        "2021-05":200,
        "2021-06":3300
    },
    {
        "PRODUCTO":"ATUN",
        "2021-01":0,
        "2021-02":0,
        "2021-03":0,
        "2021-04":3500,
        "2021-05":2000,
        "2021-06":2000,
    }
]
```
SALIDA
```
|PRODUCTO|2021-01|2021-02|2021-03|2021-04|2021-05|2021-06
|ARROZ   |      0|      0|      0|      0|    200| $3.300    
|ATUN    |      0|      0|      0| $3.500| $2.000| $2.000   
--------------------------------------------------------- 
|        |      0|      0|      0| $3.500| $2.200| $5.300 
```

