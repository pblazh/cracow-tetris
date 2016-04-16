define(
    ['ramda', 'pixi', 'tools', 'constants', '../store/history', './state_listener'],
    function(R, PX, tools, constants, history, StateListener){
    'use strict';

    // show content of the history buffer

    var TEXT = '*';

    function LivesView(store, history) {
        PX.Container.call(this);
        this.onUpdate = function(state){
            this.text.text = R.join('\n')(R.repeat(TEXT, history.length()));
        };

        const CSS = {
            font: '24px ' + constants.FONT,
            fill: constants.COLOR_FG,
            align: 'center',
            lineHeight: 26,
        };

        var title = new PX.Text('LIVES', CSS);
        title.x = -constants.PIXEL_WIDTH * 0.70;

        this.text = new PX.Text(TEXT, R.merge(CSS, {font: '42px ' + constants.FONT}));
        this.text.y = 30;

        this.addChild(title);
        this.addChild(this.text);

        let sl = new StateListener(store, ['game',], this.onUpdate.bind(this));
    };

    LivesView = tools.extend(LivesView, PX.Container);
    return LivesView;

});
