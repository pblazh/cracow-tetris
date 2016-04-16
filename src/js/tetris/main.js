define(
    ['pixi', 'constants', './store/gamestore', './store/history', './store/actions', './controller',
    './views/intro_page', './views/game_page', './views/final_page'],
    function(PX, constants, store, history, actions, Controller, IntroPage, GamePage, FinalPage){
    'use strict';



    let pages;

    // the main application object
    let App = {
        stage: null,
        currentPage: null,
        init: function(node){
            this.stage = new PX.Container();
            this.renderer = new PX.autoDetectRenderer(constants.GAME_WIDTH,constants.GAME_HEIGHT );
            node.appendChild(this.renderer.view);

            this.ticker = PX.ticker.shared;
            this.ticker.autoStart = !false;
            this.ticker.add((time) => this.renderer.render(this.stage));

            store.dispatch(actions.switchPage(constants.PAGE_INTRO));
        },
        update: function(){
            //switch screens of the game
            let page = store.getState().page;
            if(this.currentPage !== page && pages[page]){
                this.stage.removeChild(pages[this.currentPage]);
                this.currentPage = page;
                this.stage.addChild(pages[this.currentPage]);

                if(page === constants.PAGE_GAME){
                    this.gameController.start();
                }
                if(page === constants.PAGE_FINAL){
                    this.gameController.stop();
                }

            }
            this.renderer.render(this.stage);
        },
    };

    let app = function(node){
        // first page of the game
        let introPage = new IntroPage();
        introPage.complete.add( function(){
            store.dispatch(actions.switchPage(constants.PAGE_GAME));
        });

        // the page with the greetings and the score
        let finalPage = new FinalPage(store);
        finalPage.complete.add( function(){
            store.dispatch(actions.gameRestart());
            store.dispatch(actions.switchPage(constants.PAGE_GAME));
        });

        // the main game screen
        let gamePage = new GamePage(store, history);
        this.gameController = new Controller();

        pages = {
            [constants.PAGE_INTRO]: introPage,
            [constants.PAGE_GAME]: gamePage,
            [constants.PAGE_FINAL]: finalPage,
        };

        store.subscribe(this.update.bind(this));
        this.init(node);
    };
    app.prototype = App;

    return app;
});
