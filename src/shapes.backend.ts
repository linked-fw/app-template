/**
 * Backend shape registration barrel.
 *
 * Every shape the app USES must be imported here so it registers in the
 * BACKEND's module graph — `@linkedShape` registration is an import
 * side-effect, and a shape imported only by frontend components never
 * registers server-side. The boot shape-sync (`syncShapesOnBoot`) can only
 * materialize REGISTERED shapes' `sh:NodeShape`s into the app dataset, which
 * is what powers SHACL-driven tooling (the Create Now builder's binding
 * panel, validation, data queries).
 *
 * Add one import line per shape module your app uses — package shapes
 * (like the example's Person) and your own `src/shapes/**` alike.
 */

import '@_linked/schema/shapes/Person';
