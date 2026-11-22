/**
 * Recipient normalisation for FlashSMS (SYN-274).
 *
 * FlashSMS rejects the whole send with `400 INVALID_REQUEST` when a phone is a
 * bad value, so a single malformed leader number used to fail the SMS outright.
 * Numbers are normalised to the 233XXXXXXXXX form FlashSMS documents for Ghana,
 * and anything that cannot be a phone number is dropped before the send.
 *
 * Never log what this returns — it is phone numbers.
 */

const GHANA_CC = '233'

export const normaliseRecipient = (raw: unknown): string | null => {
  let digits = String(raw ?? '').replace(/\D/g, '')

  // International dialling prefix: 00233… → 233…
  if (digits.startsWith('00')) digits = digits.slice(2)

  // Local Ghana number: 0XXXXXXXXX → 233XXXXXXXXX
  if (/^0\d{9}$/.test(digits)) return `${GHANA_CC}${digits.slice(1)}`
  // Trunk zero kept after the country code: 2330XXXXXXXXX → 233XXXXXXXXX
  if (/^2330\d{9}$/.test(digits)) return `${GHANA_CC}${digits.slice(4)}`
  // Ghana number without its leading zero: XXXXXXXXX → 233XXXXXXXXX
  if (/^[1-9]\d{8}$/.test(digits)) return `${GHANA_CC}${digits}`

  if (digits.startsWith(GHANA_CC)) {
    return digits.length === 12 ? digits : null
  }

  // Other countries: anything that fits E.164 is left for FlashSMS to judge.
  return /^[1-9]\d{9,14}$/.test(digits) ? digits : null
}

export const normaliseRecipients = (recipients: unknown[]) => {
  const valid: string[] = []
  let invalidCount = 0

  recipients.forEach((recipient) => {
    const phone = normaliseRecipient(recipient)
    if (phone) valid.push(phone)
    else invalidCount += 1
  })

  return { valid, invalidCount }
}
