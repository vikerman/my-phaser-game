import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(512, 384, 'background');

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath('assets');

    // Images
    this.load.image('logo', 'logo.png');

    this.load.tilemapTiledJSON('map', 'maps/forest.tmj');
    this.load.spritesheet('forest', 'tilesets/forest/gentle forest v01.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('objects', 'tilesets/forest/gentle 32x32 v01.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet(
      'tree_objects',
      'tilesets/forest/gentle trees 80x96 v01.png',
      {
        frameWidth: 80,
        frameHeight: 96,
      },
    );

    this.load.image('shadow_sprite', 'characters/shadow_sprite.png');

    this.load.spritesheet('king', 'characters/npc/npc king A v03.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.audio('fire-idle', 'sounds/fire/Fireball_LOOP.wav');
    this.load.audio('waterfall', 'sounds/water/1_river_outside.wav');
    this.load.audio('night', 'sounds/night/1_night_outside.wav');
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('Game');
    // this.scene.start('Glow');
    // this.scene.start('Glow2');
  }
}
