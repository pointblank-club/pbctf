/**
 * Server-side reCAPTCHA v3 verification.
 *
 * v3 scores requests in the background (0.0 = bot, 1.0 = human) with no user
 * interaction. We verify the client token against Google's siteverify endpoint
 * and reject requests that are clearly automated.
 *
 * Failure policy:
 *  - Genuine bot signals (failed verify, action mismatch, score below the
 *    threshold) are HARD failures — the request is rejected.
 *  - Infrastructure problems (siteverify unreachable) and missing configuration
 *    are SOFT — we allow the request and log, so a Google outage or an
 *    un-keyed environment can't take down auth entirely.
 */

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

// Minimum score to accept. Google recommends 0.5 as a starting threshold.
const MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);

export interface RecaptchaResult {
  ok: boolean;
  score?: number;
  action?: string;
  /** Machine-readable reason when ok === false (or the soft-allow reason). */
  reason?: string;
  errorCodes?: string[];
}

/**
 * Verify a reCAPTCHA v3 token.
 *
 * @param token          The token produced by grecaptcha.execute() on the client.
 * @param expectedAction The action name passed to execute() (e.g. "login").
 *                       When provided, the response action must match.
 */
export async function verifyRecaptcha(
  token: string | null | undefined,
  expectedAction?: string,
): Promise<RecaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // No secret configured → verification disabled (e.g. local/dev without keys).
  if (!secret) {
    console.warn(
      "[recaptcha] RECAPTCHA_SECRET_KEY is not set — skipping verification",
    );
    return { ok: true, reason: "verification_disabled" };
  }

  // Secret is configured but the client sent no token → treat as failure.
  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();

    if (!data.success) {
      return {
        ok: false,
        reason: "verification_failed",
        errorCodes: data["error-codes"],
      };
    }

    if (expectedAction && data.action !== expectedAction) {
      return {
        ok: false,
        reason: "action_mismatch",
        score: data.score,
        action: data.action,
      };
    }

    if (typeof data.score === "number" && data.score < MIN_SCORE) {
      return { ok: false, reason: "low_score", score: data.score };
    }

    return { ok: true, score: data.score, action: data.action };
  } catch (error) {
    // Soft-allow: don't let a siteverify outage block all logins/registrations.
    console.error("[recaptcha] siteverify request failed:", error);
    return { ok: true, reason: "verify_unreachable" };
  }
}
