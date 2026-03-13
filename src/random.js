export function pickWeighted(entries, random = Math.random()) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = random * total;

  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.value;
    }
  }

  return entries[entries.length - 1].value;
}

export function shuffleList(items, random = Math.random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function pickRandom(items, excludeValue = null, random = Math.random) {
  const pool = excludeValue == null ? items : items.filter((item) => item !== excludeValue);
  return pool[Math.floor(random() * pool.length)] ?? items[0];
}
