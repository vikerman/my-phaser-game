import { Scene } from 'phaser';
import { Character } from '../objects/character';
import { createObjectsFromLayer } from '../utils/objectLayer';

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  player: Character;
  playerLight: Phaser.GameObjects.Light;
  waterfall:
    | Phaser.Sound.NoAudioSound
    | Phaser.Sound.HTML5AudioSound
    | Phaser.Sound.WebAudioSound;
  waterfallPos: Phaser.Math.Vector2;
  sprites: Phaser.GameObjects.Sprite[];

  constructor() {
    super('Game');
  }

  create() {
    this.camera = this.cameras.main;

    // Load the TileMap. By convention the key for the tileset image is same as the tileset name.
    const map = this.make.tilemap({ key: 'map' });
    for (const ts of map.tilesets) {
      map.addTilesetImage(ts.name);
    }

    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    for (const layer of map.layers) {
      const ground = map
        .createLayer(layer.name, map.tilesets, 0, 0)
        .setLighting(true);
      // Add colliders from the tilemap layers
      ground?.setCollisionFromCollisionGroup();
      this.matter.world.convertTilemapLayer(
        ground as Phaser.Tilemaps.TilemapLayer,
      );
    }

    // Add objects and their colliders from the `objects` layer.
    createObjectsFromLayer(map, 'objects');

    // Debug toggle.
    this.matter.world.drawDebug = false;
    const keyObject = this.input.keyboard?.addKey('ESC');
    keyObject?.on('down', () => {
      this.matter.world.drawDebug = !this.matter.world.drawDebug;
      this.matter.world.debugGraphic.clear();
    });

    // Load the character sprite.
    this.player = new Character(this, 'king', {
      mainPlayer: true,
      x: 1000,
      y: 100,
    });

    // Setup camera.
    this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.camera.startFollow(this.player.mainObject(), true /* roundPixels */);

    // Lighting
    // Sunset
    // 0xfff474
    // 0xfd5e53
    // 0x3c3b5f
    // 0x191c5c
    // Moonlight
    // 0x04084f
    // Bright
    // 0xaaaaaa
    this.lights.enable().setAmbientColor(0x191c5c);

    const playerPos = this.player.getPosition();
    this.playerLight = this.lights.addLight(
      playerPos.x - 20,
      playerPos.y - 8,
      128,
      0xffa500,
      2,
      20,
    );
    // this.playerLight.setVisible(false);

    const tween = this.tweens.add({
      targets: this.playerLight,
      ease: 'Bounce',
      intensity: 0.5,
      yoyo: true,
      repeat: -1,
      duration: 1000,
      onRepeat: () => {
        tween.duration = 100 + Math.random() * 900;
      },
    });

    // Sounds

    // Fire idle sound
    const fireSound = this.sound.add('fire-idle', {
      loop: true,
      volume: 0.1,
    });
    fireSound.play();

    // Ambient night sound
    const nightSound = this.sound.add('night', {
      loop: true,
      volume: 0.1,
    });
    nightSound.play();

    // Waterfall sound
    this.waterfall = this.sound.add('waterfall', {
      loop: true,
      volume: 0.25,
    });
    this.waterfall.play();
    this.waterfallPos = new Phaser.Math.Vector2(900, 300);

    // Scene PostEffects.
    this.camera.filters.internal
      .addColorMatrix()
      .colorMatrix.contrast(0.1)
      .saturate(0.3, true);
  }

  override update() {
    const playerPos = this.player.getPosition();
    this.playerLight.x = playerPos.x - 20;
    this.playerLight.y = playerPos.y - 8;

    const dist = this.waterfallPos.distance(this.player.getPosition());
    if (dist != 0) {
      let vol = Math.max(0, Math.min(1, 50 / dist));
      this.waterfall.setVolume(vol);
    }
  }
}
