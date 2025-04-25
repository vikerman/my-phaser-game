import { Scene } from 'phaser';
import { AnimatedTiles } from '../plugins/AnimatedTiles';

const WALK_SPEED = 1;

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  player: Phaser.Physics.Matter.Sprite;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('Game');
  }

  preload() {
    // Plugins
    this.load.scenePlugin(
      'animatedTiles',
      AnimatedTiles,
      'animatedTiles',
      'animatedTiles',
    );
  }

  create() {
    this.camera = this.cameras.main;

    const map = this.make.tilemap({ key: 'map' });
    const tileset = map.addTilesetImage('forest');

    const ground = map.createLayer('ground', tileset!, 0, 0); // layer index, tileset, x, y
    const objects = map.createLayer('objects', tileset!, 0, 0); // layer index, tileset, x, y

    // Setup AnimatedTiles
    (this as any).animatedTiles.init(map);

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
    this.player = this.matter.add.sprite(100, 100, 'king', 0, {
      restitution: 0,
      shape: { type: 'rectangle', width: 20, height: 8 },
      render: { sprite: { xOffset: 0, yOffset: 0.4 } },
    });
    this.player.setFixedRotation();

    // Scene change
    this.input.once('pointerdown', () => {
      this.scene.start('GameOver');
    });

    // Setup camera.
    this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player);

    // Get all tile indices which are marked as objects.
    const objectTiles = new Map<number, number[]>();
    for (
      let i = tileset?.firstgid!;
      i <= tileset?.firstgid! + tileset?.total!;
      i++
    ) {
      const props = tileset?.getTileProperties(i) as {
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

    // Replace the object tiles with sprites...
    for (const origin of objectTiles.keys()) {
      const sprites = map.createFromTiles(
        objectTiles.get(origin)!,
        undefined,
        {
          useSpriteSheet: true,
        },
        this,
        this.camera,
        'objects',
      );
      for (const s of sprites!) {
        s.setDepth(s.getWorldPoint().y + s.height / 2 + s.height * origin);
      }
    }
  }

  update() {
    this.player.setDepth(this.player.getWorldPoint().y);
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-WALK_SPEED);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(WALK_SPEED);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-WALK_SPEED);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(WALK_SPEED);
    }
  }
}
