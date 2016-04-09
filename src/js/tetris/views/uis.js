define(
    ['easel', '../constants'],
    function(createjs, constants){
    'use strict';


    function fill(g, color){
        g.beginFill(constants.COLOR_BG)
         .drawRect(0, 0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);

        switch(color){
        case 0:
            g.beginFill(constants.COLOR_FG)
                .drawRect(7, 7, constants.PIXEL_WIDTH - 14, constants.PIXEL_WIDTH - 14)
            break;
        case 1:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(3, 3, constants.PIXEL_WIDTH - 6, constants.PIXEL_WIDTH - 6)
            break;
        case 2:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(3, 3, constants.PIXEL_WIDTH - 6, constants.PIXEL_WIDTH - 6)
            g.beginFill(constants.COLOR_FG)
                .drawRect(6, 6, constants.PIXEL_WIDTH - 12, constants.PIXEL_WIDTH - 12)
            break;
        case 3:
        case 4:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(6, 6, constants.PIXEL_WIDTH - 12, constants.PIXEL_WIDTH - 12)
            break;
        case 5:
        default:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            break;
        }
    }

    function GamePixel() {
        this.Shape_constructor();
        this.enabled = false;
        this.reDraw();
    }

    let p = createjs.extend(GamePixel, createjs.Shape);
    p.highlight = function(color) {
        if(this.color !== color){
            this.color = color;
            this.reDraw();
        }
    }
    p.reDraw = function() {
        this.graphics
            .beginFill(constants.COLOR_BG)
            .drawRect(0, 0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);

        fill(this.graphics, this.color);
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
