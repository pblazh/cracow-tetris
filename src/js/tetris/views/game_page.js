define(
    ['easel', '../constants', './gamefield_view', './queue_view', './status_view', './lives_view'],
    function(createjs, constants, GamefieldView, QueueView, StatusView, LivesView){
    'use strict';

    function GamePage(store, history) {
        this.Container_constructor();

        let gf = new GamefieldView(store);
        gf.y = -10;

        let gq = new QueueView(store);
        gq.y = 40;
        gq.x = constants.GAME_WIDTH - gq.width - 10;

        let gl = new LivesView(store, history);
        gl.y = 190;
        gl.x = constants.GAME_WIDTH - 72;


        let gs = new StatusView(store);
        gs.y = 8;
        gs.x = 8;

        this.addChild(gf);
        this.addChild(gq);
        this.addChild(gl);
        this.addChild(gs);
    };

    let p = createjs.extend(GamePage, createjs.Container);
    GamePage = createjs.promote(GamePage, 'Container');
    return GamePage;

});
