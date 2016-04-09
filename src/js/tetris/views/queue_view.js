define(
    ['ramda', 'easel', '../constants', '../utils/tools', './uis', '../store/gamestore', './state_listener'],
    function(R, createjs, constants, U, uis, store, StateListener){
    'use strict';

    const PIECE_WIDTH = 3;

    function QueueView() {
        this.Container_constructor();

        this.width = this.height = constants.PIXEL_WIDTH * 4;
        this.lastUpdated = null;

        let bg = new createjs.Shape();
        bg.graphics
            .beginFill(constants.COLOR_FG)
            .drawRect(0, 0, this.width, this.width)
            .beginFill(constants.COLOR_BG)
            .drawRect(2, 2, this.width - 4, this.width - 4);
        bg.y = constants.PIXEL_WIDTH * 1.5;
        this.addChild(bg);

        var text = new createjs.Text('NEXT', '22px ' + constants.FONT, constants.COLOR_FG);
        text.x = constants.PIXEL_WIDTH * 0.8;

        this.addChild(text);

        this.pixels = [];
        R.forEach(n => {
            let px = uis.gamePixel();
            px.y = 4 *  constants.PIXEL_WIDTH
                   - constants.PIXEL_WIDTH * Math.floor(n / 3);
            px.x = constants.PIXEL_WIDTH / 2 + constants.PIXEL_WIDTH * (n % 3);
            px.highlight(0);
            this.pixels.push(px);
            this.addChild(px);
        })(R.range(0, 9));

        let sl = new StateListener(store, ['queue'], this.onUpdate.bind(this));
    };

    let p = createjs.extend(QueueView, createjs.Container);
    p.onUpdate = function(state){
        let q = state.queue;
        if(this.lastUpdated !== q){
            this.lastUpdated = q;
            // draw a gamefield
            R.forEach(p => {
                this.pixels[p].highlight(0);
            })(R.range(0, PIECE_WIDTH * PIECE_WIDTH));

            // draw a piece over the game field
            if(q.data){
                R.forEach(
                    pair =>
                    this.pixels[(Math.floor(pair[0] / q.data[0].length))
                            * PIECE_WIDTH
                            + (pair[0] % q.data[0].length)
                        ].highlight(pair[1])
                )( U.enumerate(R.flatten(q.data)) );
            }
        }
    };

    QueueView = createjs.promote(QueueView, 'Container');
    return QueueView;

});
