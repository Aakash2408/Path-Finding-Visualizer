import React, { Component } from "react";

import "./Tutorial.scss";

class InfoPanel extends Component {
  render() {
    return (
      <div className="tutorial">
        <ul>
          <li>
            <span className="emphasize">Left</span> click mouse to add a wall.
          </li>
          <li>
            Hold <span className="emphasize">w</span> and click to add weights.
          </li>
          <li>
            {" "}
            <span className="emphasize">Hold</span> left click mouse and{" "}
            <span className="emphasize">drag</span> to add walls.
          </li>
          <li>
            You can <span className="emphasize">drag and drop </span>
            player and target anywhere you want.
          </li>
        </ul>
      </div>
    );
  }
}

export default InfoPanel;
