define(
    ['easel', '../constants', './gamefield', './gamequeue', './gamescore'],
    function(createjs, constants, gamefield, gamequeue, gamescore){
    'use strict';

    return function(){
        var container = new createjs.Container();

        let gf = gamefield();
        let gq = gamequeue();
        gq.y = 45;
        gq.x = constants.GAME_WIDTH - gq.width - 10;

        let gs = gamescore();
        gs.y = 8;
        gs.x = 8;

        container.addChild(gf);
        container.addChild(gq);
        container.addChild(gs);

        return container;
    };
});
