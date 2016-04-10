define(['ramda', 'tools'], function(R, tools){
    'use strict';

    // all possible actions in the app
    const FIELDS = ['MOVE_RIGHT',
                    'MOVE_LEFT',
                    'MOVE_DOWN',
                    'DROP_DOWN',
                    'ROTATE_LEFT',
                    'MAGIC',
                    'GAME_START',
                    'GAME_RESTART',
                    'GAME_STOP',
                    'PUSH_BACK',
                    'SWITCH_PAGE'];

    var constants = R.reduce(
        (a, b) => R.merge(a, {[b]: b}),
        {}, FIELDS);

    // It generates an action creator
    let action = (type) => (value) => ({type, value});

    return R.reduce(
        (a, b) => R.merge(a, {[tools.dashToCamel(b)]: action(b)})
    )(constants, FIELDS);
});
