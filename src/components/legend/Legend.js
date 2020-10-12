import React from 'react';
import cat from '../../assets/player/cat.png';
import mouse from '../../assets/player/mouse.png';
import wall from '../../assets/tiles/wall_red.png';
import weight from '../../assets/tiles/weight.png';
import './Legend.scss';

const Legend = () => {
  return (
    <div className="legend">
      <ul>
        <li>
          <img src={cat} alt="player" /> - Source
        </li>
        <li>
          <img src={mouse} alt="target" /> - Destination
        </li>
        <li>
          <img src={wall} alt="wall" /> - Wall
        </li>
        <li>
          <img src={weight} alt="weight" /> - Weight
        </li>
        <li>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="visited-box"></div>
            <div>&nbsp;- Visited</div>
          </div>
        </li>
        <li>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="sp-box"></div>
            <div>&nbsp;- Shortest Path</div>
          </div>
        </li>
      </ul>
    </div>
  );
};

export default Legend;
