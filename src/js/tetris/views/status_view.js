define(
    ['pixi', 'tools', 'constants', './state_listener'],
    function(PX, tools, constants, StateListener){
    'use strict';

    // displaying the status info above the game field

    var TEXT = 'SCORE: 0000  TIME: 00:00  SPEED: 00.1';

    function StatusView(store) {
        PX.Container.call(this);
        this.onUpdate = function(state){
            let sp = (1 / state.speed).toPrecision(3);
            let s = Math.floor(state.time / 1000);
            let m = Math.floor(s / 60);
            s = Math.floor(s - m * 60);
            this.text.text = TEXT
                .replace('0000', ('0000' + state.score).slice(-4))
                .replace('00:',  ('00' + m).slice(-2) + ':')
                .replace(':00',  ':' + ('00' + s).slice(-2))
                .replace('00.1',  '' + sp);
        };

        const CSS = {
            font: '18px ' + constants.FONT,
            fill: constants.COLOR_FG,
            align: 'center',
            lineHeight: 18,
        };
        this.text = new PX.Text(TEXT, CSS);
        this.addChild(this.text);

        let sl = new StateListener(store, ['score', 'time', 'speed'], this.onUpdate.bind(this));
    };

    StatusView = tools.extend(StatusView, PX.Container);
    return StatusView;

});
