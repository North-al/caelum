import { useEffect, useMemo, useRef, useState } from "react"

interface Props {
  left: React.ReactNode
  right: React.ReactNode
  initialRatio?: number
  onRatioChange?: (ratio: number) => void
}

export const SplitPanel = ({ left, right, initialRatio = 50, onRatioChange }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ratio, setRatio] = useState(initialRatio)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!dragging) {
      return undefined
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) {
        return
      }

      const bounds = containerRef.current.getBoundingClientRect()
      const nextRatio = ((event.clientX - bounds.left) / bounds.width) * 100
      setRatio(Math.min(80, Math.max(20, nextRatio)))
    }

    const handleMouseUp = () => {
      setDragging(false)
      onRatioChange?.(ratio)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragging, onRatioChange, ratio])

  const leftStyle = useMemo(() => ({ width: `${ratio}%` }), [ratio])
  const rightStyle = useMemo(() => ({ width: `${100 - ratio}%` }), [ratio])

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-1 overflow-hidden">
      <div style={leftStyle} className="min-w-0 overflow-hidden p-3">
        {left}
      </div>
      <div
        className="w-2 cursor-col-resize bg-border/50 transition-colors hover:bg-border"
        onMouseDown={() => setDragging(true)}
      />
      <div style={rightStyle} className="min-w-0 overflow-hidden p-3">
        {right}
      </div>
    </div>
  )
}
