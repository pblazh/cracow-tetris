define(
    ['easel', '../constants', '../store/gamestore', './state_listener'],
    function(createjs, constants, store, StateListener){
    'use strict';

    var TEXT = 'SCORE: 0000   TIME: 00:00';

    function StatusView() {
        this.Container_constructor();
        this.text = new createjs.Text(TEXT, '22px ' + constants.FONT, constants.COLOR_FG);
        this.addChild(this.text);

        let sl = new StateListener(store, ['score', 'time'], this.onUpdate.bind(this));
    };

    let p = createjs.extend(StatusView, createjs.Container);
    p.onUpdate = function(state){
        let s = Math.floor(state.time / 1000);
        let m = Math.floor(s / 60);
        s = Math.floor(s - m * 60);
        this.text.text = TEXT
            .replace('0000', ('0000' + state.score).slice(-4))
            .replace('00:',  ('00' + m).slice(-2) + ':')
            .replace(':00',  ':' + ('00' + s).slice(-2));
    };


    StatusView = createjs.promote(StatusView, 'Container');
    return StatusView;

});