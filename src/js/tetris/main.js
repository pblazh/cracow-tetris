define(
    ['easel', './constants', './store/gamestore', './store/actions', './views/intro', './views/game'],
    function(createjs, constants, store, actions, viewsIntro, viewsGame){
    'use strict';

    let introView = viewsIntro();
    introView.on('complete', function(){
        store.dispatch(actions.switchPage(constants.PAGE_GAME));
    });

    let gameView = viewsGame();

    let pages = {
        [constants.PAGE_INTRO]: introView,
        [constants.PAGE_GAME]: gameView,
    };

    let App = {
        stage: null,
        currentPage: null,
        currentView: null,
        init: function(){
            let canvas = document.createElement('canvas');
            canvas.width = constants.GAME_WIDTH;
            canvas.height = constants.GAME_HEIGHT;
            this.node.appendChild(canvas);
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
            console.log( page );
            if(this.currentPage !== page && pages[page]){
                this.stage.removeChild(pages[this.currentPage]);
                this.currentPage = page;
                this.stage.addChild(pages[this.currentPage]);
                this.stage.update();
            }
        },
        start: function(fromScratch){},
        stop: function(){},
    };

    let app = function(node){
        this.node = node;
        store.subscribe(this.update.bind(this));
        this.init();
    };
    app.prototype = App;

    return app;
});
