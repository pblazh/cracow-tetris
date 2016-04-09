define(['ramda'], function(R){
    'use strict';

    let enumerate = list => R.zip(R.range(0, list.length), list);

    return {
        enumerate
    }
});
