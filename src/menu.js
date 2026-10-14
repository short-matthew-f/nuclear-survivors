// Refreshing a selection must not move the player away from the item they tapped.
// A different screen/category starts at the top instead of inheriting that offset.
export function createMenuRenderer(container) {
  let previousView = null;
  return (html, view) => {
    const sameView = view === previousView;
    const top = sameView ? container.scrollTop : 0;
    const left = sameView ? container.scrollLeft : 0;
    container.innerHTML = html;
    container.scrollTop = top;
    container.scrollLeft = left;
    previousView = view;
  };
}
