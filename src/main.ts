import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { Glow } from './scenes/Glow';
import { Glow2 } from './scenes/Glow2';

import { Game, Types } from 'phaser';

import Stats from 'stats.js';

const stats1 = new Stats();
stats1.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
stats1.dom.style.cssText = 'position:absolute;top:0px;left:0px;';
document.body.appendChild(stats1.dom);

const stats2 = new Stats();
stats2.showPanel(2); // 0: fps, 1: ms, 2: mb, 3+: custom
stats2.dom.style.cssText = 'position:absolute;top:0px;left:80px;';
document.body.appendChild(stats2.dom);

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 1280,
  height: 800,
  parent: 'game-container',
  maxTextures: 2,
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
const game = new Game(config);

game.events.on(Phaser.Core.Events.PRE_STEP, () => {
  stats1.begin();
  stats2.begin();
});

game.events.on(Phaser.Core.Events.POST_RENDER, () => {
  stats1.end();
  stats2.end();
});

export default game;
