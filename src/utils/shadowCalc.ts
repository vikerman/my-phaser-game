import { CurrentTime } from '../objects/time';

const SHADOW_SCALE_BASE_RADIUS = 64;
const SHADOW_ALPHA_MAX = 0.8;
const SHADOW_DAY_ALPHA_MAX = 0.8;
const SHADOW_FALLLOFF_RATE = 1.4;
const MIN_Y_SCALE = 1.1;
const MAX_Y_SCALE = 5;
const X_SCALE = 0.75;
const ANGLE_DIFF_THRESHOLD = 0.01;
const DISPLAY_HEIGHT_THRESHOLD = 32;
const TWILIGHT_MIN = 6;
const SHADOW_DAY_MIN = 7;
const SHADOW_DAY_MAX = 18;
const TWILIGHT_MAX = 19;
const SHADOW_ALPHA_TWLIGHT = 0;
const SUN_Y_SCALE_POW = 1.5;
const SUN_Y_SCALE_FACTOR = 4;
const LIGHT_SHADOW_IN_DAY_FACTOR = 0.2;
const LIGHT_SHADOW_IN_TWILIGHT_FACTOR = 0.4;

export function setSunShadowParams(shadowSprite: Phaser.GameObjects.Sprite) {
  // Set the Angle based on time of day
  // toFixed returns and string. The + converts it back to number.
  const hrs = CurrentTime.getHours() + CurrentTime.getMinutes() / 60;
  if (hrs < TWILIGHT_MIN || hrs > TWILIGHT_MAX) {
    shadowSprite.setVisible(false);
    return;
  } else {
    shadowSprite.setVisible(true);
  }

  // Goes from -1 tgo 1 based on time of day.
  let factor = ((hrs - TWILIGHT_MIN) / (TWILIGHT_MAX - TWILIGHT_MIN) - 0.5) * 2;
  let angle = (factor * Math.PI) / 2;
  shadowSprite.setRotation(angle);

  // Set the shadow length by time of the day.
  let yScale = Math.max(
    Math.min(
      Math.pow(Math.abs(factor), SUN_Y_SCALE_POW) * SUN_Y_SCALE_FACTOR,
      MAX_Y_SCALE,
    ),
    MIN_Y_SCALE,
  );
  shadowSprite.setScale(X_SCALE, Math.max(yScale, MIN_Y_SCALE));

  // Set alpha based on time of day.
  const alpha = Math.min(
    1 + SHADOW_ALPHA_TWLIGHT - Math.abs(factor),
    SHADOW_DAY_ALPHA_MAX,
  );
  shadowSprite.setAlpha(alpha * 0.5, alpha * 0.5, alpha, alpha);
}

/**
 * Calculate the shadow parameters (scale, rotation and alpha) of the shadow
 * sprite based on the light `l` and set it on the `shadowSprite`.
 * `dir` and `dist` are precalculated direction and distance vectore of the
 * sprite from the light.
 */
export function setNightShadowParams(
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
  if (Math.abs(shadowSprite.angle - angle) > ANGLE_DIFF_THRESHOLD) {
    shadowSprite.setRotation(angle);
  }

  // Set the length of shadow based on distance.
  let yScale = Math.min((dist * 2) / SHADOW_SCALE_BASE_RADIUS, MAX_Y_SCALE);
  if (shadowSprite.height > DISPLAY_HEIGHT_THRESHOLD) {
    yScale = Math.min((l.radius - dist) / shadowSprite.height, MAX_Y_SCALE);
  }
  shadowSprite.setScale(X_SCALE, Math.max(yScale, MIN_Y_SCALE));

  // In day time decrease the light shadow by 2.
  const hrs = CurrentTime.getHours() + CurrentTime.getMinutes() / 60;
  const dayTimeFactor =
    hrs >= SHADOW_DAY_MIN && hrs <= SHADOW_DAY_MAX
      ? LIGHT_SHADOW_IN_DAY_FACTOR
      : hrs >= TWILIGHT_MIN && hrs <= TWILIGHT_MAX
        ? LIGHT_SHADOW_IN_TWILIGHT_FACTOR
        : 1;

  // Set the strength based on distance
  const alpha1 =
    Math.max(SHADOW_ALPHA_MAX - dist / l.radius, 0) *
    l.intensity *
    dayTimeFactor;
  let alpha2 =
    Math.max(
      SHADOW_ALPHA_MAX -
        (dist + shadowSprite.displayHeight * SHADOW_FALLLOFF_RATE) / l.radius,
      0,
    ) *
    l.intensity *
    dayTimeFactor;
  shadowSprite.setAlpha(alpha2, alpha2, alpha1, alpha1);
}
