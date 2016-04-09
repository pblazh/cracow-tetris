define(
    ['easel', './constants', './store/gamestore', './store/actions', './controller', './views/intro', './views/game', './views/final'],
    function(createjs, constants, store, actions, Controller, viewsIntro, viewsGame, viewsFinal){
    'use strict';

    let introView = viewsIntro();
    introView.on('complete', function(){
        store.dispatch(actions.switchPage(constants.PAGE_GAME));
    });

    let finalView = viewsFinal();
    finalView.on('complete', function(){
        store.dispatch(actions.switchPage(constants.PAGE_INTRO));
        store.dispatch(actions.restart());
    });

    let gameView = viewsGame();
    let gameController = new Controller();

    let pages = {
        [constants.PAGE_INTRO]: introView,
        [constants.PAGE_GAME]: gameView,
        [constants.PAGE_FINAL]: finalView,
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
            this.stage.enableMouseOver(10);
            store.dispatch(actions.switchPage(constants.PAGE_INTRO));

            function handleTick(event) {
                this.stage.update();
            }
            createjs.Ticker.addEventListener("tick", handleTick.bind(this));
        },
        update: function(){
            let page = store.getState().page;
            if(this.currentPage !== page && pages[page]){
                this.stage.removeChild(pages[this.currentPage]);
                this.currentPage = page;
                this.stage.addChild(pages[this.currentPage]);
                this.stage.update();
                if(page === constants.PAGE_GAME){
                    this.start();
                }
                if(page === constants.PAGE_SCORE){
                    this.stop();
                }
            }
        },
        start: function(fromScratch){
            gameController.start();
        },
        stop: function(){
            gameController.stop();
        },
    };

    let app = function(node){
        store.subscribe(this.update.bind(this));
        this.init(node);
    };
    app.prototype = App;

    return app;
});
