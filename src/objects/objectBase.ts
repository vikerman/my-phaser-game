const SHADOW_SCALE_BASE_RADIUS = 64;
const SHADOW_ALPHA_MAX = 0.9;
const SHADOW_FALLLOFF_RATE = 1.4;
const MIN_Y_SCALE = 1.5;
const DISPLAY_HEIGHT_THRESHOLD = 32;

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
          .setOrigin(0.5, 0.95)
          .setTint(0x000000)
          .setLighting(true);
        shadowSprite.depth = this.depth - 0.1;
        this.shadowSprites.set(l, shadowSprite);
      }

      // Set the Angle based on direction from light.
      // toFixed returns and string. The + converts it back to number.
      let angle = +Math.acos(-dir.y).toFixed(3);
      if (dir.x < 0) {
        angle = -angle;
      }
      shadowSprite.setRotation(angle);

      // Set the length of shadow based on distance.
      let yScale = dist / SHADOW_SCALE_BASE_RADIUS;
      if (this.displayHeight > DISPLAY_HEIGHT_THRESHOLD) {
        yScale = (l.radius - dist) / this.displayHeight;
      }
      shadowSprite.setScale(1, Math.max(yScale, MIN_Y_SCALE));

      // Set the strength based on distance
      const alpha1 =
        (Math.max(SHADOW_ALPHA_MAX - dist / l.radius, 0) * l.intensity) / 2;
      let alpha2 =
        (Math.max(
          SHADOW_ALPHA_MAX -
            (dist + shadowSprite.displayHeight * SHADOW_FALLLOFF_RATE) /
              l.radius,
          0,
        ) *
          l.intensity) /
        2;
      shadowSprite.setAlpha(alpha2, alpha2, alpha1, alpha1);

      // Set the frame
      shadowSprite.frame = this.frame;
    }
  }
}
