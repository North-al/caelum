import { useEffect, useRef } from "react"

/** Maps vertical mouse wheel to horizontal scroll on overflow containers. */
export const useHorizontalWheel = <T extends HTMLElement>() => {
  const ref = useRef<T>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) {
        return
      }
      const canScroll = node.scrollWidth > node.clientWidth
      if (!canScroll) {
        return
      }
      event.preventDefault()
      node.scrollLeft += event.deltaY
    }

    node.addEventListener("wheel", onWheel, { passive: false })
    return () => node.removeEventListener("wheel", onWheel)
  }, [])

  return ref
}
