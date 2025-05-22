import { setNightShadowParams, setSunShadowParams } from '../utils/shadowCalc';
import { isSafari } from '../utils/useragent';

/**
 * A Character class to hold everything related to a character.
 */
const WALK_SPEED = 1.2;
const DIAGONAL_SCALE = 1.0 / Math.SQRT2;
const SENSOR_WIDTH = 2;
const SPRITE_Y_ADJUST = 3;
const JOYSTICK_THRESHOLD = 0.3;

let USE_BITMAP_MASK = !isSafari() && false;

export const AnimationModes = {
  NPC: 'NPC',
} as const;

export type AnimationMode =
  (typeof AnimationModes)[keyof typeof AnimationModes];

type Direction = 'up' | 'left' | 'down' | 'right';

export class Character {
  // Field
  private readonly scene: Phaser.Scene;
  private readonly idleFrames = {
    down: 0,
    right: 4,
    up: 8,
    left: 12,
  };
  private lastDir: Direction = 'down';
  private feetWidth: number;
  private feetHeight: number;
  private readonly container:
    | Phaser.Physics.Matter.Sprite
    | Phaser.Physics.Matter.Image
    | Phaser.GameObjects.GameObject;
  private readonly shadowSprites = new Map<
    Phaser.GameObjects.Light,
    Phaser.GameObjects.Sprite
  >();
  private readonly sunShadow: Phaser.GameObjects.Sprite;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private playerLight: Phaser.GameObjects.Light;
  private readonly key: string;
  private cursor: Phaser.Types.Input.Keyboard.CursorKeys | undefined =
    undefined;
  private hitBox: MatterJS.BodyType;
  private obstructingObjects = new Map<
    Phaser.GameObjects.Sprite,
    Phaser.GameObjects.Sprite
  >();

  // Sensors to prevent jitter while walking.
  private east = 0;
  private west = 0;
  private north = 0;
  private south = 0;

  public isMainPlayer;

  // Methods
  constructor(
    scene: Phaser.Scene,
    key: string,
    playerConfig?: {
      mainPlayer?: boolean;
      x?: number;
      y?: number;
      feetWidth?: number;
      feetHeight?: number;
      animationMode?: AnimationMode;
    },
  ) {
    this.scene = scene;
    this.isMainPlayer = playerConfig?.mainPlayer ?? false;
    this.feetWidth = playerConfig?.feetWidth ?? 20;
    this.feetHeight = playerConfig?.feetHeight ?? 8;
    this.key = key;
    const animationMode = playerConfig?.animationMode ?? AnimationModes.NPC;

    // Create animation keys for the spritesheet.
    this.createAnimFrames(scene, animationMode);

    this.sprite = scene.add
      .sprite(0, -SPRITE_Y_ADJUST /** TODO: WHY?? **/, key, 0)
      .setLighting(true);

    // Setup a copond body of the main feet collider and various hitbox sensors
    const Bodies = (Phaser.Physics.Matter as any).Matter
      .Bodies as Phaser.Physics.Matter.Factory;

    this.hitBox = Bodies.rectangle(
      0,
      0,
      this.sprite.displayWidth,
      this.sprite.displayHeight,
      {
        isSensor: true,
        label: 'character_hitbox',
      },
    );
    const rect = Bodies.rectangle(
      0,
      this.sprite.displayHeight / 2 - this.feetHeight / 2 - 1,
      this.feetWidth,
      this.feetHeight,
      {
        restitution: 0,
        label: 'character',
      },
    );

    const south = Bodies.rectangle(
      0,
      this.sprite.displayHeight / 2 + SENSOR_WIDTH / 4 - 1,
      this.feetWidth - 2,
      SENSOR_WIDTH,
      {
        isSensor: true,
        label: 'character_s',
      },
    );

    const west = Bodies.rectangle(
      -this.feetWidth / 2 - SENSOR_WIDTH / 4,
      this.sprite.displayHeight / 2 - this.feetHeight / 2 - 1,
      SENSOR_WIDTH,
      this.feetHeight - 2,
      {
        isSensor: true,
        label: 'character_w',
      },
    );

    const east = Bodies.rectangle(
      this.feetWidth / 2 + SENSOR_WIDTH / 4,
      this.sprite.displayHeight / 2 - this.feetHeight / 2 - 1,
      SENSOR_WIDTH,
      this.feetHeight - 2,
      {
        isSensor: true,
        label: 'character_e',
      },
    );

    const north = Bodies.rectangle(
      0,
      this.sprite.displayHeight / 2 - this.feetHeight - SENSOR_WIDTH / 2,
      this.feetWidth - 2,
      SENSOR_WIDTH,
      {
        isSensor: true,
        label: 'character_n',
      },
    );

    const compoundBody = (
      (Phaser.Physics.Matter as any).Matter.Body as any
    ).create({
      parts: [this.hitBox, rect, west, east, south, north],
      inertia: Infinity,
    });

    const container = scene.add.container(0, 0, [this.sprite]);
    container.setSize(this.sprite.displayWidth, this.sprite.displayHeight);
    this.container = scene.matter.add.gameObject(container);

    (this.container as Phaser.Physics.Matter.Sprite).setFixedRotation();
    (this.container as Phaser.Physics.Matter.Sprite).setExistingBody(
      compoundBody,
    );
    (this.container as Phaser.Physics.Matter.Sprite).setPosition(
      playerConfig?.x ?? 0,
      playerConfig?.y ?? 0,
    );

    this.hitBox.onCollideCallback = (pair: MatterJS.IPair) => {
      this.onCollide(pair);
    };

    this.hitBox.onCollideActiveCallback = (pair: MatterJS.IPair) => {
      this.onCollide(pair);
    };

    this.hitBox.onCollideEndCallback = (pair: MatterJS.IPair) => {
      this.onCollideEnd(pair);
    };

    // Directional sensors
    north.onCollideCallback = (pair: MatterJS.IPair) => {
      this.onSensorCollide(pair, 'n');
    };
    north.onCollideEndCallback = (pair: MatterJS.IPair) => {
      this.onSensorCollideEnd(pair, 'n');
    };

    east.onCollideCallback = (pair: MatterJS.IPair) => {
      this.onSensorCollide(pair, 'e');
    };
    east.onCollideEndCallback = (pair: MatterJS.IPair) => {
      this.onSensorCollideEnd(pair, 'e');
    };

    west.onCollideCallback = (pair: MatterJS.IPair) => {
      this.onSensorCollide(pair, 'w');
    };
    west.onCollideEndCallback = (pair: MatterJS.IPair) => {
      this.onSensorCollideEnd(pair, 'w');
    };

    south.onCollideCallback = (pair: MatterJS.IPair) => {
      this.onSensorCollide(pair, 's');
    };
    south.onCollideEndCallback = (pair: MatterJS.IPair) => {
      this.onSensorCollideEnd(pair, 's');
    };

    // Create shadow sprite for day time.
    this.sunShadow = this.scene.add
      .sprite(0, SPRITE_Y_ADJUST + 5, this.key, 0)
      .setOrigin(0.5, 1)
      .setLighting(true)
      .setTintFill(0x000000);
    (this.container as Phaser.GameObjects.Container)
      .add(this.sunShadow)
      .moveBelow(this.sunShadow, this.sprite);

    // Add a player Light
    this.playerLight = scene.lights.addLight(
      this.sprite.getWorldPoint().x - 16,
      this.sprite.getWorldPoint().y + 16,
      256,
      0xffa500,
      1,
      30,
    );
    const tween = scene.tweens.add({
      targets: this.playerLight,
      ease: 'Bounce',
      intensity: 0.8,
      yoyo: true,
      repeat: -1,
      duration: 1000,
      onRepeat: () => {
        tween.duration = 100 + Math.random() * 900;
      },
    });
    const keyObject = scene.input.keyboard?.addKey('l');
    keyObject?.on('down', () => {
      this.playerLight.setVisible(!this.playerLight.visible);
    });

    scene.events.on('postupdate', () => {
      this.update();
    });
  }

  public setIsMainPlayer(val: boolean): this {
    this.isMainPlayer = val;
    return this;
  }

  public mainObject(): Phaser.GameObjects.GameObject {
    return this.container;
  }

  public getPosition(): Phaser.Math.Vector2 {
    return this.sprite.getWorldPoint();
  }

  public getDepth() {
    return this.sprite.depth;
  }

  public getBounds() {
    return this.sprite.getBounds();
  }

  private createAnimFrames(scene: Phaser.Scene, animationMode: AnimationMode) {
    switch (animationMode) {
      case AnimationModes.NPC:
        // DOWN
        scene.anims.create({
          key: this.key + '_down',
          frames: scene.anims.generateFrameNumbers(this.key, {
            frames: [0, 1, 2, 3],
          }),
          frameRate: 8,
          repeat: -1,
        });
        // RIGHT
        scene.anims.create({
          key: this.key + '_right',
          frames: scene.anims.generateFrameNumbers(this.key, {
            frames: [4, 5, 6, 7],
          }),
          frameRate: 8,
          repeat: -1,
        });
        // UP
        scene.anims.create({
          key: this.key + '_up',
          frames: scene.anims.generateFrameNumbers(this.key, {
            frames: [8, 9, 10, 11],
          }),
          frameRate: 8,
          repeat: -1,
        });
        // LEFT
        scene.anims.create({
          key: this.key + '_left',
          frames: scene.anims.generateFrameNumbers(this.key, {
            frames: [12, 13, 14, 15],
          }),
          frameRate: 8,
          repeat: -1,
        });
        break;
    }
  }

  private onCollide(pair: MatterJS.IPair) {
    const bodyA = pair.bodyA as MatterJS.BodyType;
    const bodyB = pair.bodyB as MatterJS.BodyType;

    const other = bodyA.label == 'character_hitbox' ? bodyB : bodyA;

    if (other.label == 'object_sensor' && other.gameObject != null) {
      if (
        other.gameObject instanceof Phaser.GameObjects.Sprite &&
        other.gameObject.depth >= this.sprite.depth
      ) {
        if (this.obstructingObjects.has(other.gameObject)) {
          return;
        }

        const pos = this.sprite.getWorldPoint();

        if (USE_BITMAP_MASK) {
          const occlusionSprite = this.scene.add.sprite(
            pos.x,
            pos.y,
            this.key,
            0,
          );
          occlusionSprite.depth = other.gameObject.depth + 1;
          occlusionSprite.setLighting(true);
          occlusionSprite.setTintFill(0x111111);
          occlusionSprite.enableFilters();
          (occlusionSprite.filters as any).external.addMask(other.gameObject);

          this.obstructingObjects.set(other.gameObject, occlusionSprite);
        } else {
          if (this.obstructingObjects.size == 0) {
            // Create the occlusion sprite since once doesn't exist already.
            const occlusionSprite = this.scene.add.sprite(
              pos.x,
              pos.y,
              this.key,
              0,
            );
            occlusionSprite.depth = other.gameObject.depth + 1;
            occlusionSprite.setLighting(true);
            occlusionSprite.setAlpha(0.4);
            occlusionSprite.setBlendMode(Phaser.BlendModes.XOR);
            this.obstructingObjects.set(other.gameObject, occlusionSprite);
          } else {
            // Set the existing Sprite
            const occlusionSprite = this.obstructingObjects
              .values()
              .next().value!;

            // Use the maximum depth!
            if (other.gameObject.depth + 1 > occlusionSprite.depth) {
              occlusionSprite.depth = other.gameObject.depth + 1;
            }
            this.obstructingObjects.set(other.gameObject, occlusionSprite);
          }
        }
      }
    }
  }

  private onCollideEnd(pair: MatterJS.IPair) {
    const bodyA = pair.bodyA as MatterJS.BodyType;
    const bodyB = pair.bodyB as MatterJS.BodyType;

    const other = bodyA.label == 'character_hitbox' ? bodyB : bodyA;

    if (
      other.label == 'object_sensor' &&
      other.gameObject != null &&
      other.gameObject instanceof Phaser.GameObjects.Sprite
    ) {
      const occlusionSprite = this.obstructingObjects.get(other.gameObject);
      if (USE_BITMAP_MASK) {
        if (occlusionSprite != null) {
          occlusionSprite.destroy();
        }
      } else {
        // Destroy if it's the last element.
        if (this.obstructingObjects.size == 1) {
          if (occlusionSprite != null) {
            occlusionSprite.destroy();
          }
        }
      }
      this.obstructingObjects.delete(other.gameObject);
    }
  }

  private onSensorCollide(pair: MatterJS.IPair, dir: string) {
    const bodyA = pair.bodyA as MatterJS.BodyType;
    const bodyB = pair.bodyB as MatterJS.BodyType;

    const other = bodyA.label == 'character_' + dir ? bodyB : bodyA;
    if (other.isStatic && !other.isSensor) {
      switch (dir) {
        case 'n':
          this.north++;
          break;
        case 'e':
          this.east++;
          break;
        case 'w':
          this.west++;
          break;
        case 's':
          this.south++;
          break;
      }
    }
  }

  private onSensorCollideEnd(pair: MatterJS.IPair, dir: string) {
    const bodyA = pair.bodyA as MatterJS.BodyType;
    const bodyB = pair.bodyB as MatterJS.BodyType;

    const other = bodyA.label == 'character_' + dir ? bodyB : bodyA;
    if (other.isStatic && !other.isSensor) {
      switch (dir) {
        case 'n':
          if (this.north > 0) this.north--;
          break;
        case 'e':
          if (this.east > 0) this.east--;
          break;
        case 'w':
          if (this.west > 0) this.west--;
          break;
        case 's':
          if (this.south > 0) this.south--;
          break;
      }
    }
  }

  private updateAnimation(moving: boolean, dir: Direction | null) {
    if (moving && dir != null) {
      this.sprite.play(`${this.key}_${dir}`, true);
    } else {
      this.sprite.stop();
      this.sprite.setFrame(this.idleFrames[this.lastDir]);
    }
  }

  private processInput() {
    if (!this.isMainPlayer) {
      return;
    }

    // Get Cursor keys if keyboard is present.
    if (this.cursor == null) {
      this.cursor = this.sprite.scene.input.keyboard?.createCursorKeys();
    }
    if (this.cursor == null) {
      return;
    }

    const [gp] = navigator.getGamepads();
    let walkVector = new Phaser.Math.Vector2();

    const left =
      this.cursor.left.isDown ||
      (gp?.axes[0] && gp?.axes[0] < -JOYSTICK_THRESHOLD);
    const right =
      this.cursor.right.isDown ||
      (gp?.axes[0] && gp?.axes[0] > JOYSTICK_THRESHOLD);

    const up =
      this.cursor.up.isDown ||
      (gp?.axes[1] && gp?.axes[1] < -JOYSTICK_THRESHOLD);
    const down =
      this.cursor.down.isDown ||
      (gp?.axes[1] && gp?.axes[1] > JOYSTICK_THRESHOLD);

    // Set walk direction vector based on keyboard/gamepad joystick.
    if (this.cursor.left.isDown) {
      walkVector.x = -1;
    }
    if (gp?.axes[0] && gp?.axes[0] < -JOYSTICK_THRESHOLD) {
      walkVector.x = gp?.axes[0];
    }
    if (this.cursor.right.isDown) {
      walkVector.x = 1;
    }
    if (gp?.axes[0] && gp?.axes[0] > JOYSTICK_THRESHOLD) {
      walkVector.x = gp?.axes[0];
    }

    if (this.cursor.up.isDown) {
      walkVector.y = -1;
    }
    if (gp?.axes[1] && gp?.axes[1] < -JOYSTICK_THRESHOLD) {
      walkVector.y = gp?.axes[1];
    }
    if (this.cursor.down.isDown) {
      walkVector.y = 1;
    }
    if (gp?.axes[1] && gp?.axes[1] > JOYSTICK_THRESHOLD) {
      walkVector.y = gp?.axes[1];
    }

    walkVector.normalize();

    let dir: Direction | null = null;
    let moving = false;

    const body = this.container as Phaser.Physics.Matter.Sprite;
    if (up) {
      dir = 'up';
      if (this.north == 0) {
        body.setVelocityY(WALK_SPEED * walkVector.y);
        moving = true;
      }
    } else if (down) {
      dir = 'down';
      if (this.south == 0) {
        body.setVelocityY(WALK_SPEED * walkVector.y);
        moving = true;
      }
    }

    if (left) {
      dir = 'left';
      if (this.west == 0) {
        body.setVelocityX(WALK_SPEED * walkVector.x);
        moving = true;
      }
    } else if (right) {
      dir = 'right';
      if (this.east == 0) {
        body.setVelocityX(WALK_SPEED * walkVector.x);
        moving = true;
      }
    }

    this.updateAnimation(moving, dir);
    if (dir != null) {
      this.lastDir = dir;
    }
  }

  update(): void {
    const body = this.container as Phaser.Physics.Matter.Sprite;
    body.setVelocity(0);

    // Update the depth for sorting the character sprites correctly.
    const worldPos = body.getWorldPoint();
    body.setDepth(worldPos.y + this.sprite.displayHeight / 2 - this.feetHeight);

    // Update occlusion sprites location. They are not in the container because they
    // need maintain their own depth. Works fairly ok.
    for (const s of this.obstructingObjects.values()) {
      s.setPosition(worldPos.x, worldPos.y - SPRITE_Y_ADJUST);
      s.frame = this.sprite.frame;
      if (!USE_BITMAP_MASK) {
        // If not using the bitmap mask for the shadow sprite,
        // We will have only one instance of the shadow sprite.
        break;
      }
    }

    this.playerLight.x = worldPos.x - 16;
    this.playerLight.y = worldPos.y - 16;

    // Update the sun shadow
    setSunShadowParams(this.sunShadow);
    this.sunShadow.frame = this.sprite.frame;

    // Create shadow for each light in the scene - if within the light radius.
    for (const light of this.scene.lights.getLights(
      this.scene.cameras.main,
    ) as never[]) {
      const l: Phaser.GameObjects.Light = (light as any).light;
      const charPos = new Phaser.Math.Vector2(worldPos);

      // Calculate angle between light and character. (Note: charPos is mutated.)
      charPos
        .add({ x: 0, y: this.sprite.displayHeight / 2 })
        .subtract({ x: l.x, y: l.y });
      const dist = charPos.length();
      let dir = charPos.normalize();
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
          .sprite(0, SPRITE_Y_ADJUST + 5, this.key, 0)
          .setOrigin(0.5, 1)
          .setLighting(true)
          .setTintFill(0x000000);
        this.shadowSprites.set(l, shadowSprite);
        (this.container as Phaser.GameObjects.Container)
          .add(shadowSprite)
          .moveBelow(shadowSprite, this.sprite);
      }

      // Use the utility function shared with all objects casting a shadow.
      setNightShadowParams(l, shadowSprite, dir, dist);

      // Set the frame
      shadowSprite.frame = this.sprite.frame;
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

    this.processInput();
  }
}
