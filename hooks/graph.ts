// The commit graph tab: commits and their parents, laid out in lanes one row per commit.

export type Commit = { hash: string; parents: string[]; short: string; refs: string[]; subject: string; at: number }
// A cell is one column of the graph; `lane` names the color it takes (-1 for none).
export type Cell = { t: string; lane: number }
export type GraphRow = Commit & { cells: Cell[] }

export const LOG_FORMAT = '%H%x1f%P%x1f%h%x1f%D%x1f%s%x1f%ct'

export function parseLog(stdout: string): Commit[] {
  return stdout
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [hash = '', parents = '', short = '', refs = '', subject = '', ct = ''] = line.split('\x1f')
      return { hash, parents: parents.split(' ').filter(Boolean), short, refs: refs ? refs.split(', ').map(r => r.trim()).filter(Boolean) : [], subject, at: Number(ct) * 1000 || 0 }
    })
}

// Each lane waits for the commit it leads to. A commit takes its lane (or a free one), lanes that also
// waited for it end there (╯╰), its first parent carries the lane on, and each other parent forks a
// new lane (╮╭) or joins the lane already waiting for it (┤├). Lanes keep their color while they live.
export function layout(commits: Commit[]): GraphRow[] {
  const lanes: (string | null)[] = []
  const colors: number[] = []
  let born = 0
  const free = (skip: number[]) => {
    const i = lanes.findIndex((h, k) => h === null && !skip.includes(k))
    return i < 0 ? lanes.length : i
  }
  return commits.map(c => {
    let col = lanes.indexOf(c.hash)
    if (col < 0) {
      col = free([])
      lanes[col] = c.hash
      colors[col] = born++
    }
    const before = [...lanes]
    const ends = before.flatMap((h, i) => (h === c.hash && i !== col ? [i] : []))
    lanes[col] = c.parents[0] ?? null
    const forks: number[] = []
    const joins: number[] = []
    for (const p of c.parents.slice(1)) {
      const at = lanes.indexOf(p)
      if (at >= 0 && at !== col) {
        joins.push(at)
        continue
      }
      const k = free(ends)
      lanes[k] = p
      colors[k] = born++
      forks.push(k)
    }
    const endColor = new Map(ends.map(i => [i, colors[i] ?? 0]))
    for (const i of ends) lanes[i] = null
    const reach = [...ends, ...forks, ...joins]
    const lo = Math.min(col, ...reach)
    const hi = Math.max(col, ...reach)
    // A run of ─ takes the color of the lane it reaches for, the nearest one beyond it.
    const spanLane = (x: number) => {
      const side = reach.filter(r => (x > col ? r >= x : r <= x))
      const to = x > col ? Math.min(...side) : Math.max(...side)
      return endColor.get(to) ?? colors[to] ?? 0
    }
    const width = Math.max(before.length, lanes.length)
    const cells: Cell[] = []
    for (let i = 0; i < width; i++) {
      const passing = before[i] !== null && before[i] !== undefined && before[i] !== c.hash
      const across = i > lo && i < hi
      if (i === col) cells.push({ t: '●', lane: colors[col] ?? 0 })
      // At the far end of the run a lane bends (╯╰ ending, ╮╭ forking, ┤├ joining); with the run going on past it, it tees.
      else if (ends.includes(i)) cells.push({ t: across ? '┴' : i > col ? '╯' : '╰', lane: endColor.get(i) ?? 0 })
      else if (forks.includes(i)) cells.push({ t: across ? '┬' : i > col ? '╮' : '╭', lane: colors[i] ?? 0 })
      else if (joins.includes(i)) cells.push({ t: across ? '┼' : i > col ? '┤' : '├', lane: colors[i] ?? 0 })
      else if (passing) cells.push({ t: across ? '┼' : '│', lane: colors[i] ?? 0 })
      else if (across) cells.push({ t: '─', lane: spanLane(i) })
      else cells.push({ t: ' ', lane: -1 })
      if (i < width - 1) cells.push(i >= lo && i < hi ? { t: '─', lane: spanLane(i + 0.5) } : { t: ' ', lane: -1 })
    }
    while (cells.length && cells[cells.length - 1]?.t === ' ') cells.pop()
    return { ...c, cells }
  })
}

export type RefKind = 'head' | 'tag' | 'remote' | 'branch'

// `HEAD -> main` names the checked-out branch; `tag: v1` a tag; `<remote>/x` a remote branch, by the repo's remotes.
export function refKind(ref: string, remotes: string[]): { kind: RefKind; name: string } {
  if (ref.startsWith('HEAD -> ')) return { kind: 'head', name: ref.slice(8) }
  if (ref === 'HEAD') return { kind: 'head', name: 'HEAD' }
  if (ref.startsWith('tag: ')) return { kind: 'tag', name: ref.slice(5) }
  return { kind: remotes.some(r => ref.startsWith(`${r}/`)) ? 'remote' : 'branch', name: ref }
}
