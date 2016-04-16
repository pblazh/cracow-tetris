define(
    ['ramda', 'pixi', 'constants', 'tools', './gamepixel_view', './state_listener'],
    function(R, PX, constants, tools, GamepixelView, StateListener){
    'use strict';

    const PIECE_WIDTH = 3;

    // The view displaying the 'next piece' in the game
    function QueueView(store) {
        PX.Container.call(this);

        this.onUpdate = function(state){
            let q = state.queue;
            if(this.lastUpdated !== q){
                this.lastUpdated = q;
                // paint all pixels in black
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
                    )( tools.enumerate(R.flatten(q.data)) );
                }
            }
        };

        let width =  constants.PIXEL_WIDTH * 4;
        this.lastUpdated = null;
        let bg = new PX.Graphics();
        bg.beginFill(constants.COLOR_FG)
          .drawRect(0, 0, width, width)
          .beginFill(constants.COLOR_BG)
          .drawRect(2, 2, width - 4, width - 4)
          .endFill();
        bg.y = constants.PIXEL_WIDTH * 1.5;
        this.addChild(bg);

        const CSS = {
            font: '22px ' + constants.FONT,
            fill: constants.COLOR_FG,
            align: 'center',
            lineHeight: 18,
        };
        var text = new PX.Text('NEXT', CSS);
        text.x = constants.PIXEL_WIDTH * 0.95;

        this.addChild(text);

        // generate pixels and distribute them in a grid
        this.pixels = [];
        R.forEach(n => {
            let px = new GamepixelView();
            px.y = 4 *  constants.PIXEL_WIDTH
                   - constants.PIXEL_WIDTH * Math.floor(n / 3);
            px.x = constants.PIXEL_WIDTH / 2 + constants.PIXEL_WIDTH * (n % 3);
            px.highlight(0);
            this.pixels.push(px);
            this.addChild(px);
        })(R.range(0, 9));

        let sl = new StateListener(store, ['queue'], this.onUpdate.bind(this));
    };

    QueueView = tools.extend(QueueView, PX.Container);

    return QueueView;

});
