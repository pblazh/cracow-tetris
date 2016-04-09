define(
    ['easel', '../constants'],
    function(createjs, constants){
    'use strict';



    function GamePixel() {
        this.Shape_constructor();
        this.enabled = false;
        this.reDraw();
    }
    let p = createjs.extend(GamePixel, createjs.Shape);
    p.highlight = function(enabled) {
        if(this.enabled !== enabled){
            this.enabled = enabled;
            this.reDraw();
        }
    }
    p.reDraw = function() {
        this.graphics
            .beginFill(constants.COLOR_BG)
            .drawRect(0, 0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);

        if(this.enabled){
            this.graphics
                .beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
        }else{
            this.graphics
                .beginFill(constants.COLOR_FG)
                .drawRect(6, 6, constants.PIXEL_WIDTH - 12, constants.PIXEL_WIDTH - 12)
        }
    }

    GamePixel = createjs.promote(GamePixel, 'Shape');





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
        gamePixel: () => new GamePixel(),
    };
});
