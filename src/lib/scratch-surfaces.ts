import type { ScratchPatternId } from "~/lib/scratch-appearance"

export type ScratchSurfaceId =
  | "none"
  | "caelum-mica"
  | "aurora-wash"
  | "neon-grid"
  | "parchment-fiber"
  | "linen-soft"

export interface ScratchSurfaceDef {
  id: ScratchSurfaceId
  label: string
  backgroundImage?: string
  fallbackBackground: string
  pattern: ScratchPatternId
  /** When set, used directly as text/icon color. */
  textInk?: string
}

export const SCRATCH_SURFACES: Record<ScratchSurfaceId, ScratchSurfaceDef> = {
  none: {
    id: "none",
    label: "无底图",
    fallbackBackground: "#f8fafc",
    pattern: "plain",
  },
  "caelum-mica": {
    id: "caelum-mica",
    label: "天青微光",
    backgroundImage: "/scratch-bg/caelum-mica.svg",
    fallbackBackground: "#f4f7fc",
    pattern: "plain",
  },
  "aurora-wash": {
    id: "aurora-wash",
    label: "极光晕染",
    backgroundImage: "/scratch-bg/aurora-wash.svg",
    fallbackBackground: "#f5f8ff",
    pattern: "plain",
  },
  "neon-grid": {
    id: "neon-grid",
    label: "霓虹网格",
    backgroundImage: "/scratch-bg/neon-grid.svg",
    fallbackBackground: "#161c28",
    pattern: "graph",
    textInk: "#e8f4ff",
  },
  "parchment-fiber": {
    id: "parchment-fiber",
    label: "羊皮纸纹",
    backgroundImage: "/scratch-bg/parchment-fiber.svg",
    fallbackBackground: "#f6f0e6",
    pattern: "lined",
    textInk: "#3d342c",
  },
  "linen-soft": {
    id: "linen-soft",
    label: "亚麻柔白",
    backgroundImage: "/scratch-bg/linen-soft.svg",
    fallbackBackground: "#faf8f5",
    pattern: "graph",
  },
}

export const resolveSurface = (surfaceId?: ScratchSurfaceId | string | null): ScratchSurfaceDef => {
  if (surfaceId && surfaceId in SCRATCH_SURFACES) {
    return SCRATCH_SURFACES[surfaceId as ScratchSurfaceId]
  }
  if (surfaceId === "bear-journal" || surfaceId === "soft-mist" || surfaceId === "peach-wash") {
    return SCRATCH_SURFACES["caelum-mica"]
  }
  if (surfaceId === "mint-breeze") {
    return SCRATCH_SURFACES["linen-soft"]
  }
  if (surfaceId === "kraft-paper") {
    return SCRATCH_SURFACES["parchment-fiber"]
  }
  if (surfaceId === "night-glow") {
    return SCRATCH_SURFACES["neon-grid"]
  }
  return SCRATCH_SURFACES.none
}
