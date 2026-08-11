import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeHighlight from "rehype-highlight"

/** Shared remark pipeline: GFM + math ($...$ / $$...$$). */
export const markdownRemarkPlugins = [remarkGfm, remarkMath]

/** Shared rehype pipeline: KaTeX, optionally highlight.js. */
export const getMarkdownRehypePlugins = (codeHighlight = true) => {
  if (codeHighlight) {
    return [
      rehypeKatex,
      // Mermaid must stay plain text — highlighting splits tokens and can drop newlines
      // (e.g. "mindmap" + "root" → "mindmaproot"), which breaks the parser.
      [rehypeHighlight, { plainText: ["mermaid"] }] as [
        typeof rehypeHighlight,
        { plainText: string[] },
      ],
    ]
  }
  return [rehypeKatex]
}
