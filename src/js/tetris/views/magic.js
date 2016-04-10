define(['easel'], function(createjs){
    'use strict';

    const MAGIC_SHEET = new createjs.SpriteSheet({
        images: ['./assets/sprites.png'],
        frames: [
            [150, 50, 24, 24],
            [150 + 1 * 24, 50, 24, 24],
            [150 + 2 * 24, 50, 24, 24],
            [150 + 3 * 24, 50, 24, 24],
            [150, 75, 24, 24],
        ],
        animations: {
            in: {
                frames: [4, 0, 1, 2, 3, 4],
                next: false,
                speed: 0.5,
            },
            out: {
                frames: [3, 2, 1, 0, 4],
                next: false,
                speed: 0.5,
            },
        }
    });

    return () => new createjs.Sprite(MAGIC_SHEET);
});
