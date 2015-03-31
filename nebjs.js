/**********************************************************************
  NebJS
***********************************************************************
nebjs.js
  Some classes for 2D simulations to make life easier.
/**********************************************************************
Copyright 2015 Joshua William Taylor

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**********************************************************************/

/* !! !! !! !! !! !! !! !! !! !!
  Polyfill for performance.now
!! !! !! !! !! !! !! !! !! !! */
window.performance = window.performance || {};
performance.now = (function() {
  return performance.now       ||
         performance.mozNow    ||
         performance.msNow     ||
         performance.oNow      ||
         performance.webkitNow ||
         function() { return new Date().getTime(); };
})();
/******************************/

var Neb = Neb || {};

// This value is used to scale all vectors. Tweak this value per needs.
Neb._GEO_FACTOR = 1.0;
Neb.setGeoFactor = function(geofactor) {
  if (geofactor === NaN || geofactor === undefined)
    throw "Neb.setGeoFactor was passed an invalid value.";
  Neb._GEO_FACTOR = geofactor;
}
// This works unless you change the dimensions of your canvas. If your
// canvas changes sizes then do _not_ use this function but instead
// scale using your canvas' context. This is just for quick hacks.
Neb.scaleGeoFactor = function(refDim, dim, constant) {
  Neb.setGeoFactor( constant *
    ( (dim.width * dim.height) / (refDim.width * refDim.height) ) );
}

/**************************************
  Vector2D
**************************************/

Neb.Vector2D = function(x, y) {
  if (x === undefined || x === NaN) x = 0.0;
  if (y === undefined || y === NaN) y = 0.0;

  this.x = x * Neb._GEO_FACTOR;
  this.y = y * Neb._GEO_FACTOR;
}

Neb.Vector2D.fromAngle = function(angle, magnitude) {
  return new Neb.Vector2D(0.0, 0.0).shove(angle, magnitude);
}

Neb.Vector2D.prototype.translate = function(pos) {
  this.x += pos.x;
  this.y += pos.y;

  return this;
}

Neb.Vector2D.prototype.shove = function(angle, magnitude) {
  this.x += magnitude * Math.cos(angle);
  this.y += magnitude * Math.sin(angle);

  return this;
}

Neb.Vector2D.prototype.rotate = function(angle, origin) {
  if (origin === undefined) origin = new Neb.Vector2D(0.0, 0.0);

  this.translate(origin);
  nx = this.x * Math.cos(angle) - this.y * Math.sin(angle);
  ny = this.x * Math.sin(angle) + this.y * Math.cos(angle);

  this.x = nx;
  this.y = ny;

  return this;
}

Neb.Vector2D.prototype.scalarMul = function(factor) {
  var result = new Neb.Vector2D(0,0);

  result.x = this.x * factor;
  result.y = this.y * factor;

  return result;
}

Neb.Vector2D.prototype.dotProd = function(other) {
  return this.x * other.x + this.y * other.y;
}

Neb.Vector2D.prototype.norm = function() {
  // This function is _slow_
  var len = Math.sqrt(this.x*this.x + this.y*this.y);
  return new Neb.Vector2D(this.x / len, this.y / len);
}

Neb.Vector2D.prototype.add = function(other) {
  return new Neb.Vector2D(this.x + other.x, this.y + other.y);
}

Neb.Vector2D.prototype.addWith = function(other) {
  this.x = this.x + other.x;
  this.y = this.y + other.y;

  return this;
}

Neb.Vector2D.prototype.angleTo = function(other) {
  // This function is _super slow_
  // Dot product of normalized vectors
  var dotN = this.norm().dotProd(other.norm());
  var ang;
  // Optimization
  if (dotN == 0)
    ang = 0.5 * Math.PI;
  else
    ang = Math.acos(dotN);
  // The ternary is used to determine the direction of the angle
  return ((this.x * other.y - this.y * other.x) < 0 ? -1 : 1) * ang;
}

Neb.Vector2D.prototype.draw = function(ctx, pointStyle, lineStyle, origin) {
  if (origin === undefined)
    origin = new Neb.Vector2D(0.0, 0.0);
  if (!(ctx instanceof CanvasRenderingContext2D))
    return;
/*
  if (originStyle !== undefined) {
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.strokeStyle = originStyle;
    ctx.fillStyle = originStyle;
    ctx.arc(origin.x, origin.y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }
*/
/*
  console.log("origin.x: " + origin.x);
  console.log("this.x: " + this.x);
*/
  if (lineStyle !== null) {
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.strokeStyle = lineStyle;
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    ctx.closePath();
  }

  if (pointStyle !== null) {
    ctx.beginPath();
    ctx.strokeStyle = pointStyle;
    ctx.fillStyle = pointStyle;
    ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }
}

console.log("NebJS library loaded.")

/**************************************
  Force
**************************************/

Neb.Force = function(vec, curTime, duration, volatile) {
  this.vector = vec;
  if (duration === undefined)
    this.expireTime = -1;
  else
    this.expireTime = new Date().getMilliseconds + duration;
  if (volatile === undefined)
    this.volatile = false;
  else
    this.volatile = true;

  if (curTime === undefined)
    curTime = new Date().getMilliseconds();
  this.startTime = curTime;
}

Neb.Force.prototype.isExpired = function(curTime) {
  if (curTime === undefined)
    curTime = new Date().getMilliseconds();
  if (this.expireTime < 0)
    return false;
  else if (this.expireTime <= curTime)
    return true;
  return false;
}

Neb.Force.prototype.computeDelta = function(skewTime, time1, time2, mass) {
  if (mass === undefined)
    mass = 1.0;
  time1 -= skewTime;
  time2 -= skewTime;

  if (this.volatile)
    this.expireTime = 0;

  return this.vector.scalarMul( ((time2*time2) / 1000.0) / mass -
    ((time1*time1) / 1000.0) / mass );
}

/**************************************
  Node

  TODO: Complete child nodes
**************************************/

Neb.Node = function(pos, mass, velocity, time) {
  if (Neb.Node.count === undefined)
    Neb.Node.count = 0;
  this.serial = ++Neb.Node.count;

  if (pos === undefined)
    this.pos = new Neb.Vector2D(0.0, 0.0);
  else
    this.pos = pos;
  if (mass === undefined)
    this.mass = 1.0;
  else
    this.mass = mass;
  if (time === undefined)
    this.lastUpdate = new Date().getMilliseconds();
  else
    this.lastUpdate = time;
  if (velocity === undefined)
    this.velocity = new Neb.Vector2D(0.0, 0.0);
  else
    this.velocity = velocity;

  this.forces = [];
  this.children = [];
  this._parent = null;
}

Neb.Node.prototype.getPosition = function() {
  if (this._parent === null)
    return this.pos;
  return this.pos.add(this._parent.getPosition());
}

Neb.Node.prototype.addChild = function(node) {
  node._parent = this;
  this.children.push(node);

  return node;
}

Neb.Node.prototype.addForce = function(force, curTime) {
  this.forces.push([force, curTime]);
}

Neb.Node.prototype.update = function(curTime) {
  if (this.forces.length > 0) {
    for (var frc in this.forces) {
      if (this.forces[frc][0].isExpired(curTime)) {
        this.forces.splice(frc, 1);
        continue;
      }
      this.velocity.addWith(this.forces[frc][0].computeDelta(
        this.forces[frc][1], this.lastUpdate, curTime, this.mass) );
    }
  }

  this.pos.addWith(this.velocity.scalarMul((curTime - this.lastUpdate) / 1000));

  this.lastUpdate = curTime;

  if (this.children.length > 0) {
    for (var child in this.children) {
      this.children[child].update(curTime);
    }
  }
}

Neb.Node.prototype.showDebug = function(ctx, pointStyle, lineStyle,
  recursion, _origdraw) {
  if (recursion-- < 0)
    return;

  var curPos = this.getPosition();

  if (_origdraw === undefined) {
    curPos.draw(ctx, pointStyle[0], null);
    _origdraw = true;
  }

  if (pointStyle.length > 1)
    pointStyle = pointStyle.slice(1);
  if (lineStyle.length > 1)
    lineStyle = lineStyle.slice(1);

  for (var child in this.children) {
    this.children[child].getPosition().draw(ctx, pointStyle[0], lineStyle[0], curPos);
    this.children[child].showDebug(ctx, pointStyle, lineStyle,
      recursion, _origdraw);
  }
}
