/**
 * Convert a flat list of HTS items into a hierarchical tree based on the
 * `indent` property of each item.  Each node in the returned tree contains the
 * original item data plus a `children` array.
 * @param {Array<object>} items - Flat list of HTS entries.
 * @returns {Array<object>} tree structure representing the hierarchy.
 */
export function buildHtsTree(items = []) {
  const root = [];
  const stack = [];
  for (const item of items) {
    const depth = Number(item.indent) || 0;
    const node = { ...item, children: [] };
    if (depth === 0) {
      root.push(node);
      stack[0] = node;
    } else {
      const parent = stack[depth - 1];
      if (parent) {
        parent.children.push(node);
      } else {
        root.push(node);
      }
      stack[depth] = node;
    }
  }
  return root;
}

/**
 * Flatten a tree created by {@link buildHtsTree} back into a list of items.
 * @param {Array<object>} tree - Tree previously created by buildHtsTree.
 * @returns {Array<object>} flat array of items without `children` fields.
 */
export function flattenHtsTree(tree = []) {
  const result = [];
  const walk = nodes => {
    for (const node of nodes) {
      const { children, ...rest } = node;
      result.push(rest);
      if (children && children.length) {
        walk(children);
      }
    }
  };
  walk(Array.isArray(tree) ? tree : [tree]);
  return result;
}