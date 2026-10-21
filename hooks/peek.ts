// The double-click peek: a short window onto a file's diff against HEAD.

export type DiffLine = { text: string; hunk: number; old: number; new: number; file?: string }

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

// Each body line of a unified diff, with the old and new line numbers it starts at and,
// in a diff of several files (a commit), the file it belongs to.
export function diffLines(diff: string): DiffLine[] {
  const out: DiffLine[] = []
  let hunk = -1
  let o = 0
  let n = 0
  let file: string | undefined
  let header = false
  for (const text of diff.split('\n')) {
    const name = /^diff --git a\/.+? b\/(.+)$/.exec(text)
    if (name) {
      file = name[1]
      header = true
      continue
    }
    const m = HUNK.exec(text)
    if (m) {
      hunk++
      header = false
      // An empty side names the line before it, so the next line is one past.
      o = Number(m[1]) + (m[2] === '0' ? 1 : 0)
      n = Number(m[3]) + (m[4] === '0' ? 1 : 0)
      continue
    }
    if (header || hunk < 0 || !/^[ +-]/.test(text)) continue
    out.push({ text, hunk, old: o, new: n, ...(file ? { file } : {}) })
    if (text[0] !== '+') o++
    if (text[0] !== '-') n++
  }
  return out
}

// Consecutive lines of one file together, so a commit's diff is drawn file by file.
export function byFile(lines: DiffLine[]): { file: string; lines: DiffLine[] }[] {
  const out: { file: string; lines: DiffLine[] }[] = []
  for (const l of lines) {
    const last = out[out.length - 1]
    if (last && last.file === (l.file ?? '')) last.lines.push(l)
    else out.push({ file: l.file ?? '', lines: [l] })
  }
  return out
}

// A whole file as one added hunk, for a file git does not track yet.
export function addedDiff(lines: string[]): DiffLine[] {
  return lines.map((l, i) => ({ text: `+${l}`, hunk: 0, old: 1, new: i + 1 }))
}

// `rows` rows of the diff from line `top`, each run re-headed so that a window
// cut mid-hunk still parses as hunks; a header takes a row like a line. `left`
// columns are cut from each line after its marker, to scroll sideways.
export function diffWindow(lines: DiffLine[], top: number, rows: number, left = 0): string {
  const out: string[] = []
  let i = Math.max(0, top)
  while (i < lines.length && out.length < rows - 1) {
    const run: DiffLine[] = []
    const hunk = lines[i]?.hunk
    while (i < lines.length && lines[i]?.hunk === hunk && out.length + 1 + run.length < rows) run.push(lines[i++] as DiffLine)
    const first = run[0] as DiffLine
    const olds = run.filter(l => l.text[0] !== '+').length
    const news = run.filter(l => l.text[0] !== '-').length
    out.push(`@@ -${olds ? first.old : first.old - 1},${olds} +${news ? first.new : first.new - 1},${news} @@`, ...run.map(l => l.text[0] + l.text.slice(1 + left)))
  }
  return out.join('\n')
}

// Where each hunk begins, as indexes into the lines, for n and p to jump between.
export function hunkStarts(lines: DiffLine[]): number[] {
  return lines.flatMap((l, i) => (i === 0 || l.hunk !== lines[i - 1]?.hunk ? [i] : []))
}
