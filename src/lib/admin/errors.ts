/**
 * Turn database errors into wording staff can act on. Raw database messages are
 * never shown. Codes AWC01–AWC10 are raised deliberately by the migrations.
 */
const friendly: Record<string, string> = {
  AWC01: "Only an Owner can do that.",
  AWC02: "You can't change your own role or deactivate yourself.",
  AWC03: "There must always be at least one active Owner.",
  AWC04: "Application answers can't be edited. Update the linked contact instead.",
  AWC05: "History can't be edited or deleted.",
  AWC06: "This car is rented. Change the car's status first.",
  AWC07: "This contact is renting a car. Remove them as the renter first.",
  AWC08: "That field can't be changed.",
  AWC09: "Notes can't be edited.",
  AWC10: "That staff member wasn't found.",
  "42501": "You don't have permission to do that.",
  "23505": "That already exists.",
  "23514": "Some details aren't valid. Check the highlighted fields and try again.",
};

export function friendlyDbError(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return "Something went wrong. Please try again.";
  // Some AWC errors carry a specific, safe message (e.g. which car is rented).
  if (err.code === "AWC06" || err.code === "AWC07") return err.message ?? friendly[err.code];
  return (err.code && friendly[err.code]) || "Something went wrong. Please try again.";
}

/** An UPDATE/DELETE blocked by row-level security affects 0 rows rather than failing. */
export const NO_PERMISSION = "You don't have permission to do that.";
