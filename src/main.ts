import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { Glow } from './scenes/Glow';

import { Game, Types } from 'phaser';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '0xeb7725',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  physics: {
    default: 'matter',
    matter: {
      debug: true,
      gravity: { x: 0, y: 0 },
    },
  },
  scene: [Boot, Preloader, Glow, /* MainMenu, */ MainGame, GameOver],
};

export default new Game(config);
