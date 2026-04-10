const BAD_WORDS = [
  "mad",
  "stupid",
  "crazy",
  "bastard",
  "fool",
  "idiot",
  "moron",
  "dumb",
  "shit",
  "fuck",
  "bitch",
  "asshole",
  "dick",
  "pussy",
  "cunt",
  "faggot",
  "nigger",
  "slut",
  "whore",
  "damn",
  "hell",
  "crap",
  "suck",
  "shut up",
];

export function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BAD_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(lowerText);
  });
}

export function sanitizeText(text: string): string {
  let sanitized = text;
  BAD_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    sanitized = sanitized.replace(regex, "****");
  });
  return sanitized;
}

export function getProfanity(text: string): string[] {
  const lowerText = text.toLowerCase();
  return BAD_WORDS.filter((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(lowerText);
  });
}
