define(
    ['ramda', 'easel', '../constants', './uis', '../store/gamestore'],
    function(R, createjs, constants, uis, store){
    'use strict';

    let enumerate = list => R.zip(R.range(0, list.length), list);


    function update(pixels){
        let state = store.getState();
        if(state.page === constants.PAGE_GAME){
            let gf = state.gamefield;
            let pc = state.piece;
            R.forEach(pair => {
                pixels[pair[0]].highlight(pair[1]);
            })(enumerate(R.flatten(gf)));

            // draw a piece over the game field
            if(pc.data){
                R.forEach(
                    pair =>
                    pixels[(pc.y + Math.floor(pair[0] / pc.data[0].length))
                            * constants.FIELD_WIDTH
                            + (pc.x + pair[0] % pc.data[0].length)
                        ].highlight(pair[1])
                )( enumerate(R.flatten(pc.data)) );
            }
        }
    }

    return function(){
        var container = new createjs.Container();

        let bg = new createjs.Shape();
        bg.graphics
            .beginFill(constants.COLOR_BG)
            .drawRect(0, 0, constants.GAME_WIDTH, constants.GAME_HEIGHT);
        container.addChild(bg);

        let pixels = [];
        R.forEach(n => {
            let px = uis.gamePixel();
            px.y = constants.GAME_HEIGHT - constants.PIXEL_WIDTH  - constants.PIXEL_WIDTH * Math.floor(n / constants.FIELD_WIDTH);
            px.x = constants.PIXEL_WIDTH * (n % constants.FIELD_WIDTH);
            pixels.push(px);
            container.addChild(px);
        })(R.range(0, constants.FIELD_WIDTH * constants.FIELD_HEIGHT));

        store.subscribe(()=>update(pixels));

        return container;
    };
});
