define(
    ['easel', './constants', './store/gamestore', './store/history', './store/actions', './utils/keylistener'],
    function(createjs, constants, store, history,  actions, keylistener){
    'use strict';

    // the main game controller. It set the key listener and dispatch
    // corrsponding actions on the store.
    function Controller(){
        this.isRunning = false;
    }

    Controller.prototype.onKey= function(ev){
        switch( ev.value ){
        case constants.KEY_LEFT:
            store.dispatch(actions.moveLeft());
            break;
        case constants.KEY_RIGHT:
            store.dispatch(actions.moveRight());
            break;
        case constants.KEY_ROTATE:
            store.dispatch(actions.rotateLeft());
            break;
        case constants.KEY_DROP:
            store.dispatch(actions.dropDown());
            break;
        case constants.KEY_BACK:
            let prevState = history.pop();
            if(prevState && prevState.page === constants.PAGE_GAME){
                store.dispatch(actions.pushBack(prevState));
            }
            break;
        }
    };

    Controller.prototype.stop = function(){
        this.isRunning = false;
        clearInterval(this.interval);
        this.kListener.destroy();
    };

    Controller.prototype.update = function(){
        clearInterval(this.interval);
        store.dispatch(actions.moveDown());
        if(this.isRunning){
            this.interval = setTimeout( this.update.bind(this), store.getState().speed * 1000);
        }
    };

    Controller.prototype.start = function(){
        this.kListener = keylistener(store);
        this.kListener.on('key', this.onKey);
        this.isRunning = true;
        this.interval = setTimeout( this.update.bind(this), store.getState().speed * 1000);
    };

    return Controller;
});
