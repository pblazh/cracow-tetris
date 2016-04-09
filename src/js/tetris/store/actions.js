define(['ramda'], function(R){
    'use strict';

    // convert underscored uppercase string into the cameleCased
    let dashToCamel = R.compose(
            (a) => a[0].toLowerCase() + a.substr(1),
            R.join(''),
            R.map((a) => a[0] + a.substr(1).toLowerCase()),
            R.split('_')
        );

    const FIELDS = ['ADD_SHAPE',
                    'MOVE_RIGHT',
                    'MOVE_LEFT',
                    'MOVE_DOWN',
                    'DROP_DOWN',
                    'ROTATE_LEFT',
                    'GAME_START',
                    'GAME_STOP'];

    var constants = R.reduce(
        (a, b) => R.merge(a, {[b]: b}),
        {}, FIELDS);

    // It generates an action creator
    let action = (type) => () => ({type});

    return R.reduce(
        (a, b) => R.merge(a, {[dashToCamel(b)]: action(b)})
    )(constants, FIELDS);
});
