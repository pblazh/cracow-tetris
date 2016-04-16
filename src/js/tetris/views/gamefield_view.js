define(
    ['ramda', 'pixi', 'constants', 'tools', './gamepixel_view', './state_listener'],
    function(R, PX, constants, tools, GamepixelView, StateListener){
    'use strict';

    // the gamefield which gets the game info from the store and display them
    function GamefieldView(store) {
        PX.Container.call(this);

        this.onUpdate = function(state){
            R.forEach(pair => {
                this.pixels[pair[0]].highlight(pair[1]);
            })(tools.enumerate(R.flatten(state.game)));
        };

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

    GamefieldView = tools.extend(GamefieldView, PX.Container);

    return GamefieldView;
});
