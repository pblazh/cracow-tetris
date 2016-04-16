'use strict';

require.config({
    shim: {
        underscore: {
            exports: '_',
        },
        easel: {
            exports: 'createjs',
        },
    },
    paths: {
        ramda: '../bower_components/ramda/dist/ramda.min',
        redux: '../bower_components/redux/index',
        pixi: '../bower_components/pixi.js/bin/pixi.min',
        signals: '../bower_components/js-signals/dist/signals.min',

        constants: './tetris/constants',
        tools: './tetris/utils/tools',
    },
});
