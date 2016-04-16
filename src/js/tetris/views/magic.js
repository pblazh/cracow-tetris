define(['ramda', 'pixi'], function(R, PX){
    'use strict';

    return () => {
        let m = new PX.extras.MovieClip(
            R.map(n => PIXI.Texture.fromFrame('magic_' + n + '.png'))
            ([4].concat(R.range(0, 5)))
        );
        m.animationSpeed = 0.5;
        m.loop = false;
        return m;
    };
});
