require(['config'], function(){
    'use strict';
    require(['tetris/main'], function (App) {
        /* Just an entrance point */
        var app = new App(document.getElementById('app'));
    });
});
