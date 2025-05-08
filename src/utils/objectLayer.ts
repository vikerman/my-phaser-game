// Utility functions for working with Object Layer of a Tilemap

function createObjectLayer(
  map: Phaser.Tilemaps.Tilemap,
  layer: string,
  tilesets: Phaser.Tilemaps.Tileset[],
) {
  const objectLayer = map.getObjectLayer(layer);
  if (objectLayer == null) {
    return objectLayer;
  }

  const objectConfigs = [] as Array<{ gid: number }>;

  for (const ts of tilesets) {
    for (let i = 0; i <= ts.total; i++) {
      objectConfigs.push({ gid: ts.firstgid + i });
    }
  }

  const objectSprites = map.createFromObjects(
    layer,
    objectConfigs,
  ) as Phaser.GameObjects.Sprite[];
  for (const object of objectSprites) {
    object.setLighting(true);
    object.setDepth(object.getBottomCenter().y);
    const pos = object.getWorldPoint();
    const rect = map.scene.matter.add.rectangle(
      pos.x,
      pos.y,
      object.displayWidth,
      object.displayHeight,
      {
        isSensor: true,
      },
    );
    rect.label = 'object_sensor';
    rect.gameObject = object;
  }

  return objectLayer;
}

function getTilesetFromGID(gid: number, tilesets: Phaser.Tilemaps.Tileset[]) {
  for (const ts of tilesets) {
    if (gid >= ts.firstgid && gid < ts.firstgid + ts.total) {
      return ts;
    }
  }
  return null;
}

function createFromCollisionObjects(
  map: Phaser.Tilemaps.Tilemap,
  tileObject: Phaser.Types.Tilemaps.TiledObject,
  collisionObjects: any[],
) {
  const scene = map.scene;
  const tileX = tileObject.x!;
  const tileY = tileObject.y! - tileObject.height!;
  // const parts = [];
  for (var i = 0; i < collisionObjects.length; i++) {
    var object = collisionObjects[i];
    var ox = tileX + object.x;
    var oy = tileY + object.y;
    var ow = object.width;
    var oh = object.height;
    var body = null;

    const options = { isStatic: true, label: 'object_colider' };

    if (object.rectangle) {
      body = scene.matter.add.rectangle(
        ox + ow / 2,
        oy + oh / 2,
        ow,
        oh,
        options,
      );
    } else if (object.ellipse) {
      body = scene.matter.add.circle(ox + ow / 2, oy + oh / 2, ow / 2, options);
    } else if (object.polygon || object.polyline) {
      // Polygons and polylines are both treated as closed polygons
      var originalPoints = object.polygon ? object.polygon : object.polyline;

      var points = originalPoints.map(function (p: { x: number; y: number }) {
        return { x: p.x, y: p.y };
      });

      // Points are relative to the object's origin (first point placed in Tiled), but
      // matter expects points to be relative to the center of mass. This only applies to
      // convex shapes. When a concave shape is decomposed, multiple parts are created and
      // the individual parts are positioned relative to (ox, oy).
      //
      //  Update: 8th January 2019 - the latest version of Matter needs the Vertices adjusted,
      //  regardless if convex or concave.
      var center = { x: 0, y: 0 };
      for (let i = 0; i < points.length; i++) {
        center.x += points[i].x;
        center.y += points[i].y;
      }
      center.x /= points.length;
      center.y /= points.length;

      ox += center.x;
      oy += center.y;

      body = scene.matter.add.fromVertices(ox, oy, points, options);
    }
    // if (body) {
    //   parts.push(body);
    // }
  }

  // if (parts.length === 1) {
  //   this.setBody(parts[0], options.addToWorld);
  // } else if (parts.length > 1) {
  //   var tempOptions = DeepCopy(options);

  //   tempOptions.parts = parts;

  //   this.setBody(Body.create(tempOptions), tempOptions.addToWorld);
  // }
}

function convertObjectLayer(
  map: Phaser.Tilemaps.Tilemap,
  objectLayer: Phaser.Tilemaps.ObjectLayer | null,
  tilesets: Phaser.Tilemaps.Tileset[],
) {
  if (objectLayer == null) {
    return;
  }

  for (const object of objectLayer.objects) {
    const tileset = getTilesetFromGID(object.gid!, tilesets);
    if (tileset == null) {
      console.warn('Could not find tileset for gid: ' + object.gid);
      continue;
    }
    const obj = tileset?.getTileCollisionGroup(object.gid!);
    const collisionObjects = (obj as any)['objects'] || [];
    for (let i = 0; i < collisionObjects.length; i++) {
      createFromCollisionObjects(map, object, collisionObjects);
    }
  }
}

export function createObjectsFromLayer(
  map: Phaser.Tilemaps.Tilemap,
  layer: string,
) {
  const objectLayer = createObjectLayer(map, layer, map.tilesets);
  convertObjectLayer(map, objectLayer, map.tilesets);
}
