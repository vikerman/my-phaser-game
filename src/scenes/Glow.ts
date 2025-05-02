import { Scene } from 'phaser';

export class Glow extends Scene {
  constructor() {
    super('Glow');
  }

  create() {
    // const img = this.add.image(300, 100, 'logo');
    const img = this.add.circle(300, 300, 50, 0x00ffff);
    img.enableFilters();

    img.filters?.internal.addBlur(1, 2, 2, 1.2);

    const obj = { brightness: 0.75 };
    const cm = img.filters?.internal
      .addColorMatrix()
      .colorMatrix.brightness(obj.brightness);
    this.tweens.add({
      targets: obj,
      brightness: 1,
      yoyo: true,
      loop: -1,
      ease: 'sine.inout',
      duration: 500,
      onUpdate: function () {
        cm?.brightness(obj.brightness);
      },
    });

    const glow = img.filters?.internal.addGlow(0xffffff, 8, 0, 0, false, 5, 10);

    this.tweens.add({
      targets: glow,
      scale: 5,
      yoyo: true,
      loop: -1,
      ease: 'sine.inout',
      duration: 500,
    });
  }
}
