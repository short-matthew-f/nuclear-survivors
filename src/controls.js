// Claim a movement finger only on the side opposite the action buttons.
// Once claimed, pointer capture lets that finger cross the screen freely.
export function canStartMovement(type, x, width, leftHanded = false) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(width) ||
    width <= 0 ||
    x < 0 ||
    x > width
  )
    return false;
  return type === 'mouse' || (leftHanded ? x >= width / 2 : x <= width / 2);
}
export const movementSide = (leftHanded) => (leftHanded ? 'right' : 'left');
export function cooldownReadout(timer) {
  return timer > 0 ? `${Math.ceil(timer)}s` : 'Ready';
}
