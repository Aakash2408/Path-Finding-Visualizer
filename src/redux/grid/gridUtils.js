import shortid from "shortid";

export const createGridUtil = (state) => {
  const { rows, columns, playerPos, targetPos } = state;

  const gridCells = [];

  for (let i = 0; i < rows; i++) {
    gridCells.push([]);
    for (let j = 0; j < columns; j++) {
      gridCells[i].push({
        id: shortid(),
        i,
        j,
        isWeight: false,
        isWall: false,
        isPlayer: false,
        isTarget: false,
        visited: false,
        shortestPath: false,
        mazeActive: false,
        weight: 1,
        draggable: false,
      });
    }
  }

  gridCells[playerPos.i][playerPos.j].isPlayer = true;
  gridCells[playerPos.i][playerPos.j].draggable = true;

  gridCells[targetPos.i][targetPos.j].isTarget = true;
  gridCells[targetPos.i][targetPos.j].draggable = true;

  clearPlayerAndTargetWalls(playerPos, targetPos, gridCells);

  return { gridCells, enableVisualizeButton: true };
};

export const createMazeUtil = (state) => {
  const { rows, columns, playerPos, targetPos } = state;
  const gridCells = [...state.gridCells];

  //convert edges to walls
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      gridCells[i][j].mazeActive = true;

      if (i === 0 || j === 0 || i === rows - 1 || j === columns - 1) {
        gridCells[i][j].isWall = true;
      }
    }
  }

  gridCells[playerPos.i][playerPos.j].isPlayer = true;
  gridCells[targetPos.i][targetPos.j].isTarget = true;

  recursiveDivision(gridCells, 0, rows - 2, 0, columns - 2);
  clearPlayerAndTargetWalls(playerPos, targetPos, gridCells);

  return { gridCells, enableVisualizeButton: true };
};

export const makeCellVisitedUtil = (state, { i, j }) => {
  const gridCells = [...state.gridCells];
  gridCells[i][j].visited = true;
  return gridCells;
};

export const makeCellSPUtil = (state, { i, j }) => {
  const gridCells = [...state.gridCells];
  gridCells[i][j].shortestPath = true;
  gridCells[i][j].visited = false;
  return gridCells;
};

export const resetVisitedAndSPUtil = (state) => {
  const gridCells = [...state.gridCells];

  for (let i = 0; i < gridCells.length; i++) {
    for (let j = 0; j < gridCells[i].length; j++) {
      gridCells[i][j].shortestPath = false;
      gridCells[i][j].visited = false;
    }
  }
  return gridCells;
};

export const addWeightsUtil = (state) => {
  const gridCells = [...state.gridCells];

  for (let i = 0; i < gridCells.length; i++) {
    for (let j = 0; j < gridCells[i].length; j++) {
      let x = Math.floor(Math.random() * 10);
      if (
        x === 5 &&
        gridCells[i][j].isWall === false &&
        gridCells[i][j].isPlayer === false &&
        gridCells[i][j].isTarget === false
      ) {
        gridCells[i][j].isWeight = true;
        gridCells[i][j].weight = 3;
      }
    }
  }

  return gridCells;
};

export const onCellClickUtil = (state, { i, j, algType }) => {
  const { wKeyPressed, enableVisualizeButton } = state;
  const gridCells = [...state.gridCells];

  if (enableVisualizeButton) {
    if (wKeyPressed && algType === "weighted") {
      if (
        gridCells[i][j].isPlayer === false &&
        gridCells[i][j].isTarget === false
      ) {
        if (gridCells[i][j].isWall === true) {
          gridCells[i][j].isWall = false;
        }
        gridCells[i][j].isWeight = true;
        gridCells[i][j].weight = 3;
      }
    } else if (
      gridCells[i][j].isPlayer === false &&
      gridCells[i][j].isTarget === false &&
      gridCells[i][j].isWall === true
    ) {
      gridCells[i][j].isWall = false;
      gridCells[i][j].weight = 1;
    } else if (gridCells[i][j].isWeight === true) {
      gridCells[i][j].isWeight = false;
      gridCells[i][j].weight = 1;
    } else if (
      gridCells[i][j].isPlayer === false &&
      gridCells[i][j].isTarget === false
    ) {
      gridCells[i][j].isWall = true;
    }
  }

  return gridCells;
};

export const onDragDropUtil = (state, { i, j, type }) => {
  const gridCells = [...state.gridCells];
  const { playerPos, targetPos, enableVisualizeButton } = state;

  if (enableVisualizeButton) {
    gridCells[i][j].isWall = false;
    gridCells[i][j].isWeight = false;
    gridCells[i][j].weight = 1;

    if (type === "player") {
      gridCells[i][j].isPlayer = true;
      gridCells[i][j].draggable = true;
      gridCells[playerPos.i][playerPos.j].isPlayer = false;
      gridCells[playerPos.i][playerPos.j].draggable = false;
      playerPos.i = i;
      playerPos.j = j;
    } else if (type === "target") {
      gridCells[i][j].isTarget = true;
      gridCells[i][j].draggable = true;
      gridCells[targetPos.i][targetPos.j].isTarget = false;
      gridCells[targetPos.i][targetPos.j].draggable = false;
      targetPos.i = i;
      targetPos.j = j;
    }
  }

  return { playerPos, targetPos, gridCells };
};

export const onMouseDownMouseOverUtil = (state, { i, j, type }) => {
  const gridCells = [...state.gridCells];
  const { mouseDown, wKeyPressed, enableVisualizeButton } = state;

  if (enableVisualizeButton) {
    if (mouseDown === true && wKeyPressed === true && type === "weighted") {
      gridCells[i][j].isWall = false;
      gridCells[i][j].isWeight = true;
      gridCells[i][j].weight = 3;
    } else if (mouseDown === true) {
      gridCells[i][j].isWall = true;
      gridCells[i][j].isWeight = false;
      gridCells[i][j].weight = 1;
    }
  }

  return gridCells;
};

function recursiveDivision(gridCells, minI, maxI, minJ, maxJ) {
  if (minI >= maxI || minJ >= maxJ) return;

  let horizontal = maxI - minI > maxJ - minJ ? true : false;

  if (horizontal) {
    //wall cordinate
    let wallI = randomVerticalCoordinate(minI, maxI, "wall");
    buildWall(wallI, maxI, minJ, maxJ, "horizontal", gridCells);
    buildPassage(wallI, maxI, minJ, maxJ, "horizontal", gridCells);

    //call function on top and bottom half
    recursiveDivision(gridCells, minI, wallI - 1, minJ, maxJ); //top
    recursiveDivision(gridCells, wallI + 1, maxI, minJ, maxJ); //bottom
  } else {
    //wall cordinate
    let wallJ = randomHorizontalCoordinate(minJ, maxJ, "wall");
    buildWall(minI, maxI, wallJ, maxJ, "vertical", gridCells);
    buildPassage(minI, maxI, wallJ, maxJ, "vertical", gridCells);

    recursiveDivision(gridCells, minI, maxI, minJ, wallJ - 1); //left
    recursiveDivision(gridCells, minI, maxI, wallJ + 1, maxJ); //right
  }
}

function buildWall(minI, maxI, minJ, maxJ, direction, gridCells) {
  if (direction === "horizontal") {
    while (minJ <= maxJ && gridCells[minI][minJ].isWeight === false) {
      gridCells[minI][minJ].isWall = true;
      minJ++;
    }
  } else {
    while (minI <= maxI && gridCells[minI][minJ].isWeight === false) {
      gridCells[minI][minJ].isWall = true;
      minI++;
    }
  }
}

function buildPassage(minI, maxI, minJ, maxJ, direction, gridCells) {
  if (direction === "horizontal") {
    let passageJ = randomHorizontalCoordinate(minJ, maxJ, "passage");
    if (
      minI === 0 ||
      passageJ === 0 ||
      minI === gridCells.length - 1 ||
      passageJ === gridCells[0].length - 1
    )
      return;
    gridCells[minI][passageJ].isWall = false;
  } else {
    let passageI = randomVerticalCoordinate(minI, maxI, "passage");
    if (
      minJ === 0 ||
      passageI === 0 ||
      minJ === gridCells[0].length - 1 ||
      passageI === gridCells.length - 1
    )
      return;
    gridCells[passageI][minJ].isWall = false;
  }
}

function clearPlayerAndTargetWalls(playerPos, targetPos, gridCells) {
  if (gridCells[playerPos.i][playerPos.j].isWall) {
    gridCells[playerPos.i][playerPos.j].isWall = false;
    gridCells[playerPos.i][playerPos.j].isPlayer = true;
  }
  if (gridCells[targetPos.i][targetPos.j].isWall) {
    gridCells[targetPos.i][targetPos.j].isWall = false;
    gridCells[targetPos.i][targetPos.j].isTarget = true;
  }
}

//return I
function randomVerticalCoordinate(minI, maxI, type) {
  if (type === "wall") {
    return Math.floor(random(minI, maxI) / 2) * 2;
  }
  return Math.floor(random(minI, maxI) / 2) * 2 + 1;
}

//return J
function randomHorizontalCoordinate(minJ, maxJ, type) {
  if (type === "wall") {
    return Math.floor(random(minJ, maxJ) / 2) * 2;
  }
  return Math.floor(random(minJ, maxJ) / 2) * 2 + 1;
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
