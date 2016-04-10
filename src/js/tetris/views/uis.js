define(['easel'], function(createjs){
    'use strict';

    const ENTER_BUTTON_SHEET = new createjs.SpriteSheet({
        images: ['./assets/sprites.png'],
        frames: [
            [10, 10, 80, 35],
            [95, 10, 80, 35],
            [175, 10, 80, 35],
        ],
        animations: {
            out: 0,
            over: 1,
            down: 2,
        }
    });

    const LOGO_SHEET = new createjs.SpriteSheet({
        images: ['./assets/sprites.png'],
        frames: [
            [10, 50, 140, 80],
        ],
    });
    let logo = new createjs.Sprite(LOGO_SHEET);


    return {
        buttonEnter: function(){
            let buttonEnter = new createjs.Sprite(ENTER_BUTTON_SHEET, 'out');
            let helper = new createjs.ButtonHelper(buttonEnter, 'out', 'over', 'down', false);
            return buttonEnter;
        },
        logo,
    };
});
