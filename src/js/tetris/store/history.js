define(['./gamestore', 'ramda'], function(store, R){
        'use strict';

        let history = [];
        store.subscribe(function(){
            let st = store.getState();
            history.push(st);
            history = R.takeLast(5, history);

            console.log( 'store', R.map(a => a.piece.y)(history));
        });

        return function pop(){
            history.pop();
            return history.pop();
        }
});
