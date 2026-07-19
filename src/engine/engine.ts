/**
 * Wrapper du moteur Stockfish 18 (WASM, single-thread) tournant dans un Web Worker.
 * Parle le protocole UCI par postMessage.
 */

export interface EngineEval {
  type: 'cp' | 'mate';
  value: number;
}

export interface Candidate {
  move: string;
  eval: EngineEval;
  pv: string[];
  depth: number;
}

export interface SearchResult {
  best: string;
  candidates: Candidate[];
}

export interface SearchOptions {
  movetime?: number;
  depth?: number;
  multipv?: number;
}

type LineListener = (line: string) => void;

export class Engine {
  private worker: Worker;
  private listeners = new Set<LineListener>();
  private readyPromise: Promise<void>;
  private searching = false;
  private disposed = false;

  constructor() {
    this.worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-18-lite-single.js`);
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data);
      for (const l of [...this.listeners]) l(line);
    };
    this.readyPromise = new Promise<void>((resolve) => {
      const onLine = (line: string) => {
        if (line === 'uciok') {
          this.listeners.delete(onLine);
          resolve();
        }
      };
      this.listeners.add(onLine);
      this.send('uci');
    });
  }

  send(cmd: string): void {
    if (this.disposed) return;
    this.worker.postMessage(cmd);
  }

  onLine(listener: LineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async ready(): Promise<void> {
    await this.readyPromise;
  }

  private waitFor(predicate: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      const onLine = (line: string) => {
        if (predicate(line)) {
          this.listeners.delete(onLine);
          resolve(line);
        }
      };
      this.listeners.add(onLine);
    });
  }

  async setOptions(options: Record<string, string | number | boolean>): Promise<void> {
    await this.ready();
    for (const [name, value] of Object.entries(options)) {
      this.send(`setoption name ${name} value ${value}`);
    }
    const p = this.waitFor((l) => l === 'readyok');
    this.send('isready');
    await p;
  }

  async newGame(): Promise<void> {
    await this.ready();
    this.send('ucinewgame');
    const p = this.waitFor((l) => l === 'readyok');
    this.send('isready');
    await p;
  }

  async stop(): Promise<void> {
    if (this.searching) {
      this.send('stop');
      await this.waitFor((l) => l.startsWith('bestmove'));
      this.searching = false;
    }
  }

  /**
   * Lance une recherche et retourne le meilleur coup + les candidats MultiPV.
   * Les évaluations sont du point de vue du trait.
   */
  async search(fen: string, opts: SearchOptions = {}): Promise<SearchResult> {
    await this.ready();
    await this.stop();
    const multipv = opts.multipv ?? 1;
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send(`position fen ${fen}`);

    const candidates = new Map<number, Candidate>();
    const result = new Promise<SearchResult>((resolve) => {
      const onLine = (line: string) => {
        if (line.startsWith('info ') && line.includes(' pv ')) {
          const parsed = parseInfoLine(line);
          if (parsed) candidates.set(parsed.index, parsed.candidate);
        } else if (line.startsWith('bestmove')) {
          this.listeners.delete(onLine);
          this.searching = false;
          const best = line.split(' ')[1];
          const list = [...candidates.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c);
          resolve({ best, candidates: list });
        }
      };
      this.listeners.add(onLine);
    });

    this.searching = true;
    if (opts.movetime != null && opts.depth != null) {
      this.send(`go depth ${opts.depth} movetime ${opts.movetime}`);
    } else if (opts.depth != null) {
      this.send(`go depth ${opts.depth}`);
    } else {
      this.send(`go movetime ${opts.movetime ?? 1000}`);
    }
    return result;
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.worker.terminate();
  }
}

function parseInfoLine(line: string): { index: number; candidate: Candidate } | null {
  const tokens = line.split(/\s+/);
  let index = 1;
  let depth = 0;
  let evaluation: EngineEval | null = null;
  let pv: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    switch (tokens[i]) {
      case 'multipv':
        index = parseInt(tokens[i + 1], 10);
        break;
      case 'depth':
        depth = parseInt(tokens[i + 1], 10);
        break;
      case 'score':
        evaluation = { type: tokens[i + 1] as 'cp' | 'mate', value: parseInt(tokens[i + 2], 10) };
        break;
      case 'pv':
        pv = tokens.slice(i + 1);
        i = tokens.length;
        break;
    }
  }
  if (!evaluation || pv.length === 0) return null;
  return { index, candidate: { move: pv[0], eval: evaluation, pv, depth } };
}

/** Convertit une éval UCI (point de vue du trait) en centipions point de vue des blancs */
export function evalToWhiteCp(ev: EngineEval, turn: 'w' | 'b'): number {
  const sign = turn === 'w' ? 1 : -1;
  if (ev.type === 'mate') {
    return sign * (ev.value > 0 ? 10000 - Math.abs(ev.value) : -10000 + Math.abs(ev.value));
  }
  return sign * ev.value;
}
