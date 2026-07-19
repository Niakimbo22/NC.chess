export interface Opening {
  eco: string;
  name: string;
  /** Coups SAN séparés par des espaces */
  line: string;
}

let cache: Opening[] | null = null;
let byLine: Map<string, Opening> | null = null;

export async function loadOpenings(): Promise<Opening[]> {
  if (cache) return cache;
  const raw = (await import('./openings.json')).default as [string, string, string][];
  cache = raw.map(([eco, name, line]) => ({ eco, name, line }));
  byLine = new Map(cache.map((o) => [o.line, o]));
  return cache;
}

/** Ouverture exacte ou la plus longue correspondant au début de la partie */
export function findOpening(sans: string[]): Opening | null {
  if (!cache || !byLine) return null;
  for (let len = Math.min(sans.length, 24); len >= 1; len--) {
    const key = sans.slice(0, len).join(' ');
    const hit = byLine.get(key);
    if (hit) return hit;
  }
  return null;
}

export interface Continuation {
  san: string;
  /** Ouverture atteinte par ce coup (la plus courte qui l'inclut) */
  reached: Opening;
  /** Nombre de lignes du livre qui passent par ce coup */
  count: number;
}

/** Continuations du livre après la séquence donnée */
export function continuationsAfter(sans: string[]): Continuation[] {
  if (!cache) return [];
  const prefix = sans.join(' ');
  const map = new Map<string, { reached: Opening; count: number }>();
  for (const o of cache) {
    if (prefix.length > 0 && !(o.line === prefix || o.line.startsWith(prefix + ' '))) continue;
    const rest = prefix.length === 0 ? o.line : o.line.slice(prefix.length).trim();
    if (!rest) continue;
    const next = rest.split(' ')[0];
    const cur = map.get(next);
    if (!cur) {
      map.set(next, { reached: o, count: 1 });
    } else {
      cur.count++;
      // garde le nom le plus court (le plus général) pour ce coup
      if (o.line.length < cur.reached.line.length) cur.reached = o;
    }
  }
  return [...map.entries()]
    .map(([san, v]) => ({ san, reached: v.reached, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

/** Recherche par nom (insensible aux accents/casse) */
export function searchOpenings(query: string, limit = 30): Opening[] {
  if (!cache) return [];
  const q = normalize(query);
  if (q.length < 2) return [];
  const matches = cache.filter((o) => normalize(o.name).includes(q));
  // Les noms qui commencent par la recherche d'abord, puis les lignes courtes
  matches.sort((a, b) => {
    const aStarts = normalize(a.name).startsWith(q) ? 0 : 1;
    const bStarts = normalize(b.name).startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.line.length - b.line.length;
  });
  return matches.slice(0, limit);
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
