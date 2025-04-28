import { Scene } from 'phaser';

const WALK_SPEED = 1;
const DIAGONAL_SCALE = 1.0 / Math.SQRT2;

var DeepCopy = function (inObject: any) {
  var outObject: any;
  var value;
  var key;

  if (typeof inObject !== 'object' || inObject === null) {
    //  inObject is not an object
    return inObject;
  }

  //  Create an array or object to hold the values
  outObject = Array.isArray(inObject) ? [] : {};

  for (key in inObject) {
    value = inObject[key];

    //  Recursively (deep) copy for nested objects, including arrays
    outObject[key] = DeepCopy(value);
  }

  return outObject;
};

var GetFastValue = function (source: any, key: any, defaultValue: any) {
  var t = typeof source;

  if (!source || t === 'number' || t === 'string') {
    return defaultValue;
  } else if (source.hasOwnProperty(key) && source[key] !== undefined) {
    return source[key];
  } else {
    return defaultValue;
  }
};

var GetTilesWithin = function (
  tileX: number,
  tileY: number,
  width: number,
  height: number,
  filteringOptions: any,
  layer: Phaser.Tilemaps.LayerData,
) {
  if (tileX === undefined) {
    tileX = 0;
  }
  if (tileY === undefined) {
    tileY = 0;
  }
  if (width === undefined) {
    width = layer.width;
  }
  if (height === undefined) {
    height = layer.height;
  }
  if (!filteringOptions) {
    filteringOptions = {};
  }

  var isNotEmpty = GetFastValue(filteringOptions, 'isNotEmpty', false);
  var isColliding = GetFastValue(filteringOptions, 'isColliding', false);
  var hasInterestingFace = GetFastValue(
    filteringOptions,
    'hasInterestingFace',
    false,
  );

  // Clip x, y to top left of map, while shrinking width/height to match.
  if (tileX < 0) {
    width += tileX;
    tileX = 0;
  }

  if (tileY < 0) {
    height += tileY;
    tileY = 0;
  }

  // Clip width and height to bottom right of map.
  if (tileX + width > layer.width) {
    width = Math.max(layer.width - tileX, 0);
  }

  if (tileY + height > layer.height) {
    height = Math.max(layer.height - tileY, 0);
  }

  var results = [];

  for (var ty = tileY; ty < tileY + height; ty++) {
    for (var tx = tileX; tx < tileX + width; tx++) {
      var tile = layer.data[ty][tx];

      if (tile !== null) {
        if (isNotEmpty && tile.index === -1) {
          continue;
        }

        if (isColliding && !tile.collides) {
          continue;
        }

        if (hasInterestingFace && !tile.hasInterestingFace) {
          continue;
        }

        results.push(tile);
      }
    }
  }

  return results;
};

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  player: Phaser.Physics.Matter.Sprite;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  playerLight: Phaser.GameObjects.Light;

  constructor() {
    super('Game');
  }

  create() {
    this.camera = this.cameras.main;

    const map = this.make.tilemap({ key: 'map' });
    const tileset = map.addTilesetImage('forest');
    const objects1 = map.addTilesetImage('objects1');
    const trees = map.addTilesetImage('trees');

    const tilesets = [tileset!, objects1!, trees!];

    const ground = map.createLayer('ground', tilesets, 0, 0); // layer index, tileset, x, y
    // map.createLayer('shadow', tilesets, 0, 0); // layer index, tileset, x, y
    const objects = map.createLayer('objects', tilesets, 0, 0); // layer index, tileset, x, y

    ground.setLighting(true);

    // Add colliders from the tilemap layers
    ground?.setCollisionFromCollisionGroup();
    objects?.setCollisionFromCollisionGroup();
    objects?.setVisible(false);

    this.matter.world.convertTilemapLayer(
      ground as Phaser.Tilemaps.TilemapLayer,
    );
    this.matter.world.convertTilemapLayer(
      objects as Phaser.Tilemaps.TilemapLayer,
    );
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Debug toggle.
    this.matter.world.drawDebug = false;
    const keyObject = this.input.keyboard?.addKey('Space');
    keyObject?.on('down', () => {
      this.matter.world.drawDebug = !this.matter.world.drawDebug;
      this.matter.world.debugGraphic.clear();
    });

    // Handle keyboard input.
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Load the character sprite.
    this.player = this.matter.add.sprite(1000, 100, 'king', 0, {
      restitution: 0,
      shape: { type: 'rectangle', width: 20, height: 8 },
      render: { sprite: { xOffset: 0, yOffset: 0.4 } },
    });
    this.player.setFixedRotation();
    this.player.setLighting(true);
    // this.player.setTint(0x212245);

    // Scene change
    // this.input.once('pointerdown', () => {
    //   this.scene.start('GameOver');
    // });

    // Setup camera.
    this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true /* roundPixels */);

    // Lighting
    // Sunset
    // 0xfff474
    // 0xfd5e53
    // 0x3c3b5f
    // 0x191c5c

    this.lights.enable().setAmbientColor(0x191c5c);

    this.playerLight = this.lights.addLight(
      this.player.x - 20,
      this.player.y - 8,
      100,
      0xbb6611,
      1.5,
      25,
    );

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
      source: {
        x: 1000,
        y: 100,
        orientationX: 0,
        orientationY: 0,
        orientationZ: -1,
        refDistance: 20,
        follow: this.playerLight,
      },
    });
    fireSound.play();

    // Ambient night sound
    const nightSound = this.sound.add('night', {
      loop: true,
      volume: 0.1,
      source: {
        x: 1000,
        y: 100,
        orientationX: 0,
        orientationY: 0,
        orientationZ: -1,
        refDistance: 20,
        follow: this.playerLight,
      },
    });
    nightSound.play();

    // Waterfall sound
    const waterfall = this.sound.add('waterfall', {
      loop: true,
      volume: 0.5,
      source: {
        x: 950,
        y: 300,
        orientationX: 0,
        orientationY: 0,
        orientationZ: 1,
        distanceModel: 'inverse',
        refDistance: 100,
        rolloffFactor: 0.5,
        coneInnerAngle: 180,
        coneOuterAngle: 280,
        coneOuterGain: 1.0,
      },
    });
    waterfall.play();

    // Get all tile indices which are marked as objects.
    const objectTiles = new Map<number, number[]>();

    for (const ts of tilesets) {
      for (let i = ts?.firstgid!; i <= ts?.firstgid! + ts?.total!; i++) {
        const props = ts?.getTileProperties(i) as {
          object: boolean;
          origin: number;
        };
        if (props && props['object']) {
          const origin = props['origin'] || 0;
          const val = objectTiles.get(origin) || [];
          val.push(i);
          objectTiles.set(origin, val);
        }
      }
    }

    // Replace the object tiles with sprites...
    for (const origin of objectTiles.keys()) {
      // Current Phaser version with the bug.
      // const sprites = map.createFromTiles(
      //   objectTiles.get(origin)!,
      //   undefined,
      //   {
      //     useSpriteSheet: true,
      //   },
      //   this,
      //   this.camera,
      //   'objects',
      // );

      // Local fixed version.
      const sprites = this.createFromTiles(
        map,
        objectTiles.get(origin)!,
        {
          useSpriteSheet: true,
        },
        this,
        this.camera,
        'objects',
      );

      for (const s of sprites!) {
        let depth = 0;
        // If origin is <0 don't set Y based depth but give a fixed depth of 1.
        if (origin >= 0) {
          depth = s.getWorldPoint().y + s.height / 2 + s.height * origin;
        } else {
          depth = 1;
        }
        s.setDepth(depth);
        s.setLighting(true);
      }
    }
  }

  private createFromTiles(
    map: Phaser.Tilemaps.Tilemap,
    indexes: number[],
    spriteConfig: Phaser.Types.GameObjects.Sprite.SpriteConfig,
    scene: Phaser.Scene,
    camera: Phaser.Cameras.Scene2D.Camera,
    layer: string,
  ): Phaser.GameObjects.Sprite[] {
    if (!spriteConfig) {
      spriteConfig = {};
    }

    if (!Array.isArray(indexes)) {
      indexes = [indexes];
    }

    const layerObj = map.getLayer(layer);
    if (layerObj == null) {
      return [];
    }
    let tilemapLayer = layerObj.tilemapLayer;

    if (!scene) {
      scene = tilemapLayer.scene;
    }
    if (!camera) {
      camera = scene.cameras.main;
    }

    var layerWidth = layerObj.width;
    var layerHeight = layerObj.height;

    var tiles = GetTilesWithin(0, 0, layerWidth, layerHeight, null, layerObj);
    var sprites = [];
    var i;

    var mergeExtras = function (config: any, tile: any, properties: any[]) {
      for (var i = 0; i < properties.length; i++) {
        var property = properties[i];

        if (!config.hasOwnProperty(property)) {
          config[property] = tile[property];
        }
      }
    };

    for (i = 0; i < tiles.length; i++) {
      var tile = tiles[i];
      var config = DeepCopy(spriteConfig);

      if (indexes.indexOf(tile.index) !== -1) {
        var point = tilemapLayer.tileToWorldXY(
          tile.x,
          tile.y,
          undefined,
          camera,
        );

        config.x = point.x;
        config.y = point.y;

        mergeExtras(config, tile, [
          'rotation',
          'flipX',
          'flipY',
          'alpha',
          'visible',
          'tint',
        ]);

        if (!config.hasOwnProperty('origin')) {
          config.x += tile.width * 0.5;
          config.y += tile.height * 0.5;
        }

        if (config.hasOwnProperty('useSpriteSheet')) {
          const ts = tile.tileset!;
          config.key = ts.image;
          config.frame = tile.index - ts.firstgid;
        }

        sprites.push(scene.make.sprite(config));
      }
    }

    return sprites;
  }

  update() {
    this.player.setDepth(this.player.getWorldPoint().y);
    this.player.setVelocity(0);

    const diagonal =
      (this.cursors.left.isDown || this.cursors.right.isDown) &&
      (this.cursors.up.isDown || this.cursors.down.isDown);
    let scale = 1.0;
    if (diagonal) {
      scale = DIAGONAL_SCALE;
    }

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-WALK_SPEED * scale);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(WALK_SPEED * scale);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-WALK_SPEED * scale);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(WALK_SPEED * scale);
    }

    this.playerLight.x = this.player.x - 20;
    this.playerLight.y = this.player.y - 8;

    this.sound.listenerPosition.set(this.player.x, this.player.y);
  }
}
