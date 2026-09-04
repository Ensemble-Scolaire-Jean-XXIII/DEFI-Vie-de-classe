export function levelMedalPlaceholder(levelName?: string | null): string | null {
  if (!levelName) return null;
  const n = levelName.toLowerCase();
  if (/\bniveau\s*1\b/.test(n) || /niveau\s*1/.test(n)) {
    return "/medailles/niveau1Lock.webp";
  }
  if (/\bniveau\s*2\b/.test(n) || /niveau\s*2/.test(n)) {
    return "/medailles/niveau2Lock.webp";
  }
  if (/\bniveau\s*3\b/.test(n) || /niveau\s*3/.test(n)) {
    return "/medailles/niveau3Lock.webp";
  }
  if (n.includes("bonus")) {
    return "/medailles/niveauBonusLock.webp";
  }
  return null;
}
