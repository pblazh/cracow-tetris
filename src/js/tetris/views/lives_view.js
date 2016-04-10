define(
    ['ramda', 'easel', '../constants', '../store/gamestore', '../store/history', './state_listener'],
    function(R, createjs, constants, store, history, StateListener){
    'use strict';

    var TEXT = '*';

    function LivesView() {
        this.Container_constructor();

        var title = new createjs.Text('LIVES', '22px ' + constants.FONT, constants.COLOR_FG);
        title.x = constants.PIXEL_WIDTH * 0.70;
        title.textAlign = 'center';

        this.text = new createjs.Text(TEXT, '50px ' + constants.FONT, constants.COLOR_FG);
        this.text.y = 30;

        this.addChild(title);
        this.addChild(this.text);

        let sl = new StateListener(store, ['game',], this.onUpdate.bind(this));
    };

    let p = createjs.extend(LivesView, createjs.Container);
    p.onUpdate = function(state){
        this.text.text = R.join('\n')(R.repeat(TEXT, history.length()));
    };

    LivesView = createjs.promote(LivesView, 'Container');
    return LivesView;

});
