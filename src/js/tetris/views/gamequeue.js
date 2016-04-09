define(
    ['ramda', 'easel', '../constants', '../utils', './uis', '../store/gamestore'],
    function(R, createjs, constants, U, uis, store){
    'use strict';

    const PIECE_WIDTH = 3;

    function update(pixels){
        let state = store.getState();
        if(state.page === constants.PAGE_GAME){
            let gq = state.queue;

            // draw a gamefield
            R.forEach(p => {
                pixels[p].highlight(0);
            })(R.range(0, PIECE_WIDTH * PIECE_WIDTH));

            // draw a piece over the game field
            if(gq.data){
                R.forEach(
                    pair =>
                    pixels[(Math.floor(pair[0] / gq.data[0].length))
                            * PIECE_WIDTH
                            + (pair[0] % gq.data[0].length)
                        ].highlight(pair[1])
                )( U.enumerate(R.flatten(gq.data)) );
            }
        }
    }

    return function(){
        var container = new createjs.Container();
        container.width = container.height = constants.PIXEL_WIDTH * 4;

        let bg = new createjs.Shape();
        bg.graphics
            .beginFill(constants.COLOR_FG)
            .drawRect(0, 0, container.width, container.width)
            .beginFill(constants.COLOR_BG)
            .drawRect(2, 2, container.width - 4, container.width - 4);
        container.addChild(bg);


        let pixels = [];
        R.forEach(n => {
            let px = uis.gamePixel();
            px.y = 3 *  constants.PIXEL_WIDTH
                   - constants.PIXEL_WIDTH / 2
                   - constants.PIXEL_WIDTH * Math.floor(n / 3);
            px.x = constants.PIXEL_WIDTH / 2 + constants.PIXEL_WIDTH * (n % 3);
            px.highlight(0);
            pixels.push(px);
            container.addChild(px);
        })(R.range(0, 9));

        store.subscribe(()=>update(pixels));

        return container;
    };
});
