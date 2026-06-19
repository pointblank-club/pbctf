/**
 * Inline reCAPTCHA disclosure.
 *
 * The floating reCAPTCHA badge is hidden via CSS (see globals.css). Google's
 * terms require that, when the badge is hidden, this disclosure is shown to
 * users wherever reCAPTCHA is active. Drop this near each auth form's submit.
 */
export function RecaptchaNotice({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[11px] leading-[1.5] text-ink-muted text-center ${className}`}
    >
      This site is protected by reCAPTCHA and the Google{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand/80 hover:text-brand underline underline-offset-2"
      >
        Privacy Policy
      </a>{" "}
      and{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand/80 hover:text-brand underline underline-offset-2"
      >
        Terms of Service
      </a>{" "}
      apply.
    </p>
  );
}
