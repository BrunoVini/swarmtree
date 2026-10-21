import type { ClientModule } from 'claude-code'

export type ButtonProps = { id: string; label: string; dim: boolean }

type Local = { over: boolean; ref: { downAt: number } }

// A header button that also tells the hooks module when the pointer is over it, which a Button
// alone doesn't, so the header can say what the button does. The click is taken here, on the
// pointer going down anywhere in the region: the hover redraws the pane, and the Button's own
// press was lost when it landed during that redraw. The Button stays for its hover look and the
// keyboard, and skips a press the pointer already made.
const HeaderButton: ClientModule<ButtonProps, Local> = (props, surface) => {
  const { Button } = surface.elements
  if (surface.state === undefined) surface.setState({ over: false, ref: { downAt: 0 } })
  const ref = surface.state?.ref ?? { downAt: 0 }
  surface.onPointer(e => {
    if (e.type === 'down' && (e.button ?? 'left') === 'left') {
      ref.downAt = Date.now()
      surface.post({ press: true })
      return
    }
    const over = e.type !== 'leave'
    if (over === Boolean(surface.state?.over)) return
    surface.setState({ over, ref })
    surface.post({ over })
  })
  // A Nerd Font icon is counted one cell wide but drawn wider and off its cell, so it gets a cell
  // on each side: the whole of the drawn icon is this button's, none of it the neighbour's.
  const label = /[\u{e000}-\u{f8ff}\u{f0000}-\u{fffff}]$/u.test(props.label) ? ` ${props.label} ` : props.label
  return <Button key={props.id} plain dimColor={props.dim} label={label} onPress={() => Date.now() - ref.downAt > 500 && surface.post({ press: true })} />
}

export default HeaderButton
