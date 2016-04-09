define(['easel', '../constants', './uis'], function(createjs, constants, uis){
    'use strict';

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
    }

    let p = createjs.extend(IntroPage, createjs.Container);
    IntroPage = createjs.promote(IntroPage, 'Container');
    return IntroPage;
});
