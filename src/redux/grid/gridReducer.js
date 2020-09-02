import GRID_TYPES from "./gridTypes";
import {
  createGridUtil,
  createMazeUtil,
  makeCellVisitedUtil,
  makeCellSPUtil,
  resetVisitedAndSPUtil,
  addWeightsUtil,
  onCellClickUtil,
  onDragDropUtil,
  onMouseDownMouseOverUtil,
} from "./gridUtils";

const INITIAL_STATE = {
  rows: calculateRowsNeeded(),
  columns: 40,
  gridCells: [],
  playerPos: {
    i: Math.floor(calculateRowsNeeded() / 2),
    j: 3,
  },
  targetPos: {
    i: Math.floor(calculateRowsNeeded() / 2),
    j: 35,
  },
  enableVisualizeButton: true,
  mazeActive: false,
  wKeyPressed: false,
  mouseDown: false,
};

function calculateRowsNeeded() {
  let height = window.screen.height;
  let defaultRowCount = 22;

  if (height >= 1080) {
    return defaultRowCount;
  } else {
    let diff = 1080 - window.innerHeight;
    let perc = Math.floor((diff / 1080) * 100);
    perc = 0.75 * perc;
    return Math.floor(((100 - perc) / 100) * defaultRowCount);
  }
}

const gridReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case GRID_TYPES.CREATE_GRID: {
      const { enableVisualizeButton, gridCells } = createGridUtil(state);
      return {
        ...state,
        gridCells,
        enableVisualizeButton,
      };
    }

    case GRID_TYPES.CREATE_MAZE: {
      const { enableVisualizeButton, gridCells } = createMazeUtil(state);
      return {
        ...state,
        gridCells,
        enableVisualizeButton,
      };
    }
    case GRID_TYPES.FIND_PATH:
      return {
        ...state,
        enableVisualizeButton: action.payload,
      };

    case GRID_TYPES.MARK_CELL_VISITED:
      return {
        ...state,
        gridCells: makeCellVisitedUtil(state, action.payload),
      };

    case GRID_TYPES.MARK_SHORTEST_PATH:
      return {
        ...state,
        gridCells: makeCellSPUtil(state, action.payload),
      };

    case GRID_TYPES.RESET_VISITED_AND_SP:
      return {
        ...state,
        gridCells: resetVisitedAndSPUtil(state),
      };

    case GRID_TYPES.ADD_WEIGHTS:
      return {
        ...state,
        gridCells: addWeightsUtil(state),
      };

    case GRID_TYPES.W_KEY_PRESS:
      return {
        ...state,
        wKeyPressed: action.payload,
      };

    case GRID_TYPES.CELL_CLICKED:
      return {
        ...state,
        gridCells: onCellClickUtil(state, action.payload),
      };

    case GRID_TYPES.DRAG_DROP: {
      const { playerPos, targetPos, gridCells } = onDragDropUtil(
        state,
        action.payload
      );
      return {
        ...state,
        gridCells,
        playerPos,
        targetPos,
      };
    }

    case GRID_TYPES.MOUSE_DOWN:
      return {
        ...state,
        mouseDown: action.payload,
      };

    case GRID_TYPES.MOUSE_OVER:
      return {
        ...state,
        gridCells: onMouseDownMouseOverUtil(state, action.payload),
      };

    default:
      return state;
  }
};

export default gridReducer;
