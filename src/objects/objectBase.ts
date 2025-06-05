import { setNightShadowParams, setSunShadowParams } from '../utils/shadowCalc';

export class ObjectBase extends Phaser.GameObjects.Sprite {
  private sunShadow: Phaser.GameObjects.Sprite;
  private readonly shadowSprites = new Map<
    Phaser.GameObjects.Light,
    Phaser.GameObjects.Sprite
  >();
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, '');
    scene.events.on('update', () => {
      this.update();
    });
  }

  override update() {
    const worldPos = this.getWorldPoint();

    // Create the shadow created by sun if not present.
    if (this.sunShadow == null) {
      this.sunShadow = this.scene.add
        .sprite(
          worldPos.x,
          worldPos.y + this.displayHeight / 2 - 6,
          this.texture,
          0,
        )
        .setOrigin(0.5, 0.97)
        .setLighting(true)
        .setTintFill(0x000000);
      this.sunShadow.depth = this.depth - 0.1;
    }

    // Update shadow created by sun.
    setSunShadowParams(this.sunShadow);
    this.sunShadow.frame = this.frame;

    // Create and update shadow sprites.
    // Create shadow for each light in the scene - if within the light radius.
    for (const light of this.scene.lights.getLights(
      this.scene.cameras.main,
    ) as never[]) {
      const l: Phaser.GameObjects.Light = (light as any).light;
      const objPos = new Phaser.Math.Vector2(worldPos);

      // This is the sun. Skip it.
      if (l.radius == this.scene.sys.canvas.width * 2) {
        continue;
      }

      // Calculate angle between light and character. (Note: charPos is mutated.)
      objPos
        .add({ x: 0, y: this.displayHeight / 2 })
        .subtract({ x: l.x + l.displayOriginX, y: l.y + l.displayOriginY });
      const dist = objPos.length();
      let dir = objPos.normalize();
      let shadowSprite = this.shadowSprites.get(l);
      if (!l.visible || dist > l.radius) {
        if (shadowSprite != null) {
          this.shadowSprites.delete(l);
          shadowSprite.destroy();
        }
        continue;
      }

      if (shadowSprite == null) {
        shadowSprite = this.scene.add
          .sprite(
            worldPos.x,
            worldPos.y + this.displayHeight / 2 - 6,
            this.texture,
            0,
          )
          .setOrigin(0.5, 0.97)
          .setLighting(true)
          .setTintFill(0x000000);
        shadowSprite.depth = this.depth - 0.1;
        this.shadowSprites.set(l, shadowSprite);
      }

      // Use the utility function shared with all objects casting a shadow.
      setNightShadowParams(l, shadowSprite, dir, dist);

      // Set the frame
      shadowSprite.frame = this.frame;
    }
    // Remove lights that are no longer visible.
    for (const l of this.shadowSprites.keys()) {
      if (!l.visible) {
        const shadowSprite = this.shadowSprites.get(l);
        if (shadowSprite != null) {
          shadowSprite.destroy();
        }
        this.shadowSprites.delete(l);
      }
    }
  }
}
