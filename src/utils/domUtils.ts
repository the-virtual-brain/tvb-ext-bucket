/**
 * Helper function to assert an event target is indeed a Node.
 * @param e - even target to assert
 * @throws TypeError in case event target is not a Node.
 *
 * -------
 * NOTE: Asserting functions in typescript do not support arrow function notation!
 */
export function assertIsNode(e: EventTarget | null): asserts e is Node {
  if (!e || !('nodeType' in e)) {
    throw new TypeError('Node expected');
  }
}
