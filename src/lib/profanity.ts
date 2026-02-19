// Common profanity and inappropriate username patterns.
// This list covers the most common cases without being exhaustive.
const BLOCKED_WORDS = [
  'fuck', 'fucc', 'fuk', 'fvck',
  'shit', 'sh1t', 'sht',
  'ass', 'arse',
  'bitch', 'b1tch', 'btch',
  'cunt', 'cvnt',
  'dick', 'd1ck',
  'cock', 'c0ck',
  'pussy', 'puss',
  'nigger', 'nigga', 'n1gger', 'n1gga',
  'faggot', 'fag', 'f4g',
  'whore', 'wh0re',
  'slut', 'sl0t',
  'nazi', 'n4zi',
  'rape', 'r4pe',
  'retard', 'ret4rd',
  'kill', 'kys',
  'porn', 'p0rn',
  'sex', 's3x',
  'penis', 'vagina',
  'boob', 'tit',
  'bastard', 'b4stard',
  'damn', 'd4mn',
  'crap',
  'piss',
  'anus',
  'butthole',
  'cum',
  'jerk',
  'asshole',
  'dipshit',
  'jackass',
  'motherfucker', 'mofo',
  'stfu', 'gtfo',
  'wtf',
];

/**
 * Returns true if the username contains inappropriate content.
 */
export function isInappropriateUsername(username: string): boolean {
  const lower = username.toLowerCase();
  // Check if any blocked word is a substring
  return BLOCKED_WORDS.some((word) => lower.includes(word));
}

export function getInappropriateReason(username: string): string | null {
  if (isInappropriateUsername(username)) {
    return 'Username contains inappropriate content. Please choose a different username.';
  }
  return null;
}
