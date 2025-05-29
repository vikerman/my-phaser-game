import { Scene } from 'phaser';
import { Character } from '../objects/character';
import { createObjectsFromLayer } from '../utils/objectLayer';
import { CurrentTime, setCurrentTime } from '../objects/time';

export type SoundType =
  | Phaser.Sound.NoAudioSound
  | Phaser.Sound.HTML5AudioSound
  | Phaser.Sound.WebAudioSound;

// Lighting
// Sunrise/Sunset
// 0xfff474
// 0xfd5e53
// 0x3c3b5f
// 0x191c5c
// Moonlight
// 0x04084f
// Bright
// 0xaaaaaa

const GLOBAL_SETTINGS = [
  // Keep sorted by time.
  {
    time: 3,
    ambient: 0x04084f,
    saturate: -0.4,
    brightness: 0.8,
    threshold1: 0.05,
    threshold2: 0.5,
    bloomEdge1: 0.03,
    bloomEdge2: 0.8,
    bloomAmount: 0.9,
    vignetteAlpha: 0.8,
  },
  {
    time: 7,
    ambient: 0xe08d3c,
    saturate: -0.2,
    brightness: 0.9,
    threshold1: 0.05,
    threshold2: 0.9,
    bloomEdge1: 0.05,
    bloomEdge2: 0.7,
    bloomAmount: 0.4,
    nightSound: false,
    vignetteAlpha: 0.5,
  },
  {
    time: 8,
    ambient: 0xfff474,
    saturate: -0.2,
    brightness: 0.8,
    threshold1: 0.05,
    threshold2: 0.9,
    bloomEdge1: 0.1,
    bloomEdge2: 0.9,
    bloomAmount: 0.3,
    vignetteAlpha: 0.5,
  },
  {
    time: 12,
    ambient: 0xaaaaaa,
    saturate: -0.3,
    brightness: 1.1,
    threshold1: 0.05,
    threshold2: 0.9,
    bloomEdge1: 0.1,
    bloomEdge2: 0.9,
    bloomAmount: 0.2,
    vignetteAlpha: 0.5,
  },
  {
    time: 15,
    ambient: 0xaaaaaa,
    saturate: -0.3,
    brightness: 1.1,
    threshold1: 0.05,
    threshold2: 0.9,
    bloomEdge1: 0.1,
    bloomEdge2: 0.9,
    bloomAmount: 0.2,
    vignetteAlpha: 0.5,
  },
  {
    time: 17,
    ambient: 0xaaaaaa,
    saturate: -0.3,
    brightness: 1,
    threshold1: 0.05,
    threshold2: 0.9,
    bloomEdge1: 0.1,
    bloomEdge2: 0.85,
    bloomAmount: 0.4,
    vignetteAlpha: 0.5,
  },
  {
    time: 18,
    ambient: 0xe08d3c,
    saturate: -0.3,
    brightness: 0.9,
    threshold1: 0.05,
    threshold2: 0.8,
    bloomEdge1: 0.06,
    bloomEdge2: 0.8,
    bloomAmount: 0.5,
    nightSound: true,
    vignetteAlpha: 0.5,
  },
  {
    time: 19,
    ambient: 0x1e2208,
    saturate: -0.3,
    brightness: 0.9,
    threshold1: 0.05,
    threshold2: 0.8,
    bloomEdge1: 0.03,
    bloomEdge2: 0.8,
    bloomAmount: 0.8,
    vignetteAlpha: 0.6,
  },
  {
    time: 20,
    ambient: 0x191c5c,
    saturate: -0.4,
    brightness: 0.9,
    threshold1: 0.05,
    threshold2: 0.7,
    bloomEdge1: 0.03,
    bloomEdge2: 0.8,
    bloomAmount: 0.9,
    vignetteAlpha: 0.8,
  },
  {
    time: 22,
    ambient: 0x04084f,
    saturate: -0.4,
    brightness: 0.8,
    threshold1: 0.05,
    threshold2: 0.5,
    bloomEdge1: 0.03,
    bloomEdge2: 0.8,
    bloomAmount: 0.9,
    vignetteAlpha: 0.8,
  },
];

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  player: Character;
  fixedLight: Phaser.GameObjects.Light;
  waterfall: SoundType;
  nightSound: SoundType;
  waterfallPos: Phaser.Math.Vector2;
  sprites: Phaser.GameObjects.Sprite[];
  vignette: Phaser.GameObjects.Image;
  colorMatrix: Phaser.Display.ColorMatrix;
  threshold?: Phaser.Filters.Threshold;
  hKey: Phaser.Input.Keyboard.Key;
  gKey: Phaser.Input.Keyboard.Key;
  bloomFilters: Phaser.Filters.ParallelFilters;
  bloomThreshold: Phaser.Filters.Threshold;

  constructor() {
    super('Game');
  }

  static getInter(
    field: string,
    curr: Record<string, any>,
    next: Record<string, any>,
    factor: number,
  ) {
    let val;
    if (field == 'ambient') {
      const colorOut = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(curr[field]),
        Phaser.Display.Color.ValueToColor(next[field]),
        1,
        factor,
      );
      val = colorOut.color;
      // console.log(`${field}: ${val.toString(16)}`);
    } else {
      val = curr[field] + (next[field] - curr[field]) * factor;
      // console.log(`${field}: ${val}`);
    }
    // if (field == 'ambient') {
    //   console.log(factor);
    // }
    // if (field === 'bloomAmount') {
    //   console.log('\n');
    // }
    return val;
  }

  private adjustToTimeOfDay() {
    const date = CurrentTime;
    const hrs = date.getHours() + date.getMinutes() / 60;

    let curr = GLOBAL_SETTINGS[GLOBAL_SETTINGS.length - 1];
    let next = GLOBAL_SETTINGS[0];
    let i = 0;
    for (const s of GLOBAL_SETTINGS) {
      if (hrs > s.time) {
        curr = s;
        const nextIndex = i < GLOBAL_SETTINGS.length - 1 ? i + 1 : 0;
        next = GLOBAL_SETTINGS[nextIndex];
        if (hrs <= next.time) {
          break;
        }
      }
      i++;
    }
    let totalDiff = next.time - curr.time;
    if (totalDiff < 0) {
      totalDiff += 24;
    }
    let diff = hrs - curr.time;
    if (diff < 0) {
      diff += 24;
    }
    const factor = diff / totalDiff;

    this.lights.setAmbientColor(Game.getInter('ambient', curr, next, factor));

    if (curr.nightSound != null) {
      if (curr.nightSound && !this.nightSound.isPlaying) {
        this.nightSound.play();
      }
      if (!curr.nightSound && !this.nightSound.isPaused) {
        this.nightSound.pause();
      }
    }

    this.colorMatrix
      .reset()
      .saturate(Game.getInter('saturate', curr, next, factor))
      .brightness(Game.getInter('brightness', curr, next, factor), true);

    if (this.threshold != null) {
      this.threshold.destroy();
    }
    this.threshold = this.camera.filters.internal.addThreshold(
      Game.getInter('threshold1', curr, next, factor),
      Game.getInter('threshold2', curr, next, factor),
    );
    this.bloomThreshold.setEdge(
      Game.getInter('bloomEdge1', curr, next, factor),
      Game.getInter('bloomEdge2', curr, next, factor),
    );
    this.bloomFilters.blend.amount = Game.getInter(
      'bloomAmount',
      curr,
      next,
      factor,
    );
    this.vignette.setAlpha(Game.getInter('vignetteAlpha', curr, next, factor));
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
    const color = 0xff9060;
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
    );
    this.fixedLight.setDisplayOrigin(0, lightHeight);

    const tween2 = this.tweens.add({
      targets: this.fixedLight,
      ease: 'Sine.easeInOut',
      intensity: 0.7,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      onRepeat: () => {
        tween2.duration = 100 + Math.random() * 900;
      },
    });

    // Sounds

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
    this.vignette.setAlpha(0.1);
    this.vignette.depth = 1000000;

    // Scene PostEffects.
    this.colorMatrix = this.camera.filters.internal
      .addColorMatrix()
      .colorMatrix.hue(20)
      .saturate(-0.3)
      .brightness(1.1, true);

    this.camera.filters.internal.addTiltShift(0.6, 2, 0, 0, 0.4, 0.9);

    // Blooom!!!
    this.bloomFilters = this.camera.filters.internal.addParallelFilters()!;
    this.bloomThreshold = this.bloomFilters.top.addThreshold(0.05, 0.9);
    this.bloomFilters.top.addBlur(2);
    this.bloomFilters.blend.blendMode = Phaser.BlendModes.ADD;
    this.bloomFilters.blend.amount = 1;

    // Set the time of day to match local time.
    setCurrentTime(new Date());

    // Setup key for daytime toggle.
    const tKey = this.input.keyboard?.addKey('T');
    tKey?.on('down', () => {
      const hrs = CurrentTime.getHours();
      if (hrs >= 6 && hrs <= 18) {
        const dt = new Date();
        dt.setHours(21);
        setCurrentTime(dt);
      } else {
        const dt = new Date();
        dt.setHours(7);
        setCurrentTime(dt);
      }
    });

    this.events.on('postupdate', () => {
      this.postUpdate();
    });

    this.hKey = this.input.keyboard?.addKey('H')!;
    this.gKey = this.input.keyboard?.addKey('G')!;
  }

  override update() {
    this.adjustToTimeOfDay();
  }

  postUpdate() {
    const playerPos = this.player.getPosition();
    const dist = this.waterfallPos.distance(playerPos);
    if (dist != 0) {
      let vol = Math.max(0, Math.min(1, 50 / dist));
      this.waterfall.setVolume(vol);
    }

    // TODO: Extract this to a util function
    const gps = navigator.getGamepads();
    // Get the first Gamepad that is not null
    let gp: Gamepad | null = null;
    for (const g of gps) {
      if (g != null) {
        gp = g;
      }
    }

    if (
      this.input.keyboard?.checkDown(this.hKey, 20) ||
      gp?.buttons[7].pressed
    ) {
      const newTime = new Date(CurrentTime.getTime() + 2 * 60 * 1000);
      // console.log(newTime.getHours(), newTime.getMinutes());
      setCurrentTime(newTime);
    } else if (
      this.input.keyboard?.checkDown(this.gKey, 20) ||
      gp?.buttons[6].pressed
    ) {
      const newTime = new Date(CurrentTime.getTime() - 2 * 60 * 1000);
      // console.log(newTime.getHours(), newTime.getMinutes());
      setCurrentTime(newTime);
    }

    this.vignette.x = this.camera.worldView.centerX;
    this.vignette.y = this.camera.worldView.centerY;
  }
}
