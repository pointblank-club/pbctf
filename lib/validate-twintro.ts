export function validateTwintroCode(code: string): boolean {
  const validCodesEnv = process.env.TWINTRO_CODES || "";
  const validCodes = validCodesEnv
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  return validCodes.includes(code.trim());
}
