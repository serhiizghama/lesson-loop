/**
 * Room codes and the teacher's key (design D12).
 *
 * These are the only random values in the room, and they are drawn here rather than in
 * `src/shared` so that the room core stays reproducible.
 */

/** No `0 O 1 I 5 S`: a code is read aloud and typed by hand, often by a child. */
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789'

export const ROOM_CODE_LENGTH = 4
export const TEACHER_KEY_BYTES = 16

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))
  let code = ''
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length]
  return code
}

export function randomToken(bytes: number): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  return [...buffer].map((b) => b.toString(16).padStart(2, '0')).join('')
}
