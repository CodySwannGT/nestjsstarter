/**
 * @file introspection.util.ts
 * @description Structural introspection-detection helpers used by the depth
 * validation rule. Introspection queries (`__schema` / `__type`) are
 * intentionally deep and wide — Apollo's landing page / Studio and any schema
 * tooling rely on them — so the rule must exempt them in EVERY environment.
 * The exemption is purely structural (no `NODE_ENV` gate), so it holds
 * identically in production.
 * @module graphql
 */

import { Kind } from "graphql";
import type { OperationDefinitionNode } from "graphql";

/**
 * Whether a field name is a GraphQL meta field (`__typename`, `__schema`,
 * `__type`). Meta fields are the introspection surface and, by spec, are the
 * only fields that may begin with a double underscore.
 * @param name - The field name to test.
 * @returns `true` if the name is a `__`-prefixed meta field.
 */
export const isMetaField = (name: string): boolean => name.startsWith("__");

/**
 * Whether an operation is a pure introspection operation — i.e. every
 * root-level selection is a meta field.
 *
 * This is the load-bearing whole-operation exemption: an introspection query
 * selects only `__schema`/`__type` at the root, but its *inner* fields
 * (`types`, `fields`, `ofType`, …) are ordinary names and the document is depth
 * ~10+ with hundreds of fields. Per-field meta skipping alone would still count
 * those inner fields and trip the limit, so the whole operation is skipped when
 * its roots are all meta fields. Inline fragments / fragment spreads at the
 * root are treated as non-introspection (real introspection never uses them),
 * which fails safe toward enforcing the limits.
 * @param operation - The operation definition to classify.
 * @returns `true` if the operation should be exempt from the depth rule.
 */
export const isIntrospectionOperation = (
  operation: OperationDefinitionNode
): boolean =>
  operation.selectionSet.selections.every(
    selection =>
      selection.kind === Kind.FIELD && isMetaField(selection.name.value)
  );
