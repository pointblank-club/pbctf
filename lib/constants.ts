/**
 * Shared runtime constants. Single source of truth for values otherwise
 * scattered across components.
 */

/** Maximum number of operators per team. */
export const TEAM_SIZE = 2 as const;

/** Discord username pattern (modern usernames: 2-32 chars, lowercase, digits, dots, underscores). */
export const DISCORD_USERNAME_REGEX = /^[a-z0-9._]{2,32}$/;

/** File size caps (in MB). */
export const FILE_SIZE = {
  resume: 5,
  profilePhoto: 2,
} as const;

/**
 * Registration / team-formation deadline
 */
export const REGISTRATION_DEADLINE = new Date("2026-07-19T10:00:00+05:30");

/** RSVP deadline for shortlisted teams. */
export const RSVP_DEADLINE = new Date("2026-07-21T23:59:00+05:30");

/** True once the registration / team-formation window has closed. */
export const isRegistrationClosed = (now: Date = new Date()): boolean =>
  now > REGISTRATION_DEADLINE;

/** True once the RSVP window has closed. */
export const isRsvpClosed = (now: Date = new Date()): boolean =>
  now > RSVP_DEADLINE;
