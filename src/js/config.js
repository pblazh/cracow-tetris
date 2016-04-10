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
        easel: '../bower_components/EaselJS/lib/easeljs-0.8.2.min',

        constants: './tetris/constants',
        tools: './tetris/utils/tools',
    },
});
