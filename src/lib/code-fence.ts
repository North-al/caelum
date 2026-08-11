import { isValidElement, type ReactNode } from "react"

export const extractReactText = (node: ReactNode): string => {
  if (node == null || typeof node === "boolean") {
    return ""
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(extractReactText).join("")
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractReactText(node.props.children)
  }
  return ""
}

export const languageFromClassName = (className?: string) => {
  if (!className) {
    return ""
  }
  const match = /language-([a-z0-9_+-]+)/i.exec(className)
  return match?.[1]?.toLowerCase() ?? ""
}

export const getFencedCodeMeta = (children: ReactNode) => {
  const candidate = Array.isArray(children)
    ? children.find((child) => isValidElement(child) && child.type === "code")
    : children

  if (isValidElement<{ className?: string; children?: ReactNode }>(candidate) && candidate.type === "code") {
    return {
      className: candidate.props.className,
      language: languageFromClassName(candidate.props.className),
      body: candidate.props.children,
      text: extractReactText(candidate.props.children),
    }
  }

  return {
    className: undefined as string | undefined,
    language: "",
    body: children,
    text: extractReactText(children),
  }
}
