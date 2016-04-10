define(
    ['easel', '../constants', './gamefield_view', './queue_view', './status_view'],
    function(createjs, constants, GamefieldView, QueueView, StatusView){
    'use strict';

    function GamePage() {
        this.Container_constructor();

        let gf = new GamefieldView();
        gf.y = -10;

        let gq = new QueueView();
        gq.y = 40;
        gq.x = constants.GAME_WIDTH - gq.width - 10;

        let gs = new StatusView();
        gs.y = 8;
        gs.x = 8;

        this.addChild(gf);
        this.addChild(gq);
        this.addChild(gs);
    };

    let p = createjs.extend(GamePage, createjs.Container);
    GamePage = createjs.promote(GamePage, 'Container');
    return GamePage;

});
