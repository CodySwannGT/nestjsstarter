/**
 * @file depth-limit.rule.ts
 * @description Native GraphQL `ValidationRule` that rejects an operation whose
 * selection-set nesting exceeds a configured maximum depth. This is a
 * server-side abuse mitigation: batched HTTP requests let a client send many
 * operations per POST, and an unbounded-depth query can force pathological
 * resolver recursion.
 *
 * WHY a hand-rolled native rule (not a third-party depth/complexity library):
 * the rule is imported from the SAME `graphql` package the bundle already
 * resolves, so it runs in the same realm as Apollo's bundled `graphql`. A
 * second `graphql` copy (ESM, pulled in by libraries such as
 * `graphql-query-complexity`) collides with a bundled minified-CJS copy and
 * throws `Cannot use GraphQLObjectType from another module or realm` — this
 * was proven empirically upstream, and the library-based approach was
 * reverted. Depth is measured purely structurally from the AST (no `TypeInfo`,
 * no schema type objects), which is the most bundle-safe possible form. (This
 * starter also carries a committed `graphql` patch that fixes the dual-realm
 * instanceOf check for its ComplexityPlugin; the native rule stays realm-safe
 * regardless of that patch.)
 *
 * PERFORMANCE (fragment-amplification DoS guard): each fragment's intrinsic
 * depth is MEMOIZED by name. A fragment's depth is context-independent (it is a
 * fixed structural shift of the spread site's depth), so a diamond chain like
 * `fN { ...f(N-1) ...f(N-1) }` is measured in O(N), not the naive O(2^N) that
 * would let a ~1KB document burn a 29s Lambda timeout. See `intrinsicDepth`.
 * @module graphql
 */

import { GraphQLError, Kind } from "graphql";
import type {
  ASTVisitor,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
  ValidationContext,
  ValidationRule,
} from "graphql";
import {
  MAX_VALIDATION_DEPTH,
  QUERY_TOO_DEEP,
} from "./graphql-limits.constants";
import { isIntrospectionOperation, isMetaField } from "./introspection.util";

/**
 * Per-operation analysis state threaded through the depth walk.
 * - `memo` caches each fragment's intrinsic depth (measured from base 1), shared
 *   across the whole walk so every fragment is measured at most once (O(N)).
 * - `computing` is the set of fragment names currently on the active
 *   intrinsic-computation path — the cycle guard (graphql's
 *   `NoFragmentCyclesRule` may not have run yet, and isn't active when this rule
 *   runs in isolation).
 */
interface DepthScope {
  readonly context: ValidationContext;
  readonly memo: Map<string, number>;
  readonly computing: ReadonlySet<string>;
}

/**
 * The intrinsic max depth of a fragment, measured from base 1 and memoized by
 * name. A genuine cycle (the fragment is already on the computation path) is an
 * effectively infinite-depth document and returns `MAX_VALIDATION_DEPTH + 1`
 * (over any sane limit → reported, terminates). An unresolved fragment occupies
 * only its spread level → intrinsic depth 1.
 * @param name - The fragment name.
 * @param scope - Current analysis scope.
 * @returns The fragment's intrinsic depth.
 */
function intrinsicDepth(name: string, scope: DepthScope): number {
  const cached = scope.memo.get(name);
  if (cached !== undefined) return cached;
  if (scope.computing.has(name)) return MAX_VALIDATION_DEPTH + 1;
  const fragment = scope.context.getFragment(name);
  if (!fragment) return 1;
  const value = measureDepth(fragment.selectionSet, 1, {
    ...scope,
    computing: new Set(scope.computing).add(name),
  });
  // eslint-disable-next-line functional/immutable-data -- intentional per-operation memoization cache; this is what turns O(2^N) fragment expansion into O(N)
  scope.memo.set(name, value);
  return value;
}

/**
 * Depth contributed by a single field. A bare `__typename` (meta field) or any
 * leaf field contributes only `currentDepth`; a field with children recurses one
 * level deeper.
 * @param field - The field node.
 * @param currentDepth - Depth at which the field is selected.
 * @param scope - Current analysis scope.
 * @returns The deepest level reached through this field.
 */
const fieldDepth = (
  field: FieldNode,
  currentDepth: number,
  scope: DepthScope
): number =>
  field.selectionSet && !isMetaField(field.name.value)
    ? measureDepth(field.selectionSet, currentDepth + 1, scope)
    : currentDepth;

/**
 * Depth contributed by a fragment spread. The spread itself is not a nesting
 * level, so the fragment body shifts the spread site's depth by its intrinsic
 * depth: `currentDepth - 1 + intrinsicDepth`. The intrinsic depth is memoized,
 * so repeated/diamond spreads cost O(1) after the first measurement.
 * @param spread - The fragment-spread node.
 * @param currentDepth - Depth at which the spread occurs.
 * @param scope - Current analysis scope.
 * @returns The deepest level reached through the referenced fragment.
 */
const spreadDepth = (
  spread: FragmentSpreadNode,
  currentDepth: number,
  scope: DepthScope
): number => currentDepth - 1 + intrinsicDepth(spread.name.value, scope);

/**
 * Depth contributed by a single selection, dispatching on its node kind. Inline
 * fragments, like spreads, are measured at the same depth (not a nesting level).
 * @param selection - Field, inline fragment, or fragment spread.
 * @param currentDepth - Depth at which the selection occurs.
 * @param scope - Current analysis scope.
 * @returns The deepest level reached through this selection.
 */
const selectionDepth = (
  selection: SelectionNode,
  currentDepth: number,
  scope: DepthScope
): number => {
  if (selection.kind === Kind.FIELD) {
    return fieldDepth(selection as FieldNode, currentDepth, scope);
  }
  if (selection.kind === Kind.INLINE_FRAGMENT) {
    const inline = selection as InlineFragmentNode;
    return measureDepth(inline.selectionSet, currentDepth, scope);
  }
  return spreadDepth(selection as FragmentSpreadNode, currentDepth, scope);
};

/**
 * Recursively measure the maximum nesting depth of a selection set.
 *
 * `MAX_VALIDATION_DEPTH` bounds analysis cost on hostile (deeply nested)
 * documents: once exceeded we return `MAX_VALIDATION_DEPTH + 1`, which is by
 * definition over any sane `maxDepth`, so the operation is reported as too deep
 * without walking the rest of the tree.
 * @param selectionSet - The selection set to measure.
 * @param currentDepth - Depth of `selectionSet` itself (root selection set = 1).
 * @param scope - Current analysis scope.
 * @returns The maximum depth reached within `selectionSet`.
 */
function measureDepth(
  selectionSet: SelectionSetNode,
  currentDepth: number,
  scope: DepthScope
): number {
  if (currentDepth > MAX_VALIDATION_DEPTH) return MAX_VALIDATION_DEPTH + 1;
  return selectionSet.selections.reduce(
    (max, selection) =>
      Math.max(max, selectionDepth(selection, currentDepth, scope)),
    currentDepth
  );
}

/**
 * Build a native depth-limiting `ValidationRule`.
 *
 * All work happens on `OperationDefinition` enter so fragments can be resolved
 * manually (structurally, AST-only) rather than relying on visitor traversal
 * ordering. Pure introspection operations are exempt entirely.
 * @param maxDepth - Maximum allowed operation depth (inclusive — equal passes).
 * @returns A `ValidationRule` that reports `QUERY_TOO_DEEP` when the limit is exceeded.
 */
export const depthLimitRule =
  (maxDepth: number): ValidationRule =>
  (context: ValidationContext): ASTVisitor => ({
    OperationDefinition(node: OperationDefinitionNode) {
      if (isIntrospectionOperation(node)) return;
      const depth = measureDepth(node.selectionSet, 1, {
        context,
        memo: new Map<string, number>(),
        computing: new Set<string>(),
      });
      if (depth > maxDepth) {
        context.reportError(
          new GraphQLError(
            `Query exceeds the maximum operation depth of ${maxDepth}.`,
            { nodes: [node], extensions: { code: QUERY_TOO_DEEP } }
          )
        );
      }
    },
  });
