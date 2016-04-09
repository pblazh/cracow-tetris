define(
    ['easel', '../constants', './uis'],
    function(createjs, constants, uis){
    'use strict';

    return function(){
        var container = new createjs.Container();

        let bg = new createjs.Shape();
        bg.graphics
            .beginFill(constants.COLO_BG)
            .drawRect(0, 0, constants.GAME_WIDTH, constants.GAME_HEIGHT)
            .beginFill(constants.COLO_FG)
            .drawCircle(constants.GAME_WIDTH/2, constants.GAME_HEIGHT/2, 50);
        container.addChild(bg);

        var text = new createjs.Text('Hello World', '20px Arial', constants.COLO_FG);
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
