import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canStartMovement,
  movementSide,
  cooldownReadout,
} from '../src/controls.js';
import { radarPoint } from '../src/radar.js';
test('touches on the action side cannot acquire movement when the other thumb lifts', () => {
  assert.equal(canStartMovement('touch', 70, 390), true);
  assert.equal(canStartMovement('touch', 330, 390), false);
  assert.equal(canStartMovement('touch', 330, 390, true), true);
  assert.equal(canStartMovement('touch', 70, 390, true), false);
  assert.equal(movementSide(false), 'left');
  assert.equal(movementSide(true), 'right');
});
test('mouse movement remains available across the field and invalid coordinates are rejected', () => {
  assert.equal(canStartMovement('mouse', 330, 390), true);
  assert.equal(canStartMovement('mouse', 70, 390, true), true);
  for (const x of [-1, 391, NaN])
    assert.equal(canStartMovement('touch', x, 390), false);
  assert.equal(canStartMovement('touch', 20, 0), false);
});
test('cooldown readouts round up so ready never appears before the ability can fire', () => {
  assert.equal(cooldownReadout(0.1), '1s');
  assert.equal(cooldownReadout(2.1), '3s');
  assert.equal(cooldownReadout(0), 'Ready');
});
test('distant radar objectives remain on the boundary in the correct direction', () => {
  const player = { x: 100, y: 200 };
  const near = radarPoint({ x: 200, y: 200 }, player);
  assert.equal(near.x, 6);
  assert.equal(near.y, 0);
  assert.equal(near.edge, false);
  const far = radarPoint({ x: 1100, y: 1200 }, player);
  assert.equal(far.edge, true);
  assert.ok(Math.abs(Math.hypot(far.x, far.y) - 33) < 1e-10);
  assert.ok(far.x > 0 && far.y > 0);
  const centered = radarPoint(player, player);
  assert.deepEqual(centered, { x: 0, y: 0, edge: false });
});
