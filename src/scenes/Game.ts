import { Scene } from 'phaser';

const WALK_SPEED = 75;

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('Game');
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBounds(0, 0, 4096, 4096);

    const map = this.make.tilemap({ key: 'map' });
    const tileset = map.addTilesetImage('forest');

    const ground = map.createLayer('ground', tileset!, 0, 0); // layer index, tileset, x, y
    const objects = map.createLayer('objects', tileset!, 0, 0); // layer index, tileset, x, y

    // Add colliders from the tilemap layers
    ground?.setCollisionFromCollisionGroup();
    objects?.setCollisionFromCollisionGroup();

    // Handle keyboard input.
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Load the character sprite.
    this.player = this.physics.add.sprite(100, 100, 'king', 0);
    this.player.setCollideWorldBounds(true);
    this.player.setBodySize(20, 8);
    this.player.setOffset(6, 24);

    this.input.once('pointerdown', () => {
      this.scene.start('GameOver');
    });

    // Setup collision between player and tilemap layers
    this.physics.add.collider(this.player, ground!);
    this.physics.add.collider(this.player, objects!);
  }

  update() {
    this.player.setVelocity(0);

    const hor = this.cursors.left.isDown || this.cursors.right.isDown;
    const ver = this.cursors.up.isDown || this.cursors.down.isDown;

    // Adjust scale if moving horizontally so that magnitude is maintained.
    let scale = 1.0;
    if (hor && ver) {
      scale = 1.0 / Math.sqrt(2);
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
  }
}
