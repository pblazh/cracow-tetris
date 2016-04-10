define(['easel', './magic', '../constants'], function(createjs, magic, constants){
    'use strict';


    function fill(g, color){
        g.beginFill(constants.COLOR_BG)
         .drawRect(0, 0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);

        switch(color){
        case 0:
            g.beginFill(constants.COLOR_FG)
                .drawRect(10, 10, constants.PIXEL_WIDTH - 20, constants.PIXEL_WIDTH - 20);
            break;
        case 1:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(8, 8, constants.PIXEL_WIDTH - 16, constants.PIXEL_WIDTH - 16);
            break;
        case 2:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(3, 3, constants.PIXEL_WIDTH - 6, constants.PIXEL_WIDTH - 6)
            g.beginFill(constants.COLOR_FG)
                .drawRect(6, 6, constants.PIXEL_WIDTH - 12, constants.PIXEL_WIDTH - 12);
            break;
        case 3:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(10, 10, constants.PIXEL_WIDTH - 20, constants.PIXEL_WIDTH - 20);
            break;
        case 4:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(3, 3, constants.PIXEL_WIDTH - 6, constants.PIXEL_WIDTH - 6)
            g.beginFill(constants.COLOR_FG)
                .drawRect(4, 4, constants.PIXEL_WIDTH - 8, constants.PIXEL_WIDTH - 8)
            g.beginFill(constants.COLOR_BG)
                .drawRect(5, 5, constants.PIXEL_WIDTH - 10, constants.PIXEL_WIDTH - 10)
            g.beginFill(constants.COLOR_FG)
                .drawRect(6, 6, constants.PIXEL_WIDTH - 12, constants.PIXEL_WIDTH - 12)
            break;
        case 5:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(3, 3, constants.PIXEL_WIDTH - 6, constants.PIXEL_WIDTH - 6)
            g.beginFill(constants.COLOR_FG)
                .drawRect(6, 6, constants.PIXEL_WIDTH - 12, constants.PIXEL_WIDTH - 12)
            g.beginFill(constants.COLOR_BG)
                .drawRect(8, 8, constants.PIXEL_WIDTH - 16, constants.PIXEL_WIDTH - 16);
            break;
        default:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            break;
        }
    }

    function GamePixel() {
        this.Container_constructor();
        this.enabled = false;
        this.magic = magic();

        this.bg = new createjs.Shape();
        this.addChild(this.bg);
        this.addChild(this.magic);
        this.reDraw();
    }

    let p = createjs.extend(GamePixel, createjs.Container);
    p.highlight = function(color) {
        if(this.color !== color){
            this.color = color;
            this.reDraw();
        }
    }
    p.reDraw = function() {
        this.bg.graphics
            .beginFill(constants.COLOR_BG)
            .drawRect(0, 0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);

        fill(this.bg.graphics, this.color);
        this.magic.gotoAndPlay(this.color ? 'out' : 'in');
        this.bg.cache(0,0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);
    }

    GamePixel = createjs.promote(GamePixel, 'Container');
    return GamePixel;

});
