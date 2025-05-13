import { Scene } from 'phaser';
import { Character } from '../objects/character';
import { createObjectsFromLayer } from '../utils/objectLayer';
import {
  CurrentTimeOfDay,
  setCurrentTimeOfDay,
  TimesOfDay,
} from '../objects/time';

export type SoundType =
  | Phaser.Sound.NoAudioSound
  | Phaser.Sound.HTML5AudioSound
  | Phaser.Sound.WebAudioSound;

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  player: Character;
  fixedLight: Phaser.GameObjects.Light;
  waterfall: SoundType;
  fireSound: SoundType;
  nightSound: SoundType;
  waterfallPos: Phaser.Math.Vector2;
  sprites: Phaser.GameObjects.Sprite[];
  vignette: Phaser.GameObjects.Image;
  colorMatrix: Phaser.Display.ColorMatrix;
  threshold?: Phaser.Filters.Threshold;

  constructor() {
    super('Game');
  }

  private toggleTimeOfDay() {
    if (CurrentTimeOfDay == TimesOfDay.DAY) {
      setCurrentTimeOfDay(TimesOfDay.NIGHT);
    } else {
      setCurrentTimeOfDay(TimesOfDay.DAY);
    }

    if (CurrentTimeOfDay == TimesOfDay.DAY) {
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
      this.lights.setAmbientColor(0xaaaaaa);
      this.fixedLight.setVisible(false);

      this.fireSound.pause();
      this.nightSound.pause();

      this.colorMatrix.reset().hue(20).saturate(-0.3).brightness(1.2, true);

      if (this.threshold != null) {
        this.threshold.destroy();
      }
      this.threshold = this.camera.filters.internal.addThreshold(0.05, 0.9);
    } else if (CurrentTimeOfDay == TimesOfDay.NIGHT) {
      this.lights.setAmbientColor(0x191c5c);
      this.fixedLight.setVisible(true);

      this.fireSound.play();
      this.nightSound.play();

      this.colorMatrix.reset().hue(20).saturate(-0.3).brightness(1.3, true);

      // So much better in low light!!!
      if (this.threshold != null) {
        this.threshold.destroy();
      }
      this.threshold = this.camera.filters.internal.addThreshold(0.05, 0.5);
    }
  }

  create() {
    this.camera = this.cameras.main;
    this.lights.enable();

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
      x: 800,
      y: 100,
    });

    // Setup camera.
    this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.camera.startFollow(this.player.mainObject(), true /* roundPixels */);

    const playerPos = this.player.getPosition();

    // Add a fixed light.
    this.fixedLight = this.lights.addLight(
      playerPos.x,
      playerPos.y + 200,
      512,
      0xffa500,
      0.7,
      100,
    );
    const tween2 = this.tweens.add({
      targets: this.fixedLight,
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
    this.fireSound = this.sound.add('fire-idle', {
      loop: true,
      volume: 0.1,
    });

    // Ambient night sound
    this.nightSound = this.sound.add('night', {
      loop: true,
      volume: 0.1,
    });

    // Waterfall sound
    this.waterfall = this.sound.add('waterfall', {
      loop: true,
      volume: 0.25,
    });
    this.waterfall.play();
    this.waterfallPos = new Phaser.Math.Vector2(1000, 300);

    // Vignette
    this.vignette = this.add.image(0, 0, 'vignette');
    this.vignette.setScale(1.01);
    this.vignette.setAlpha(1);
    this.vignette.depth = 1000000;

    // Scene PostEffects.
    this.colorMatrix = this.camera.filters.internal
      .addColorMatrix()
      .colorMatrix.hue(20)
      .saturate(-0.3)
      .brightness(1.1, true);

    this.camera.filters.internal.addTiltShift(0.6, 2, 0, 0, 0.4, 0.9);

    // Toggle the time of day.
    this.toggleTimeOfDay();

    // Setup key for daytime toggle.
    const tKey = this.input.keyboard?.addKey('T');
    tKey?.on('down', () => {
      this.toggleTimeOfDay();
    });

    this.events.on('postupdate', () => {
      this.postUpdate();
    });
  }

  postUpdate() {
    const playerPos = this.player.getPosition();
    const dist = this.waterfallPos.distance(playerPos);
    if (dist != 0) {
      let vol = Math.max(0, Math.min(1, 50 / dist));
      this.waterfall.setVolume(vol);
    }

    this.vignette.x = this.camera.worldView.centerX;
    this.vignette.y = this.camera.worldView.centerY;
  }
}
