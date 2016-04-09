define(
    ['easel', './constants', './store/gamestore', './store/actions', './keylistener'],
    function(createjs, constants, store, actions, keylistener){
    'use strict';

    function Controller(){
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
            //store.dispatch(actions.dropDown());
            break;
        }
    }
    Controller.prototype.stop = function(){
        this.kListener.destroy();
    }
    Controller.prototype.start = function(){
        this.kListener = keylistener(store);
        this.kListener.on('key', this.onKey);

        setInterval( function(){
            store.dispatch(actions.moveDown());
        }, 100);

        store.dispatch(actions.addPiece());
    };

    return Controller;
});
