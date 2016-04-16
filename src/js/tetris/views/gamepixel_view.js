define(['pixi', './magic', 'tools', 'constants'], function(PX, magic, tools, constants){
    'use strict';


    // The visual representation of a pixel in the game

    // fill the pixel with different colors (black and white patterns)
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

    const highlight = function(color) {
        if(this.color !== color){
            this.color = color;
            this.reDraw();
        }
    }

    const reDraw = function() {
        this.bg.beginFill(constants.COLOR_BG)
            .drawRect(0, 0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);

        fill(this.bg, this.color);
        this.bg.endFill();
        this.magic.gotoAndPlay(0);
    }
    function GamePixel() {
        PX.Container.call(this);

        this.highlight = highlight;
        this.reDraw = reDraw.bind(this);

        this.enabled = false;
        // the sprite whith pixalate effect
        this.magic = magic();

        this.bg = new PX.Graphics();
        this.addChild(this.bg);
        this.addChild(this.magic);
        this.reDraw();
    }


    GamePixel = tools.extend(GamePixel, PX.Container);
    return GamePixel;

});
