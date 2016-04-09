define(
    ['easel', '../constants', '../store/gamestore'],
    function(createjs, constants, store){
    'use strict';

    var TEXT = 'SCORE: 0000   TIME: 00:00';

    function update(text){
        let st = store.getState();
        let s = Math.floor(st.time / 1000);
        let m = Math.floor(s / 60);
        s = Math.floor(s - m * 60);
        text.text = TEXT
            .replace('0000', ('0000' + st.score).slice(-4))
            .replace('00:',  ('00' + m).slice(-2) + ':')
            .replace(':00',  ':' + ('00' + s).slice(-2));
    };

    return function(){
        var text = new createjs.Text(TEXT, '24px Arial', constants.COLOR_FG);
        store.subscribe(()=>update(text));
        return text;
    };
});
