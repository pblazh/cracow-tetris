define(['easel', 'constants', './uis'], function(createjs, constants, uis){
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
        this.Container_constructor();

        let logo = uis.logo;
        logo.x = constants.GAME_WIDTH / 2 - 65;
        logo.y = constants.GAME_HEIGHT / 2 - 90;

        this.addChild(logo);

        let buttonEnter = uis.buttonEnter();
        buttonEnter.x = constants.GAME_WIDTH/2 - 40;
        buttonEnter.y = constants.GAME_HEIGHT / 2 + 10;
        buttonEnter.addEventListener('click', () => this.dispatchEvent('complete'));

        this.addChild(buttonEnter);

        let info = new createjs.Text(INFO, '18px ' + constants.FONT, constants.COLOR_FG);
        info.textAlign = 'left';
        info.lineHeight = 18;
        info.x = constants.GAME_WIDTH / 2 - 90;
        info.y = constants.GAME_HEIGHT - 140;
        this.addChild(info);
    }

    let p = createjs.extend(IntroPage, createjs.Container);
    IntroPage = createjs.promote(IntroPage, 'Container');
    return IntroPage;
});
