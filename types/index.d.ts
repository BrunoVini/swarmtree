export type FileNode = {
  id: string
  parent: string
  name: string
  kind: 'dir' | 'file' | 'link'
  hidden: boolean
  mtime: number
  size: number
  loaded: boolean
}

export type Branch = {
  head: string
  upstream: string
  ahead: number
  behind: number
}

export type Activity = {
  id: number
  kind: string
  label: string
  state: 'running' | 'done' | 'failed'
  detail: string
  at: number
  tone: string
  nerd: string
  plain: string
}

export type FileTree = {
  root: string
  nodes: FileNode[]
  expanded: string[]
  cursor: string
  selected: string
  query: string
  showHidden: boolean
  showSize: boolean
  dirSizes: Record<string, number>
  git: Record<string, string>
  diff: Record<string, [number, number]>
  ignored: string[]
  untrackedDirs: string[]
  top: string
  prefix: string
  branch: Branch | null
  counts: Record<string, [number, number, number]>
  flash: string[]
  flashDim: string[]
  flashOn: boolean
  flashTones: Record<string, string>
  scroll: number | null
  preview: string
  previewTop: number
  tab: 'files' | 'changes' | 'graph' | 'agents'
}

// What the subagents did this session, kept across a reload: each one's color (an index into the palette),
// the files it read and wrote, its name, its worktree, its last call, and the commits it made (short sha to id).
export type AgentBook = {
  colors: Record<string, number>
  reads: Record<string, string[]>
  writes: Record<string, string[]>
  names: Record<string, string>
  worktrees: Record<string, string>
  last: Record<string, { text: string; at: number }>
  commits: Record<string, string>
}

export type Theme = {
  fg: string
  accent: string
  muted: string
  urgent: string
  selection: string
  bg: string
}

declare module 'claude-code' {
  interface PluginState {
    swarmtree: {
      tree: FileTree
      theme: Theme
      activity: Activity[]
      agents: AgentBook
    }
  }
}
