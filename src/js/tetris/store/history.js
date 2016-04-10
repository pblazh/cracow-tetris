define(['./gamestore', 'constants', 'ramda'], function(store, constants, R){
        'use strict';

        // this module is singleton which store all gamestore states
        let history = [];
        store.subscribe(function(){
            let st = store.getState();
            // store history only than pice changed
            if(st != R.last(history) && (!history.length || st.piece != R.last(history).piece)){
                history.push(st);
                history = R.takeLast(constants.HISTORY, history);
            }
            // clear the history when switching a page
            if(st.page !== constants.PAGE_GAME){
                history.length = 0;
            }
        });

        return {
            pop(){
                // restore the state before the last
                history.pop();
                return history.pop();
            },
            length: ()=> history.length,
        }
});
