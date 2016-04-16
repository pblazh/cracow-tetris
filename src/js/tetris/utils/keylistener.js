define(['pixi', 'signals', '../constants'], function(PX, signals, constants){
    'use strict';

    // listen key for the keyevent and convert them into game specific events
    const KEYCODE_LEFT = 37,
          KEYCODE_RIGHT = 39,
          KEYCODE_UP = 38,
          KEYCODE_DOWN = 40,
          KEYCODE_M = 77,
          KEYCODE_SPACE = 32;


    let onKeyDown = (listener) =>
        (ev) => {
            switch(ev.keyCode){
            case KEYCODE_LEFT:
                listener.keydown.dispatch(constants.KEY_LEFT);
                break;
            case KEYCODE_RIGHT:
                listener.keydown.dispatch(constants.KEY_RIGHT);
                break;
            case KEYCODE_UP:
                listener.keydown.dispatch(constants.KEY_BACK);
                break;
            case KEYCODE_DOWN:
                listener.keydown.dispatch(constants.KEY_ROTATE);
                break;
            case KEYCODE_SPACE:
                listener.keydown.dispatch(constants.KEY_DROP);
            case KEYCODE_M:
                listener.keydown.dispatch(constants.KEY_MAGIC);
                break;
            };
        }

    function KeyListener(){
        this.keydown = new signals.Signal();
    }

    return function(){
        let kl = new KeyListener();
        let listener = onKeyDown(kl);
        window.addEventListener('keydown', listener);
        kl.destroy = () => window.removeEventListener('keydown', listener);
        return kl;
    };

});
