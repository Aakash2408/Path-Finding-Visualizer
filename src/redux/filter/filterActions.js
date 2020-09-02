import FILTER_TYPES from "./filterTypes";

export const chooseAlg = (id) => ({
  type: FILTER_TYPES.CHOOSE_ALGO,
  payload: id,
});
