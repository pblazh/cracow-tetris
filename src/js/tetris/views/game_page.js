define(
    ['pixi', 'tools', 'constants', './gamefield_view', './queue_view', './status_view', './lives_view'],
    function(PX, tools, constants, GamefieldView, QueueView, StatusView, LivesView){
    'use strict';

    // the page of the game. Just the container to distribute subcomponents
    function GamePage(store, history) {
        PX.Container.call(this);

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

    GamePage = tools.extend(GamePage, PX.Container);

    return GamePage;

});
