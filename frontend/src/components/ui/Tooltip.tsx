import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  content: string
}

export function Tooltip({ content }: Props) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)

  function open() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      })
    }
    setVisible(true)
  }

  return (
    <span
      className="tooltip-wrapper"
      ref={triggerRef}
      onMouseEnter={open}
      onMouseLeave={() => setVisible(false)}
      onClick={() => visible ? setVisible(false) : open()}
    >
      <span className="tooltip-trigger">?</span>
      {visible && createPortal(
        <span className="tooltip-box" style={{ top: coords.top, left: coords.left }}>
          {content}
        </span>,
        document.body
      )}
    </span>
  )
}
