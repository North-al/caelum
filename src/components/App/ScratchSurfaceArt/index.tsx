import { resolveSurface } from "~/lib/scratch-surfaces"

interface Props {
  surfaceId: string
}

export const ScratchSurfaceBg = ({ surfaceId }: Props) => {
  const surface = resolveSurface(surfaceId)
  if (!surface.backgroundImage) {
    return null
  }

  return (
    <div
      className="scratch-surface-bg"
      style={{ backgroundImage: `url(${surface.backgroundImage})` }}
      aria-hidden
    />
  )
}
