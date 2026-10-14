import test from 'node:test';
import assert from 'node:assert/strict';
import { createMenuRenderer } from '../src/menu.js';

function menuContainer() {
  return {
    scrollTop: 0,
    scrollLeft: 0,
    markup: '',
    set innerHTML(html) {
      this.markup = html;
      // Replacing DOM can collapse the scrollable content before new layout.
      this.scrollTop = 0;
      this.scrollLeft = 0;
    },
  };
}

test('choosing equipment or buying research preserves the current menu scroll', () => {
  const container = menuContainer();
  const render = createMenuRenderer(container);
  render('weapon cards', 'workshop:weapons');
  container.scrollTop = 847;
  container.scrollLeft = 12;
  render('selected weapon cards', 'workshop:weapons');
  assert.equal(container.scrollTop, 847);
  assert.equal(container.scrollLeft, 12);
  assert.equal(container.markup, 'selected weapon cards');
  container.scrollTop = 1130;
  render('purchased weapon cards', 'workshop:weapons');
  assert.equal(container.scrollTop, 1130);
});

test('opening another screen or bunker category starts at the top', () => {
  const container = menuContainer();
  const render = createMenuRenderer(container);
  render('weapons', 'workshop:weapons');
  container.scrollTop = 900;
  render('abilities', 'workshop:abilities');
  assert.equal(container.scrollTop, 0);
  container.scrollTop = 500;
  render('settings', 'settings:');
  assert.equal(container.scrollTop, 0);
  container.scrollTop = 200;
  render('sound enabled', 'settings:');
  assert.equal(container.scrollTop, 200);
  render('weapons again', 'workshop:weapons');
  assert.equal(container.scrollTop, 0);
});

test('new upgrade choices reset their scroll instead of inheriting a previous level', () => {
  const container = menuContainer();
  const render = createMenuRenderer(container);
  render('level 3 choices', 'run::upgrade:3');
  container.scrollTop = 280;
  render('rerolled level 3 choices', 'run::upgrade:3');
  assert.equal(container.scrollTop, 280);
  render('level 4 choices', 'run::upgrade:4');
  assert.equal(container.scrollTop, 0);
});
