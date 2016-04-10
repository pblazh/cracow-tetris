define(
    ['ramda', 'easel', '../constants', '../utils/tools', './gamepixel_view', './state_listener'],
    function(R, createjs, constants, U, GamepixelView, StateListener){
    'use strict';

    function GamefieldView(store) {
        this.Container_constructor();

        this.pixels = [];
        R.forEach(n => {
            let px = new GamepixelView();
            px.y = constants.GAME_HEIGHT
                   - constants.PIXEL_WIDTH
                   - constants.PIXEL_WIDTH * Math.floor(n / constants.FIELD_WIDTH);
            px.x = constants.PIXEL_WIDTH * (n % constants.FIELD_WIDTH);
            this.pixels.push(px);
            this.addChild(px);
        })(R.range(0, constants.FIELD_WIDTH * constants.FIELD_HEIGHT));

        let sl = new StateListener(store, ['game'], this.onUpdate.bind(this));
    };

    let p = createjs.extend(GamefieldView, createjs.Container);

    p.onUpdate = function(state){
        R.forEach(pair => {
            this.pixels[pair[0]].highlight(pair[1]);
        })(U.enumerate(R.flatten(state.game)));
    };

    GamefieldView = createjs.promote(GamefieldView, 'Container');
    return GamefieldView;
});
