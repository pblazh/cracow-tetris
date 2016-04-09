/*global require*/

define(['easel', './store/tetris'], function(createjs){
    'use strict';

    var App = {
        init: function(){
            var canvas, stage;
            canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 600;
            this.node.appendChild(canvas);
            stage = new createjs.Stage(canvas);

            var circle = new createjs.Shape();
            circle.graphics.beginFill("#ff0000").drawCircle(0, 0, 50);
            circle.x = 100;
            circle.y = 100;
            stage.addChild(circle);
            stage.update();
        },
        start: function(fromScratch){},
        stop: function(){},
    };

    var app = function(node){
        this.node = node;
        this.init();
    };
    app.prototype = App;

    return app;
});
