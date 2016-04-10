define(
    ['easel', '../constants', './uis', '../store/gamestore', './state_listener'],
    function(createjs, constants, uis, store, StateListener){
    'use strict';

    function FinalPage() {
        this.Container_constructor();

        let greet = new createjs.Text('My greetings.\nYour score is:', '24px ' + constants.FONT, constants.COLOR_FG);
        greet.textAlign = 'center';
        greet.lineHeight = 26;
        greet.x = constants.GAME_WIDTH / 2;
        greet.y = constants.GAME_HEIGHT / 2 - 130;
        this.addChild(greet);

        let more = new createjs.Text('Try again.', '24px ' + constants.FONT, constants.COLOR_FG);
        more.textAlign = 'center';
        more.x = constants.GAME_WIDTH / 2;
        more.y = constants.GAME_HEIGHT - 140;
        this.addChild(more);

        this.score = new createjs.Text('', '72px ' + constants.FONT, constants.COLOR_FG);
        this.score.textAlign = 'center';
        this.score.x = constants.GAME_WIDTH / 2;
        this.score.y = constants.GAME_HEIGHT / 2 - 70;
        this.addChild(this.score);

        let buttonEnter = uis.buttonEnter();
        buttonEnter.x = constants.GAME_WIDTH/2 - 40;
        buttonEnter.y = constants.GAME_HEIGHT - 100;
        buttonEnter.addEventListener('click', () => this.dispatchEvent('complete'));

        this.addChild(buttonEnter);

        let sl = new StateListener(store, ['score'], this.onUpdate.bind(this));
    }

    let p = createjs.extend(FinalPage, createjs.Container);
    p.onUpdate = function(state){
        this.score.text = state.score;
    };


    FinalPage = createjs.promote(FinalPage, 'Container');
    return FinalPage;

});
