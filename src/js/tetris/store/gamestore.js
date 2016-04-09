define(
    ['redux', 'ramda', './actions', './tetris', '../constants'],
    function(redux, R, actions, tetris, constants){
        'use strict';

        const INITIAL_STATE = {
            score: 0,
            time: 0,
            page: constants.PAGE_INTRO,
            piece: {},
            gamefield: tetris.EMPTY_FIELD,
        };
        function gameReducer(state, action){
            if(!state){
                return INITIAL_STATE;
            }
            let nState;
            switch(action.type){
            case actions.SWITCH_PAGE:
                nState = R.merge(state, {page: action.value});
                break;
            case actions.SET_SCORE:
                nState = R.merge(state, {page: action.value});
                break;
            case actions.SET_TIME:
                nState = R.merge(state, {time: action.value});
                break;
            case actions.ADD_PIECE:
                nState = R.merge(state, {piece: tetris.makePiece()});
                break;
            case actions.MOVE_LEFT:
                nState = R.merge(state, {
                    piece: tetris.moveLeft(state.piece, state.gamefield),
                });
                break;
            case actions.MOVE_RIGHT:
                nState = R.merge(state, {
                    piece: tetris.moveRight(state.piece, state.gamefield),
                });
                break;
            case actions.ROTATE_LEFT:
                nState = R.merge(state, {
                    piece: tetris.rotateLeft(state.piece, state.gamefield),
                });
                break;
            case actions.DROP_DOWN:
                let nPiece = tetris.dropDown(state.piece, state.gamefield);
                nState = R.merge(state, {
                    gamefield: tetris.mergeBlock(nPiece, state.gamefield),
                    piece: tetris.makePiece(),
                });
                break;
            case actions.MOVE_DOWN:
                nState = R.merge(state, {
                    piece: tetris.moveDown(state.piece, state.gamefield),
                });
                // if block has not moved...
                if(R.equals(nState.piece, state.piece)){
                    nState = R.merge(nState, {
                        gamefield: tetris.mergeBlock(nState.piece, nState.gamefield),
                        piece: tetris.makePiece(),
                    });
                }
                break;
            default:
                nState = state;
            }
            nState = R.merge(nState, {
                gamefield: tetris.shiftField(nState.gamefield),
            });
            return nState;
        }

        return redux.createStore(gameReducer);
});
