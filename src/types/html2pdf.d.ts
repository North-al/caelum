declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number | number[]
    filename?: string
    image?: { type?: string; quality?: number }
    html2canvas?: Record<string, unknown>
    jsPDF?: Record<string, unknown>
    pagebreak?: Record<string, unknown>
    [key: string]: unknown
  }

  interface Html2PdfWorker {
    set: (options: Html2PdfOptions) => Html2PdfWorker
    from: (element: HTMLElement | string) => Html2PdfWorker
    toPdf: () => Html2PdfWorker
    get: (name: string) => Promise<any>
    outputPdf: (type: string) => Promise<any>
    save: () => Promise<void>
  }

  interface Html2PdfStatic {
    (): Html2PdfWorker
    (element: HTMLElement, options?: Html2PdfOptions): Html2PdfWorker
  }

  const html2pdf: Html2PdfStatic
  export default html2pdf
}
