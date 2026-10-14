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

test('new screens start at the top and returning restores the previous place', () => {
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
  assert.equal(container.scrollTop, 900);
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

test('expanded item details survive selection refreshes and navigation round trips', () => {
  const container = menuContainer();
  let details = [];
  container.querySelectorAll = (selector) =>
    selector.includes('[open]')
      ? details.filter((d) => d.open)
      : selector.startsWith('details')
        ? details
        : [];
  Object.defineProperty(container, 'innerHTML', {
    set(html) {
      this.markup = html;
      this.scrollTop = 0;
      details = [{ dataset: { panel: 'weapon-evolution' }, open: false }];
    },
  });
  const render = createMenuRenderer(container);
  render('gear', 'equipment');
  details[0].open = true;
  container.scrollTop = 450;
  render('equipped gear', 'equipment');
  assert.equal(details[0].open, true);
  assert.equal(container.scrollTop, 450);
  render('hero', 'hero');
  render('gear again', 'equipment');
  assert.equal(details[0].open, true);
  assert.equal(container.scrollTop, 450);
});
