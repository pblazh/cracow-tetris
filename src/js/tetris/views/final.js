define(
    ['easel', '../constants', './uis'],
    function(createjs, constants, uis){
    'use strict';

    return function(){
        var container = new createjs.Container();

        let bg = new createjs.Shape();
        bg.graphics
            .beginFill(constants.COLOR_BG)
            .drawRect(0, 0, constants.GAME_WIDTH, constants.GAME_HEIGHT)
        container.addChild(bg);

        var text = new createjs.Text('365', '40px Arial', constants.COLO_FG);
        container.addChild(text);

        let buttonEnter = uis.buttonEnter();
        buttonEnter.x = constants.GAME_WIDTH/2 - 45;
        buttonEnter.y = constants.GAME_HEIGHT - 100;
        buttonEnter.addEventListener('click', function(){
            container.dispatchEvent('complete');
        });

        container.addChild(buttonEnter);
        return container;
    };
});
