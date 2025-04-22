import { Scene } from 'phaser';

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

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-75);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(75);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-75);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(75);
    }
  }
}
