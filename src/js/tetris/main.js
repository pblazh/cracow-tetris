define(
    ['easel', 'constants', './store/gamestore', './store/history', './store/actions', './controller',
     './views/intro_page', './views/game_page', './views/final_page'],
    function(createjs, constants, store, history, actions, Controller, IntroPage, GamePage, FinalPage){
    'use strict';

    // first page of the game
    let introPage = new IntroPage();
    introPage.on('complete', function(){
        store.dispatch(actions.switchPage(constants.PAGE_GAME));
    });

    // the page with the greetings and the score
    let finalPage = new FinalPage(store);
    finalPage.on('complete', function(){
        store.dispatch(actions.gameRestart());
        store.dispatch(actions.switchPage(constants.PAGE_GAME));
    });

    // the main game screen
    let gamePage = new GamePage(store, history);
    let gameController = new Controller();

    let pages = {
        [constants.PAGE_INTRO]: introPage,
        [constants.PAGE_GAME]: gamePage,
        [constants.PAGE_FINAL]: finalPage,
    };

    // the main application object
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

            createjs.Ticker.addEventListener('tick', ()=> this.stage.update());

        },
        update: function(){
            //switch screens of the game
            let page = store.getState().page;
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
                //this.stage.enableMouseOver((page === constants.PAGE_GAME) ? 0 : 10);

                if(page === constants.PAGE_GAME){
                    createjs.Ticker.removeEventListener('tick');
                    this.stage.enableMouseOver(0);
                }else{
                    createjs.Ticker.addEventListener('tick', ()=> this.stage.update());
                    this.stage.enableMouseOver(10);
                }
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
