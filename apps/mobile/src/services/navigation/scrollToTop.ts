/**
 * Lets the tab bar scroll the screen it is already on back to the top.
 *
 * A tiny registry rather than navigation state: each tab screen registers its
 * scroll handler under its route name, the tab bar calls it when the focused
 * tab is pressed again.
 */
type Handler = () => void;

const handlers = new Map<string, Handler>();

/** Registers a screen's handler; returns the cleanup for the effect. */
export function registerScrollToTop(routeName: string, handler: Handler): () => void {
  handlers.set(routeName, handler);
  return () => {
    if (handlers.get(routeName) === handler) handlers.delete(routeName);
  };
}

export function scrollToTop(routeName: string): void {
  handlers.get(routeName)?.();
}
