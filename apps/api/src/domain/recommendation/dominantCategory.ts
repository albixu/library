/**
 * Returns the most frequent category from a list.
 * On ties, the first-appearing category wins.
 * Returns "General" if the list is empty.
 */
export function getDominantCategory(categories: string[]): string {
  if (categories.length === 0) {
    return 'General';
  }

  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]!;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
    if (!firstSeen.has(cat)) {
      firstSeen.set(cat, i);
    }
  }

  let dominant = '';
  let maxCount = 0;
  let minFirstSeen = Infinity;

  for (const [cat, count] of counts.entries()) {
    const first = firstSeen.get(cat)!;
    if (count > maxCount || (count === maxCount && first < minFirstSeen)) {
      dominant = cat;
      maxCount = count;
      minFirstSeen = first;
    }
  }

  return dominant;
}
