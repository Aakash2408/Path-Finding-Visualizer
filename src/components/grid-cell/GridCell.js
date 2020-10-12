import React from "react";
import "./GridCell.scss";

const GridCell = (props) => {
  const {
    isWall,
    isPlayer,
    isTarget,
    visited,
    isWeight,
    shortestPath,
    mazeActive,
    i,
    j,
    onCellClicked,
    draggable,
    onDragDrop,
    mouseDown,
    mouseOver,
  } = props;

  let tileClass = [];
  if (isWall) {
    tileClass = "wall";
  } else if (isPlayer) {
    tileClass = "player";
  } else if (isTarget) {
    tileClass = "target";
  } else if (visited && !isWeight) {
    tileClass = "visited";
  } else if (visited && isWeight) {
    tileClass = "visited weight";
  } else if (shortestPath && !isWeight) {
    tileClass = "shortest-path";
  } else if (shortestPath && isWeight) {
    tileClass = "shortest-path weight";
  } else if (isWeight) {
    tileClass = "weight";
  } else {
    tileClass = "floor";
  }

  const dragStart = (e) => {
    if (e.target.getAttribute("data-isplayer") === "true") {
      e.dataTransfer.setData("isplayer", "true");
    } else if (e.target.getAttribute("data-istarget") === "true") {
      e.dataTransfer.setData("istarget", "true");
    }
  };

  const dragOver = (e) => {
    e.preventDefault();
  };

  const dragEnter = (e) => {
    e.preventDefault();
    e.target.style.background = "rgba(113, 235, 52, 0.5)";
  };

  const dragLeave = (e) => {
    e.target.style.background = null;
  };

  const dragDrop = (e) => {
    e.target.style.background = null;

    let i = e.target.getAttribute("data-i");
    let j = e.target.getAttribute("data-j");
    let type = "";

    if (e.dataTransfer.getData("isplayer") === "true") {
      type = "player";
      e.target.setAttribute("data-isplayer", "true");
    } else if (e.dataTransfer.getData("istarget") === "true") {
      type = "target";
      e.target.setAttribute("data-istarget", "true");
    }

    onDragDrop(i, j, type);
  };

  if (draggable === true) {
    return (
      <td
        className={`${tileClass} ${!mazeActive ? "grid-border" : ""} grid-cell`}
        data-i={i}
        data-j={j}
        data-isplayer={isPlayer}
        data-istarget={isTarget}
        onClick={() => onCellClicked(i, j)}
        draggable="true"
        onDragStart={dragStart}
      ></td>
    );
  } else {
    return (
      <td
        className={`${tileClass} ${!mazeActive ? "grid-border" : ""} grid-cell`}
        data-i={i}
        data-j={j}
        onDragOver={dragOver}
        onDragEnter={dragEnter}
        onDragLeave={dragLeave}
        onDrop={dragDrop}
        onMouseDown={(e) => {
          e.preventDefault();
          onCellClicked(i, j);
          mouseDown(true);
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          mouseDown(false);
        }}
        onMouseOver={(e) => {
          e.preventDefault();
          mouseOver(i, j);
        }}
      ></td>
    );
  }
};

export default GridCell;
