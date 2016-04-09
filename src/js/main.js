/*global require*/
'use strict';

require(['config'], function(){
    require(['tetris/main'], function (App) {
        /*
        * Just an entrance point
        */
        var app = new App(document.getElementById('app'));
    });
});
