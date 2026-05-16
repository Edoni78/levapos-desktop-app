import { Dialog, DialogBody, DialogFooter } from '@blueprintjs/core'

export function Modal({ open, title, onClose, children, footer }) {
  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={title}
      canOutsideClickClose
      canEscapeKeyClose
      style={{ width: 'min(100%, 32rem)' }}
    >
      <DialogBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>{children}</DialogBody>
      {footer ? <DialogFooter actions={footer} /> : null}
    </Dialog>
  )
}
