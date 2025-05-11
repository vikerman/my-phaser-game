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
  vignette: Phaser.GameObjects.Image;

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
      const layerObj = map
        .createLayer(layer.name, map.tilesets, 0, 0)
        .setLighting(true);
      // Add colliders from the tilemap layers
      layerObj?.setCollisionFromCollisionGroup();
      this.matter.world.convertTilemapLayer(
        layerObj as Phaser.Tilemaps.TilemapLayer,
      );
      // layerObj.enableFilters();
      // layerObj.filters?.internal.addColorMatrix().colorMatrix.brightness(0.9);
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
    // 0xcccccc
    this.lights.enable().setAmbientColor(0x191c5c);

    const playerPos = this.player.getPosition();
    this.playerLight = this.lights.addLight(
      playerPos.x - 8,
      playerPos.y + 8,
      144,
      0xffa500,
      0.5,
      64,
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

    // Add a fixed light.
    const fixedLight = this.lights.addLight(
      playerPos.x - 200,
      playerPos.y + 200,
      512,
      0xffa500,
      0.7,
      100,
    );
    // fixedLight.setVisible(false);
    const tween2 = this.tweens.add({
      targets: fixedLight,
      ease: 'Bounce',
      intensity: 0.5,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      onRepeat: () => {
        tween2.duration = 100 + Math.random() * 900;
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
    this.waterfallPos = new Phaser.Math.Vector2(1000, 300);

    // Vignette
    this.vignette = this.add.image(0, 0, 'vignette');
    this.vignette.setScale(1.05);
    this.vignette.setAlpha(0.85);
    this.vignette.depth = 1000000;

    // Scene PostEffects.
    this.camera.filters.internal
      .addColorMatrix()
      .colorMatrix.hue(20)
      .saturate(-0.3)
      .brightness(1.1, true);

    this.camera.filters.internal.addTiltShift(0.6, 2, 0, 0, 0.4, 0.9);

    // So much better in low light!!!
    this.camera.filters.internal.addThreshold(0.05, 0.5);

    // Daytime
    // this.camera.filters.internal.addThreshold(0.05, 0.9);
  }

  override update() {
    const playerPos = this.player.getPosition();
    this.playerLight.x = playerPos.x - 8;
    this.playerLight.y = playerPos.y + 8;

    const dist = this.waterfallPos.distance(this.player.getPosition());
    if (dist != 0) {
      let vol = Math.max(0, Math.min(1, 50 / dist));
      this.waterfall.setVolume(vol);
    }

    this.vignette.x = this.camera.worldView.centerX;
    this.vignette.y = this.camera.worldView.centerY;
  }
}
