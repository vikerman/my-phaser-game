const SHADOW_SCALE_BASE_RADIUS = 64;
const SHADOW_ALPHA_MAX = 0.85;
const SHADOW_FALLLOFF_RATE = 1.4;
const MIN_Y_SCALE = 1;
const X_SCALE = 0.75;
const DISPLAY_HEIGHT_THRESHOLD = 32;

/**
 * Calculate the shadow parameters (scale, rotation and alpha) of the shadow
 * sprite based on the light `l` and set it on the `shadowSprite`.
 * `dir` and `dist` are precalculated direction and distance vectore of the
 * sprite from the light.
 */
export function setShadowParams(
  l: Phaser.GameObjects.Light,
  shadowSprite: Phaser.GameObjects.Sprite,
  dir: Phaser.Math.Vector2,
  dist: number,
) {
  // Set the Angle based on direction from light.
  // toFixed returns and string. The + converts it back to number.
  let angle = +Math.acos(-dir.y).toFixed(3);
  if (dir.x < 0) {
    angle = -angle;
  }
  if (Math.abs(shadowSprite.angle - angle) > 0.01) {
    shadowSprite.setRotation(angle);
  }

  // Set the length of shadow based on distance.
  let yScale = dist / SHADOW_SCALE_BASE_RADIUS;
  if (shadowSprite.height > DISPLAY_HEIGHT_THRESHOLD) {
    yScale = Math.min((l.radius - dist) / shadowSprite.height, 3);
  }
  shadowSprite.setScale(X_SCALE, Math.max(yScale, MIN_Y_SCALE));

  // Set the strength based on distance
  const alpha1 = Math.max(SHADOW_ALPHA_MAX - dist / l.radius, 0) * l.intensity;
  let alpha2 =
    Math.max(
      SHADOW_ALPHA_MAX -
        (dist + shadowSprite.displayHeight * SHADOW_FALLLOFF_RATE) / l.radius,
      0,
    ) * l.intensity;
  shadowSprite.setAlpha(alpha2, alpha2, alpha1, alpha1);
}
