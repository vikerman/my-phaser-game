import { setNightShadowParams } from '../utils/shadowCalc';

export class ObjectBase extends Phaser.GameObjects.Sprite {
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
    // Create and update shadow sprites.
    // Create shadow for each light in the scene - if within the light radius.
    const worldPos = this.getWorldPoint();

    for (const light of this.scene.lights.getLights(
      this.scene.cameras.main,
    ) as never[]) {
      const l: Phaser.GameObjects.Light = (light as any).light;
      const objPos = new Phaser.Math.Vector2(worldPos);

      // Calculate angle between light and character. (Note: charPos is mutated.)
      objPos
        .add({ x: 0, y: this.displayHeight / 2 })
        .subtract({ x: l.x, y: l.y });
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
