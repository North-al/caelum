import type { FileNode } from "~/components/App/FileTree/types"
import { getFileExtension, isMarkdownPath } from "~/lib/file-types"

/** Expand Obsidian-style wiki links into markdown hash-links for preview rendering. */
export const expandWikiLinks = (markdown: string) =>
  markdown.replace(
    /\[\[([^\]|#]+)(?:\|([^\]]+))?(?:#([^\]]+))?\]\]/g,
    (_match, rawStem: string, alias?: string, hash?: string) => {
      const stem = rawStem.trim()
      if (!stem) {
        return _match
      }
      const label = (alias?.trim() || stem).replace(/[[\]]/g, "")
      const href = `#wiki/${encodeURIComponent(stem)}${hash ? `/${encodeURIComponent(hash.trim())}` : ""}`
      return `[${label}](${href})`
    }
  )

const stemOfPath = (path: string) => {
  const name = path.split(/[\\/]/).pop() ?? path
  return name.replace(/\.[^.]+$/, "")
}

/** Resolve `[[stem]]` to a workspace file path (prefer markdown). */
export const resolveWikiStem = (tree: FileNode[], stem: string): string | null => {
  const target = stem.trim().toLowerCase()
  if (!target) {
    return null
  }

  let markdownHit: string | null = null
  let anyHit: string | null = null

  const walk = (nodes: FileNode[]) => {
    for (const node of nodes) {
      if (node.type === "file") {
        const fileStem = stemOfPath(node.path).toLowerCase()
        const base = (node.path.split(/[\\/]/).pop() ?? "").toLowerCase()
        if (fileStem === target || base === target) {
          if (isMarkdownPath(node.path)) {
            markdownHit = node.path
            return
          }
          if (!anyHit) {
            anyHit = node.path
          }
        }
        // also allow full filename match without worrying about extension in target
        if (base === `${target}.${getFileExtension(node.path)}`) {
          if (!anyHit) {
            anyHit = node.path
          }
        }
      }
      if (node.children?.length) {
        walk(node.children)
        if (markdownHit) {
          return
        }
      }
    }
  }

  walk(tree)
  return markdownHit ?? anyHit
}

export const isWikiHref = (href: string) => href.startsWith("#wiki/")

export const parseWikiHref = (href: string) => {
  if (!isWikiHref(href)) {
    return null
  }
  const body = href.slice("#wiki/".length)
  const [stemPart, hashPart] = body.split("/")
  return {
    stem: decodeURIComponent(stemPart || ""),
    hash: hashPart ? decodeURIComponent(hashPart) : "",
  }
}
