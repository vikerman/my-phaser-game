import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { Glow } from './scenes/Glow';
import { Glow2 } from './scenes/Glow2';

import { Game, Types } from 'phaser';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 640,
  height: 360,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  // don't use smoothPixelArt
  physics: {
    default: 'matter',
    matter: {
      debug: true,
      gravity: { x: 0, y: 0 },
    },
  },
  desynchronized: true,
  scene: [Boot, Preloader, Glow, Glow2, /* MainMenu, */ MainGame, GameOver],
};
window.devicePixelRatio = 1;
export default new Game(config);
