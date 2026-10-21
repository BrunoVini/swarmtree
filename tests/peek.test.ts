import { expect, test } from 'claude-code/testing'
import { addedDiff, diffLines, diffWindow } from '../hooks/peek'
import { ontoMain } from '../hooks/tree'

const DIFF = ['diff --git a/x b/x', '--- a/x', '+++ b/x', '@@ -3,4 +3,5 @@ fn', ' a', '-b', '+B', '+C', ' d', ' e', '@@ -20,0 +22,1 @@', '+z'].join('\n')

test('a window cut mid-hunk is re-headed with the line numbers it starts at', () => {
  const lines = diffLines(DIFF)
  expect(lines.map(l => l.text)).toEqual([' a', '-b', '+B', '+C', ' d', ' e', '+z'])
  expect(diffWindow(lines, 0, 99)).toBe(['@@ -3,4 +3,5 @@', ' a', '-b', '+B', '+C', ' d', ' e', '@@ -20,0 +22,1 @@', '+z'].join('\n'))
  expect(diffWindow(lines, 2, 3)).toBe(['@@ -4,0 +4,2 @@', '+B', '+C'].join('\n'))
  expect(diffWindow(lines, 4, 9)).toBe(['@@ -5,2 +6,2 @@', ' d', ' e', '@@ -20,0 +22,1 @@', '+z'].join('\n'))
})

test('an untracked file is one added hunk', () => {
  expect(diffWindow(addedDiff(['x', 'y']), 0, 9)).toBe('@@ -0,0 +1,2 @@\n+x\n+y')
})

test('a sideways scroll cuts columns after the marker, keeping the hunk header whole', () => {
  expect(diffWindow(diffLines(DIFF), 1, 3, 1)).toBe(['@@ -4,1 +4,1 @@', '-', '+'].join('\n'))
})

test('a path in another worktree maps onto this one; the innermost worktree wins and others pass through', () => {
  const wts = ['/r/.claude/worktrees/x', '/wt/feature']
  expect(ontoMain('/r', wts, '/wt/feature/src/a.ts')).toBe('/r/src/a.ts')
  expect(ontoMain('/r', wts, '/r/.claude/worktrees/x/b.ts')).toBe('/r/b.ts')
  expect(ontoMain('/r', wts, '/r/src/a.ts')).toBe('/r/src/a.ts')
  expect(ontoMain('/r', wts, '/elsewhere/c.ts')).toBe('/elsewhere/c.ts')
})
