define(['pixi', 'signals', 'constants', 'tools', './uis'], function(PX, signals, constants, tools, uis){
    'use strict';

    // starting page of the game

    const INFO = ['# <LEFT>  - left',
                  '# <RIGHT> - right',
                  '# <DOWN>  - rotate',
                  '# <SPACE> - drop',
                  '# <UP>    - rollback',
                  '# <M>     - magic'
                 ].join('\n');

    function IntroPage() {
        PX.Container.call(this);

        this.complete = new signals.Signal();

        let logo = uis.logo();
        logo.x = constants.GAME_WIDTH / 2 - 65;
        logo.y = constants.GAME_HEIGHT / 2 - 90;

        this.addChild(logo);

        let buttonEnter = uis.buttonEnter();
        buttonEnter.x = constants.GAME_WIDTH/2 - 40;
        buttonEnter.y = constants.GAME_HEIGHT / 2 + 10;
        buttonEnter.on('click', this.complete.dispatch);

        this.addChild(buttonEnter);

        let info = new PX.Text(INFO, {
            font: '18px ' + constants.FONT,
            fill: constants.COLOR_FG,
            align: 'left',
            lineHeight: 18,
        });
        info.x = constants.GAME_WIDTH / 2 - 90;
        info.y = constants.GAME_HEIGHT - 140;
        this.addChild(info);

    }

    IntroPage = tools.extend(IntroPage, PX.Container);

    return IntroPage;
});
