define(['ramda'], function(R){
    'use strict';

    var constants = R.reduce(function(a, b){
        a[b] = b;
        return a;
    }, {}, ['ADD_SHAPE', 'MOVE_FIELD', 'GAME_START', 'GAME_STOP']);

    console.log( constants );
});
