import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeHighlight from "rehype-highlight"

/** Shared remark pipeline: GFM + math ($...$ / $$...$$). */
export const markdownRemarkPlugins = [remarkGfm, remarkMath]

/** Shared rehype pipeline: KaTeX, optionally highlight.js. */
export const getMarkdownRehypePlugins = (codeHighlight = true) => {
  if (codeHighlight) {
    return [rehypeKatex, rehypeHighlight]
  }
  return [rehypeKatex]
}
