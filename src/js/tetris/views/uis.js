define(['pixi', 'tools'], function(PX, tools){
    'use strict';

    function Button(textures){
        PX.Sprite.call(this, textures[0]);
        this.textures = textures;
        this.interactive = true;

        this.on('mouseover', () =>{ this.texture = textures[1];});
        this.on('mouseout', () =>{ this.texture = textures[0];});
        this.on('mouseup', () => this.texture = textures[0]);
        this.on('mousedown', () => this.texture = textures[2]);
    }
    Button = tools.extend(Button, PX.Sprite);

    return {
        buttonEnter: () => new Button([
            PX.utils.TextureCache['button_normal.png'],
            PX.utils.TextureCache['button_over.png'],
            PX.utils.TextureCache['button_active.png'],
        ]),
        logo: () => new PX.Sprite(PX.utils.TextureCache['logo.png']),
    };
});
