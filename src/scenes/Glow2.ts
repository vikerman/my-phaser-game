import { Scene } from 'phaser';

export class Glow2 extends Scene {
  constructor() {
    super('Glow2');
  }

  create() {
    // const img = this.add.image(300, 100, 'logo');
    const img = this.add.circle(300, 300, 50, 0x00ffff);
    img.enableFilters();

    // const obj = { brightness: 1 };
    // const cm = img.filters?.internal
    //   .addColorMatrix()
    //   .colorMatrix.brightness(obj.brightness);
    // this.tweens.add({
    //   targets: obj,
    //   brightness: 1.5,
    //   yoyo: true,
    //   loop: -1,
    //   ease: 'sine.inout',
    //   duration: 1000,
    //   onUpdate: function () {
    //     cm?.brightness(obj.brightness);
    //   },
    // });

    const parallelFilters = img.filters?.internal.addParallelFilters()!;
    parallelFilters.top.addThreshold(0.5, 1);
    parallelFilters.top.addBlur(2);
    parallelFilters.blend.blendMode = Phaser.BlendModes.ADD;
    parallelFilters.blend.amount = 1;

    this.tweens.add({
      targets: parallelFilters.blend,
      amount: 2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
