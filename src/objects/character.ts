import { isSafari } from '../utils/useragent';

/**
 * A Character class to hold everything related to a character.
 */
const WALK_SPEED = 1.5;
const DIAGONAL_SCALE = 1.0 / Math.SQRT2;
const SENSOR_WIDTH = 2;
const SPRITE_Y_ADJUST = 3;

let USE_BITMAP_MASK = !isSafari() && false;

export const AnimationModes = {
  NPC: 'NPC',
} as const;

export type AnimationMode =
  (typeof AnimationModes)[keyof typeof AnimationModes];

type Direction = 'up' | 'left' | 'down' | 'right';

export class Character {
  // Fields
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
  private readonly shadowSprite: Phaser.GameObjects.Sprite;
  private readonly sprite: Phaser.GameObjects.Sprite;
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
    this.isMainPlayer = playerConfig?.mainPlayer ?? false;
    this.feetWidth = playerConfig?.feetWidth ?? 20;
    this.feetHeight = playerConfig?.feetHeight ?? 8;
    this.key = key;
    const animationMode = playerConfig?.animationMode ?? AnimationModes.NPC;

    // Create animation keys for the spritesheet.
    this.createAnimFrames(scene, animationMode);

    this.shadowSprite = scene.add
      .sprite(0, SPRITE_Y_ADJUST + 5 /** TODO: WHY?? **/, key, 0)
      .setOrigin(0.5, 1)
      .setScale(0.7, 1.5)
      .setRotation((3 * Math.PI) / 4)
      .setTint(0x000000)
      .setAlpha(0, 0, 0.5, 0.5)
      .setLighting(true);

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

    const container = scene.add.container(0, 0, [
      this.shadowSprite,
      this.sprite,
    ]);
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

    scene.events.on('update', () => {
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

        const scene = this.sprite.scene;
        const pos = this.sprite.getWorldPoint();

        if (USE_BITMAP_MASK) {
          const occlusionSprite = scene.add.sprite(pos.x, pos.y, this.key, 0);
          occlusionSprite.depth = other.gameObject.depth + 1;
          occlusionSprite.setLighting(true);
          occlusionSprite.setTintFill(0x111111);
          occlusionSprite.enableFilters();
          (occlusionSprite.filters as any).external.addMask(other.gameObject);

          this.obstructingObjects.set(other.gameObject, occlusionSprite);
        } else {
          if (this.obstructingObjects.size == 0) {
            // Create the occlusion sprite since once doesn't exist already.
            const occlusionSprite = scene.add.sprite(pos.x, pos.y, this.key, 0);
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

    const diagonal =
      (this.cursor.left.isDown || this.cursor.right.isDown) &&
      (this.cursor.up.isDown || this.cursor.down.isDown);
    let scale = 1.0;
    if (diagonal) {
      scale = DIAGONAL_SCALE;
    }

    let dir: Direction | null = null;
    let moving = false;

    const body = this.container as Phaser.Physics.Matter.Sprite;
    if (this.cursor.up.isDown) {
      dir = 'up';
      if (this.north == 0) {
        body.setVelocityY(-WALK_SPEED * scale);
        moving = true;
      }
    } else if (this.cursor.down.isDown) {
      dir = 'down';
      if (this.south == 0) {
        body.setVelocityY(WALK_SPEED * scale);
        moving = true;
      }
    }

    if (this.cursor.left.isDown) {
      dir = 'left';
      if (this.west == 0) {
        body.setVelocityX(-WALK_SPEED * scale);
        moving = true;
      }
    } else if (this.cursor.right.isDown) {
      dir = 'right';
      if (this.east == 0) {
        body.setVelocityX(WALK_SPEED * scale);
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

    this.shadowSprite.frame = this.sprite.frame;

    this.processInput();
  }
}
