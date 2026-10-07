/**
 * Whether this app creates its own Fuseki dataset on boot, from
 * `LINKED_DATASET_ENSURE`.
 *
 * Unset or empty means yes: a standalone app owns its dataset, and creating it
 * on first boot is what makes a fresh clone just work.
 *
 * A host that provisions the dataset itself (Create Now injects
 * `LINKED_DATASET_ENSURE=0`) turns it off. There, creating it would be wrong in
 * the one case it ever does anything: a dataset the host created and then LOST
 * would be silently replaced by an empty one, and the project would look empty
 * instead of broken.
 *
 * Any other value is refused rather than guessed at.
 */
export function shouldEnsureDataset(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  if (!v) return true;
  if (['1', 'true', 'on', 'yes'].includes(v)) return true;
  if (['0', 'false', 'off', 'no'].includes(v)) return false;
  throw new Error(
    `LINKED_DATASET_ENSURE must be 1/true/on/yes or 0/false/off/no, got ${JSON.stringify(value)}`,
  );
}
