define(
    ['easel', './constants', './store/gamestore', './store/actions', './controller',
     './views/intro_page', './views/game_page', './views/final_page'],
    function(createjs, constants, store, actions, Controller, IntroPage, GamePage, FinalPage){
    'use strict';

    let introPage = new IntroPage();
    introPage.on('complete', function(){
        store.dispatch(actions.switchPage(constants.PAGE_GAME));
    });

    let finalPage = new FinalPage();
    finalPage.on('complete', function(){
        store.dispatch(actions.restart());
        store.dispatch(actions.switchPage(constants.PAGE_GAME));
    });

    let gamePage = new GamePage();
    let gameController = new Controller();

    let pages = {
        [constants.PAGE_INTRO]: introPage,
        [constants.PAGE_GAME]: gamePage,
        [constants.PAGE_FINAL]: finalPage,
    };

    let App = {
        stage: null,
        currentPage: null,
        init: function(node){
            let canvas = document.createElement('canvas');
            canvas.width = constants.GAME_WIDTH;
            canvas.height = constants.GAME_HEIGHT;
            node.appendChild(canvas);
            this.stage = new createjs.Stage(canvas);
            store.dispatch(actions.switchPage(constants.PAGE_INTRO));
        },
        update: function(){
            //switch screens of the game
            let page = store.getState().page;
            console.log( 'page:', page);
            if(this.currentPage !== page && pages[page]){
                this.stage.removeChild(pages[this.currentPage]);
                this.currentPage = page;
                this.stage.addChild(pages[this.currentPage]);

                if(page === constants.PAGE_GAME){
                    gameController.start();
                }
                if(page === constants.PAGE_FINAL){
                    gameController.stop();
                }

                // there is no need to track mouse when in game
                this.stage.enableMouseOver((page === constants.PAGE_GAME) ? 0 : 10);
            }
            this.stage.update();
        },
    };

    let app = function(node){
        store.subscribe(this.update.bind(this));
        this.init(node);
    };
    app.prototype = App;

    return app;
});
