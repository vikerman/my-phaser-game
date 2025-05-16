import { Scene } from 'phaser';
import { Character } from '../objects/character';
import { createObjectsFromLayer } from '../utils/objectLayer';
import {
  CurrentDate,
  CurrentTimeOfDay,
  setCurrentDate,
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

  private adjustToTimeOfDay() {
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

      this.colorMatrix.reset().hue(40).saturate(-0.4).brightness(1.2, true);

      if (this.threshold != null) {
        this.threshold.destroy();
      }
      this.threshold = this.camera.filters.internal.addThreshold(0.05, 0.9);
    } else if (CurrentTimeOfDay == TimesOfDay.NIGHT) {
      this.lights.setAmbientColor(0x191c5c);
      this.fixedLight.setVisible(true);

      this.fireSound.play();
      this.nightSound.play();

      this.colorMatrix.reset().hue(40).saturate(-0.4).brightness(1.3, true);

      // So much better in low light!!!
      if (this.threshold != null) {
        this.threshold.destroy();
      }
      this.threshold = this.camera.filters.internal.addThreshold(0.05, 0.5);
    }
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setZoom(2);
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
    const fixedPos = { x: playerPos.x, y: playerPos.y + 200 };
    const lightHeight = 50;
    const color = 0x009cb1;
    const minBloom = 0.3;
    const maxBloom = 1.5;
    const circle = this.add.circle(fixedPos.x, fixedPos.y, 5, color);
    circle.depth = circle.y + lightHeight;

    // Shadow for the light orb
    const lightShadow = this.add.image(
      fixedPos.x,
      fixedPos.y + lightHeight,
      'shadow_sprite',
    );
    lightShadow.setAlpha(0.6);
    lightShadow.scaleX = 1 / 3;
    lightShadow.scaleY = 0.5 / 3;

    this.add.tween({
      targets: lightShadow,
      ease: 'Sine.easeInOut',
      scaleX: lightShadow.scaleX * 0.8,
      scaleY: lightShadow.scaleY * 0.8,
      alpha: lightShadow.alpha * 0.8,
      yoyo: true,
      repeat: -1,
      duration: 1200,
    });

    // Blooom!!!
    circle.enableFilters();
    const parallelFilters = circle.filters?.internal.addParallelFilters()!;
    parallelFilters.top.addThreshold(0.1, 0.8);
    parallelFilters.top.addBlur(1);
    parallelFilters.blend.blendMode = Phaser.BlendModes.ADD;
    parallelFilters.blend.amount = minBloom;

    this.add.tween({
      targets: circle,
      ease: 'Sine.easeInOut',
      y: fixedPos.y + 5,
      yoyo: true,
      repeat: -1,
      duration: 1200,
    });

    this.fixedLight = this.lights.addLight(
      playerPos.x,
      playerPos.y + 200,
      256,
      color,
      1,
      100,
    );
    const tween2 = this.tweens.add({
      targets: this.fixedLight,
      ease: 'Sine.easeInOut',
      intensity: 0.1,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      onUpdate: (_: Phaser.Tweens.Tween, __: any, key: string) => {
        if (key == 'intensity') {
          // Adjust light brightness based on this intentsity.
          parallelFilters.blend.amount =
            minBloom +
            ((this.fixedLight.intensity - 0.1) / 1.4) * (maxBloom - minBloom);
        }
      },
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
    this.vignette.setScale(
      (1.05 * this.sys.canvas.width) / (640 * this.camera.zoom),
    );
    this.vignette.setAlpha(1);
    this.vignette.depth = 1000000;

    // Scene PostEffects.
    this.colorMatrix = this.camera.filters.internal
      .addColorMatrix()
      .colorMatrix.hue(20)
      .saturate(-0.3)
      .brightness(1.1, true);

    this.camera.filters.internal.addTiltShift(0.6, 2, 0, 0, 0.4, 0.9);

    // Set the time of day to match local time.
    setCurrentDate(new Date());
    this.adjustToTimeOfDay();

    // Setup key for daytime toggle.
    const tKey = this.input.keyboard?.addKey('T');
    tKey?.on('down', () => {
      if (CurrentTimeOfDay == TimesOfDay.DAY) {
        setCurrentTimeOfDay(TimesOfDay.NIGHT);
      } else {
        setCurrentTimeOfDay(TimesOfDay.DAY);
      }
      this.adjustToTimeOfDay();
    });

    const hKey = this.input.keyboard?.addKey('H');
    hKey?.on('down', () => {
      const date = CurrentDate;
      date.setHours(date.getHours() + 1);
      setCurrentDate(date);
      this.adjustToTimeOfDay();
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
