import GRID_TYPES from "./gridTypes";

export const createGrid = () => ({
  type: GRID_TYPES.CREATE_GRID,
});

export const createMaze = () => ({
  type: GRID_TYPES.CREATE_MAZE,
});

export const findPath = (find) => ({
  type: GRID_TYPES.FIND_PATH,
  payload: find,
});

export const markCellVisited = (i, j) => ({
  type: GRID_TYPES.MARK_CELL_VISITED,
  payload: {
    i,
    j,
  },
});

export const markShortestPath = (i, j) => ({
  type: GRID_TYPES.MARK_SHORTEST_PATH,
  payload: {
    i,
    j,
  },
});

export const resetVisitedAndSP = (i, j) => ({
  type: GRID_TYPES.RESET_VISITED_AND_SP,
});

export const addWeights = () => ({
  type: GRID_TYPES.ADD_WEIGHTS,
});

export const wKeyPress = (pressed) => ({
  type: GRID_TYPES.W_KEY_PRESS,
  payload: pressed,
});

export const cellClicked = (i, j, algType) => ({
  type: GRID_TYPES.CELL_CLICKED,
  payload: {
    i,
    j,
    algType,
  },
});

export const dragDrop = (i, j, type) => ({
  type: GRID_TYPES.DRAG_DROP,
  payload: {
    i,
    j,
    type,
  },
});

export const mouseDown = (down) => ({
  type: GRID_TYPES.MOUSE_DOWN,
  payload: down,
});

export const mouseOver = (i, j, type) => ({
  type: GRID_TYPES.MOUSE_OVER,
  payload: {
    i,
    j,
    type,
  },
});
