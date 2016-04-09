define(
    ['easel'],
    function(createjs){
    'use strict';

    const ENTER_BUTTON_SHEET = new createjs.SpriteSheet({
        images: ['./assets/sprites.png'],
        frames: [
            [10, 10, 90, 35],
            [100, 10, 90, 35],
            [190, 10, 90, 35],
        ],
        animations: {
            out: 0,
            over: 1,
            down: 2,
        }
    });

    return {
        buttonEnter: function(){
            let buttonEnter = new createjs.Sprite(ENTER_BUTTON_SHEET, 'out');
            let helper = new createjs.ButtonHelper(buttonEnter, 'out', 'over', 'down', false);
            return buttonEnter;
        },
    };
});
