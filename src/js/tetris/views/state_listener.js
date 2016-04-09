define(['ramda'], function(R){
    'use strict';

    // the basic view which only rerenders itself when one of the <fields> in
    // the <store> changed
    let StateListener = function(store, fields, callback){
        this.store = store;
        this.fields = fields;
        this.callback = callback;
        this.lastState = {};
        if(store){
            this.store.subscribe(this.onUpdate.bind(this));
        }
    };

    StateListener.prototype.callback = R.identity;

    StateListener.prototype.onUpdate = function(){
        let state = R.pick(this.fields)(this.store.getState());
        if(!R.equals(this.lastState, state)){
            this.callback(state);
            this.lastState = state;
        }
    };

    return StateListener;
});
