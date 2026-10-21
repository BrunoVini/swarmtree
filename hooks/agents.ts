// Which subagent did what: pure rules the tree, the band and the write scan share.
import type { AgentInfo } from 'claude-code'

// True when `id` is the agent in view or runs under it: an orchestrator's view shows the work of the agents it spawned.
export function seenFrom(agents: AgentInfo[], viewing: string | undefined, id: string): boolean {
  if (!viewing) return true
  const parent = new Map(agents.map(a => [a.id, a.parentId]))
  for (let at: string | undefined = id, hops = 0; at && hops < 16; at = parent.get(at), hops++) if (at === viewing) return true
  return false
}

// Parents before their children, each with its depth, for the band's chips.
export function byLineage(agents: AgentInfo[]): { agent: AgentInfo; depth: number }[] {
  const ids = new Set(agents.map(a => a.id))
  const out: { agent: AgentInfo; depth: number }[] = []
  const walk = (parent: string | undefined, depth: number) => {
    for (const a of agents) if ((a.parentId && ids.has(a.parentId) ? a.parentId : undefined) === parent && depth < 16) {
      out.push({ agent: a, depth })
      walk(a.id, depth + 1)
    }
  }
  walk(undefined, 0)
  return out
}

// The one agent whose command was running when a file changed (its mtime within a run, give or take `slack`);
// undefined when none or several were, so a change two agents could have made is put down to neither.
export function writerAt(ms: number, runs: { agentId?: string; from: number; to?: number }[], slack: number): string | undefined {
  const who = new Set(runs.filter(r => ms >= r.from - slack && ms <= (r.to ?? Infinity) + slack).map(r => r.agentId))
  return who.size === 1 ? [...who][0] : undefined
}
