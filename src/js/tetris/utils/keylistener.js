define(['easel', '../constants'], function(createjs, constants){
    'use strict';

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
                listener.dispatchEvent({
                        type: 'key',
                        value: constants.KEY_LEFT,
                });
                break;
            case KEYCODE_RIGHT:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_RIGHT,
                });
                break;
            case KEYCODE_UP:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_BACK,
                });
                break;
            case KEYCODE_DOWN:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_ROTATE,
                });
                break;
            case KEYCODE_SPACE:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_DROP,
                });
            case KEYCODE_M:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_MAGIC,
                });
                break;
            };
        }

    function KeyListener(){
    }
    createjs.EventDispatcher.initialize(KeyListener.prototype);

    return function(){
        let kl = new KeyListener();
        let listener = onKeyDown(kl);
        window.addEventListener('keydown', listener);
        kl.destroy = () => window.removeEventListener('keydown', listener);
        return kl;
    };

});
