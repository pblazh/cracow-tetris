define(['ramda'], function(R){
    'use strict';

    // convert underscored uppercase string into the cameleCased
    let dashToCamel = R.compose(
            (a) => a[0].toLowerCase() + a.substr(1),
            R.join(''),
            R.map((a) => a[0] + a.substr(1).toLowerCase()),
            R.split('_')
        );

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
        (a, b) => R.merge(a, {[dashToCamel(b)]: action(b)})
    )(constants, FIELDS);
});
