import { expect, test } from 'claude-code/testing'
import type { AgentInfo } from 'claude-code'
import { byLineage, seenFrom, writerAt } from '../hooks/agents'
import { layout, parseLog, refKind } from '../hooks/graph'
import { byFile, diffLines } from '../hooks/peek'

const agent = (id: string, parentId?: string) => ({ id, description: id, type: 'general-purpose', status: 'running', ...(parentId ? { parentId } : {}) }) as AgentInfo

test('an orchestrator in view sees its own work and every agent under it, not its siblings', () => {
  const agents = [agent('orch'), agent('impl', 'orch'), agent('deep', 'impl'), agent('other')]
  expect(['orch', 'impl', 'deep', 'other'].filter(id => seenFrom(agents, 'orch', id))).toEqual(['orch', 'impl', 'deep'])
  expect(seenFrom(agents, undefined, 'other')).toBe(true)
})

test('chips list parents before their children, an orphan as a root', () => {
  const order = byLineage([agent('impl', 'orch'), agent('orch'), agent('lost', 'gone')]).map(x => `${x.agent.id}:${x.depth}`)
  expect(order).toEqual(['orch:0', 'impl:1', 'lost:0'])
})

test('a change goes to the one agent whose command was running then, to none when two were', () => {
  const runs = [{ agentId: 'a1', from: 100, to: 200 }, { agentId: 'a2', from: 150, to: 400 }]
  expect(writerAt(120, runs, 0)).toBe('a1')
  expect(writerAt(300, runs, 0)).toBe('a2')
  expect(writerAt(180, runs, 0)).toBeUndefined()
  expect(writerAt(900, runs, 0)).toBeUndefined()
})

const commit = (hash: string, ...parents: string[]) => ({ hash, parents, short: hash, refs: [], subject: hash, at: 0 })
const draw = (rows: ReturnType<typeof layout>) => rows.map(r => r.cells.map(c => c.t).join(''))

test('the log reads as commits with their parents, refs and time', () => {
  const [c] = parseLog('aaa\x1fbbb ccc\x1fa1\x1fHEAD -> main, origin/main, tag: v1\x1ffixed it\x1f1700000000\n')
  expect(c?.parents).toEqual(['bbb', 'ccc'])
  expect(c?.refs.map(r => refKind(r, ['origin']).kind)).toEqual(['head', 'remote', 'tag'])
  expect(refKind('feature/DS-1', ['origin']).kind).toBe('branch')
  expect(c?.at).toBe(1_700_000_000_000)
})

test('a merge forks a lane that its branch runs down and ends back where it began', () => {
  const rows = layout([commit('M', 'A', 'F'), commit('A', 'B'), commit('F', 'B'), commit('B')])
  expect(draw(rows)).toEqual(['●─╮', '● │', '│ ●', '●─╯'])
  const [m, a, f, b] = rows.map(r => r.cells.filter(c => c.t !== ' ' && c.t !== '─').map(c => c.lane))
  expect(a?.[1]).toBe(m?.[1])
  expect(f?.[1]).toBe(m?.[1])
  expect(b?.[1]).toBe(m?.[1])
  expect(m?.[0]).not.toBe(m?.[1])
})

test('a run that goes on past a lane tees there and bends only at its far end', () => {
  const rows = layout([commit('X', 'A'), commit('Y', 'A'), commit('M', 'A', 'F'), commit('F', 'A'), commit('A')])
  expect(draw(rows).at(-1)).toBe('●─┴─┴─╯')
})

test('a straight history stays in one lane, and a branch tip with no child opens a lane of its own', () => {
  expect(draw(layout([commit('C', 'B'), commit('B', 'A'), commit('A')]))).toEqual(['●', '●', '●'])
  expect(draw(layout([commit('T', 'A'), commit('S', 'A'), commit('A')]))).toEqual(['●', '│ ●', '●─╯'])
})

test('a commit diff splits by file and skips each file header', () => {
  const show = ['abc fixed', 'diff --git a/x.ts b/x.ts', 'index 1..2', '--- a/x.ts', '+++ b/x.ts', '@@ -1 +1 @@', '-a', '+b', 'diff --git a/y.ts b/y.ts', '--- a/y.ts', '+++ b/y.ts', '@@ -0,0 +1 @@', '+c'].join('\n')
  expect(byFile(diffLines(show)).map(g => [g.file, g.lines.map(l => l.text)])).toEqual([['x.ts', ['-a', '+b']], ['y.ts', ['+c']]])
})
