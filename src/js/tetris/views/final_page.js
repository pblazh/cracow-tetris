define(
    ['ramda', 'pixi', 'signals', 'constants', './uis', './state_listener', 'tools'],
    function(R, PX, signals, constants, uis, StateListener, tools){
    'use strict';

    // the final page. greetings, score and the replay button
    function FinalPage(store) {
        PX.Container.call(this);
        this.complete = new signals.Signal();
        this.onUpdate = function(state){
            this.score.text = state.score;
        };

        const CSS = {
            font: '24px ' + constants.FONT,
            fill: constants.COLOR_FG,
            align: 'center',
            lineHeight: 26,
        };

        let greet = new PX.Text('My greetings.\nYour score is:', CSS);
        greet.x = constants.GAME_WIDTH / 2 - greet.width / 2;
        greet.y = constants.GAME_HEIGHT / 2 - 130;
        this.addChild(greet);

        let more = new PX.Text('Try again.', CSS);
        more.x = constants.GAME_WIDTH / 2 - more.width / 2;
        more.y = constants.GAME_HEIGHT - 140;
        this.addChild(more);

        this.score = new PX.Text('', R.merge(CSS, {
            font: '72px ' + constants.FONT,
            lineHeight: 72,
        }));
        this.score.x = constants.GAME_WIDTH / 2 - this.score.width / 2;
        this.score.y = constants.GAME_HEIGHT / 2 - 70;
        this.addChild(this.score);

        let buttonEnter = uis.buttonEnter();
        buttonEnter.x = constants.GAME_WIDTH/2 - 40;
        buttonEnter.y = constants.GAME_HEIGHT - 100;
        buttonEnter.interactive = true;
        buttonEnter.on('click', this.complete.dispatch);

        this.addChild(buttonEnter);

        let sl = new StateListener(store, ['score'], this.onUpdate.bind(this));

    }

    FinalPage = tools.extend(FinalPage, PX.Container);

    return FinalPage;

});
