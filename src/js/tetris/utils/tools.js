define(['ramda'], function(R){
    'use strict';

    // convert underscored uppercase string into the cameleCased
    let dashToCamel = R.compose(
            (a) => a[0].toLowerCase() + a.substr(1),
            R.join(''),
            R.map((a) => a[0] + a.substr(1).toLowerCase()),
            R.split('_')
        );

    // convert a list into a list of pairs where the first element is and index
    let enumerate = list => R.zip(R.range(0, list.length), list);

    function extend(Child, Parent){
        Child.prototype = Object.create(Parent.prototype);
        Child.prototype.constructor = Child;
        Child.prototype.uber = Parent;
        return Child;
    }

    return {
        enumerate,
        dashToCamel,
        extend,
    }

});
