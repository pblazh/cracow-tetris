require(['config'], function(){
    'use strict';
    require(['pixi', 'tetris/main'], function (PX, App) {
        /* Just an entrance point */
        PX.loader.add('assets/sprites.json')
            .load(() => new App(document.getElementById('app')));
    });
});
