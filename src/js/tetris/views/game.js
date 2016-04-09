define(
    ['easel', '../constants', './uis'],
    function(createjs, constants, uis){
    'use strict';

    return function(){
        var container = new createjs.Container();

        let bg = new createjs.Shape();
        bg.graphics
            .beginFill(constants.COLO_BG)
            .drawRect(0, 0, constants.GAME_WIDTH, constants.GAME_HEIGHT);
        container.addChild(bg);

        return container;
    };
});
