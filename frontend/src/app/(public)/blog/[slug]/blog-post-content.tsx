"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PortableText } from "@portabletext/react"
import type { PortableTextBlock } from "@/lib/sanity"

interface BlogContentProps {
  content: string | PortableTextBlock[]
  isPortableText: boolean
}

// Linear-style typography classes
const proseClasses = `
  prose prose-invert max-w-none
  prose-p:text-[17px] prose-p:leading-[1.6] prose-p:text-[#d0d6e0] prose-p:mb-5
  prose-h2:text-[32px] prose-h2:font-[590] prose-h2:leading-[1.25] prose-h2:tracking-[-0.02em] prose-h2:text-[#f7f8f8] prose-h2:mt-14 prose-h2:mb-4
  prose-h3:text-[24px] prose-h3:font-[590] prose-h3:leading-[1.33] prose-h3:tracking-[-0.012em] prose-h3:text-[#f7f8f8] prose-h3:mt-14 prose-h3:mb-4
  prose-h4:text-[20px] prose-h4:font-[590] prose-h4:leading-[1.4] prose-h4:tracking-[-0.01em] prose-h4:text-[#f7f8f8] prose-h4:mt-10 prose-h4:mb-3
  prose-a:text-[#f7f8f8] prose-a:underline prose-a:decoration-[#5e6ad2] prose-a:underline-offset-2 hover:prose-a:decoration-[#7c85e0]
  prose-strong:text-[#f7f8f8] prose-strong:font-[590]
  prose-blockquote:border-l-2 prose-blockquote:border-[#3a3d42] prose-blockquote:pl-5 prose-blockquote:text-[17px] prose-blockquote:leading-[1.6] prose-blockquote:text-[#d0d6e0] prose-blockquote:not-italic prose-blockquote:my-6
  prose-ul:text-[17px] prose-ul:leading-[1.6] prose-ul:text-[#d0d6e0] prose-ul:my-5
  prose-ol:text-[17px] prose-ol:leading-[1.6] prose-ol:text-[#d0d6e0] prose-ol:my-5
  prose-li:text-[#d0d6e0] prose-li:mb-2
  prose-code:text-[15px] prose-code:bg-[#1a1b1d] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#f7f8f8] prose-code:before:content-none prose-code:after:content-none
  prose-pre:bg-[#141516] prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-6
  prose-hr:border-[#1a1b1d] prose-hr:my-10
`

// Portable Text components for Linear-style rendering
const portableTextComponents = {
  block: {
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-[17px] leading-[1.6] text-[#d0d6e0] mb-5">{children}</p>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-[32px] font-[590] leading-[1.25] tracking-[-0.02em] text-[#f7f8f8] mt-14 mb-4">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-[24px] font-[590] leading-[1.33] tracking-[-0.012em] text-[#f7f8f8] mt-14 mb-4">
        {children}
      </h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="text-[20px] font-[590] leading-[1.4] tracking-[-0.01em] text-[#f7f8f8] mt-10 mb-3">
        {children}
      </h4>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-2 border-[#3a3d42] pl-5 my-6 text-[17px] leading-[1.6] text-[#d0d6e0]">
        {children}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="text-[#f7f8f8] font-[590]">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic">{children}</em>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
      <code className="text-[15px] bg-[#1a1b1d] px-1.5 py-0.5 rounded text-[#f7f8f8]">
        {children}
      </code>
    ),
    link: ({ value, children }: { value?: { href?: string }; children?: React.ReactNode }) => (
      <a
        href={value?.href}
        className="text-[#f7f8f8] underline decoration-[#5e6ad2] underline-offset-2 hover:decoration-[#7c85e0] transition-colors"
      >
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <ul className="text-[17px] leading-[1.6] text-[#d0d6e0] my-5 list-disc pl-5">
        {children}
      </ul>
    ),
    number: ({ children }: { children?: React.ReactNode }) => (
      <ol className="text-[17px] leading-[1.6] text-[#d0d6e0] my-5 list-decimal pl-5">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <li className="text-[#d0d6e0] mb-2">{children}</li>
    ),
    number: ({ children }: { children?: React.ReactNode }) => (
      <li className="text-[#d0d6e0] mb-2">{children}</li>
    ),
  },
}

export function BlogContent({ content, isPortableText }: BlogContentProps) {
  if (isPortableText && Array.isArray(content)) {
    return (
      <div className="space-y-0">
        <PortableText value={content} components={portableTextComponents} />
      </div>
    )
  }

  // Markdown content
  return (
    <div className={proseClasses}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content as string}
      </ReactMarkdown>
    </div>
  )
}
