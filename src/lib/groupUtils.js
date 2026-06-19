/** key_shift = 1 → open product browse; otherwise price-entry group line. */
export function isGroupBrowseMode(group) {
  return Number(group?.keyShift) === 1
}
