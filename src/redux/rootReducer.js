import { combineReducers } from "redux";
import gridReducer from "./grid/gridReducer";
import filterReducer from "./filter/filterReducer";
import modalReducer from "./modal/ModalReducer";

const rootReducer = combineReducers({
  grid: gridReducer,
  filter: filterReducer,
  modal: modalReducer,
});

export default rootReducer;
