// Menus retain their place across both selection refreshes and short round trips.
// Each screen/category gets its own scroll and disclosure state.
export function createMenuRenderer(container) {
  let previousView = null;
  const views = new Map();
  return (html, view) => {
    const sameView = view === previousView;
    const active = container.ownerDocument?.activeElement;
    const focus =
      sameView && active && container.contains(active)
        ? { action: active.dataset?.action, value: active.dataset?.value }
        : null;
    if (previousView !== null) {
      views.set(previousView, {
        top: container.scrollTop,
        left: container.scrollLeft,
        open: [
          ...(container.querySelectorAll?.('details[data-panel][open]') || []),
        ].map((el) => el.dataset.panel),
      });
      if (views.size > 64) views.delete(views.keys().next().value);
    }
    const state = views.get(view);
    container.innerHTML = html;
    if (state)
      for (const disclosure of container.querySelectorAll?.(
        'details[data-panel]',
      ) || [])
        disclosure.open = state.open.includes(disclosure.dataset.panel);
    container.scrollTop = state?.top || 0;
    container.scrollLeft = state?.left || 0;
    const replacement = focus?.action
      ? [...(container.querySelectorAll?.('[data-action]') || [])].find(
          (el) =>
            el.dataset.action === focus.action &&
            el.dataset.value === focus.value &&
            !el.disabled,
        )
      : null;
    if (replacement) replacement.focus({ preventScroll: true });
    else if (!sameView)
      container
        .querySelector?.('[data-screen-title]')
        ?.focus({ preventScroll: true });
    previousView = view;
  };
}
