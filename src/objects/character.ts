/**
 * A Character class to hold everything related to a character.
 */
const WALK_SPEED = 1;
const DIAGONAL_SCALE = 1.0 / Math.SQRT2;

export class Character {
  // Fields
  private readonly sprite: Phaser.Physics.Matter.Sprite;
  private readonly key: string;
  private cursor: Phaser.Types.Input.Keyboard.CursorKeys | undefined =
    undefined;
  private hitBox: MatterJS.BodyType;
  private obstructingObjects = new Map<
    Phaser.GameObjects.Sprite,
    Phaser.GameObjects.Sprite
  >();

  public isMainPlayer;

  // Methods
  constructor(
    scene: Phaser.Scene,
    key: string,
    playerConfig?: {
      mainPlayer?: boolean;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    },
  ) {
    this.key = key;
    this.sprite = scene.matter.add
      .sprite(playerConfig?.x ?? 0, playerConfig?.y ?? 0, key, 0, {
        restitution: 0,
        shape: {
          type: 'rectangle',
          width: playerConfig?.width ?? 20,
          height: playerConfig?.height ?? 8,
        },
        render: { sprite: { xOffset: 0, yOffset: 0.5 } },
      })
      .setFixedRotation()
      .setLighting(true);
    (this.sprite.body as MatterJS.BodyType).label = 'character';

    // Add a character hitbox.
    this.hitBox = scene.matter.add.rectangle(
      playerConfig?.x ?? 0,
      playerConfig?.y ?? 0,
      this.sprite.displayWidth,
      this.sprite.displayHeight,
      { isSensor: true },
    );
    this.hitBox.label = 'character_hitbox';

    this.hitBox.onCollideCallback = (pair: MatterJS.IPair) => {
      this.onCollisionStart(pair);
    };

    this.hitBox.onCollideEndCallback = (pair: MatterJS.IPair) => {
      this.onCollisionEnd(pair);
    };

    scene.events.on('update', () => {
      this.update();
    });
    this.isMainPlayer = playerConfig?.mainPlayer ?? false;
  }

  setIsMainPlayer(val: boolean): this {
    this.isMainPlayer = val;
    return this;
  }

  mainObject(): Phaser.GameObjects.GameObject {
    return this.sprite;
  }

  getPosition(): Phaser.Math.Vector2 {
    return this.sprite.getWorldPoint();
  }

  getDepth() {
    return this.sprite.depth;
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  onCollisionStart(pair: MatterJS.IPair) {
    const bodyA = pair.bodyA as MatterJS.BodyType;
    const bodyB = pair.bodyB as MatterJS.BodyType;

    const other = bodyA.label == 'character_hitbox' ? bodyB : bodyA;

    if (other.label == 'object_sensor' && other.gameObject != null) {
      if (other.gameObject instanceof Phaser.GameObjects.Sprite) {
        const scene = this.sprite.scene;
        const pos = this.sprite.getWorldPoint();
        const shadowSprite = scene.add.sprite(pos.x, pos.y, this.key, 0);
        shadowSprite.setOrigin(0.5, 1);
        shadowSprite.alpha = 0.75;
        shadowSprite.setTintFill(0x363636);
        shadowSprite.depth = other.gameObject.depth + 1;
        shadowSprite.enableFilters();
        (shadowSprite.filters as any).external.addMask(other.gameObject);

        this.obstructingObjects.set(other.gameObject, shadowSprite);
      }
    }
  }

  onCollisionEnd(pair: MatterJS.IPair) {
    const bodyA = pair.bodyA as MatterJS.BodyType;
    const bodyB = pair.bodyB as MatterJS.BodyType;

    const other = bodyA.label == 'character_hitbox' ? bodyB : bodyA;

    if (
      other.label == 'object_sensor' &&
      other.gameObject != null &&
      other.gameObject instanceof Phaser.GameObjects.Sprite
    ) {
      const shadowSprite = this.obstructingObjects.get(other.gameObject);
      if (shadowSprite != null) {
        shadowSprite.destroy();
        this.obstructingObjects.delete(other.gameObject);
      }
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

    if (this.cursor.left.isDown) {
      this.sprite.setVelocityX(-WALK_SPEED * scale);
    } else if (this.cursor.right.isDown) {
      this.sprite.setVelocityX(WALK_SPEED * scale);
    }

    if (this.cursor.up.isDown) {
      this.sprite.setVelocityY(-WALK_SPEED * scale);
    } else if (this.cursor.down.isDown) {
      this.sprite.setVelocityY(WALK_SPEED * scale);
    }
  }

  update(): void {
    this.sprite.setVelocity(0);

    const worldPos = this.sprite.getWorldPoint();
    this.sprite.setDepth(worldPos.y);

    // Update hitbox location.
    this.hitBox.position.x = worldPos.x;
    this.hitBox.position.y = worldPos.y - this.sprite.displayHeight / 2;

    // Update shadow sprites location.
    for (const s of this.obstructingObjects.values()) {
      s.setPosition(worldPos.x, worldPos.y);
    }

    this.processInput();
  }
}
