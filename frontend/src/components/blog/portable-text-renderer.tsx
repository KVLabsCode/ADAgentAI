"use client"

import Image from "next/image"
import { PortableText, type PortableTextComponents } from "@portabletext/react"
import type { PortableTextBlock } from "@/lib/sanity"

function getSanityImageUrl(ref: string): string {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const fileName = ref
    .replace("image-", "")
    .replace("-jpg", ".jpg")
    .replace("-png", ".png")
    .replace("-webp", ".webp")
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${fileName}`
}

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold tracking-tight mt-10 mb-4 text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold tracking-tight mt-8 mb-3 text-foreground">
        {children}
      </h3>
    ),
    normal: ({ children }) => (
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-border pl-4 my-6 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-4 ml-4 space-y-2">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="my-4 ml-4 space-y-2 list-decimal">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="text-sm text-muted-foreground leading-relaxed flex gap-2">
        <span className="text-emerald-500 mt-1">*</span>
        <span>{children}</span>
      </li>
    ),
    number: ({ children }) => (
      <li className="text-sm text-muted-foreground leading-relaxed">
        {children}
      </li>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-foreground/80">{children}</em>
    ),
    code: ({ children }) => (
      <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-foreground">
        {children}
      </code>
    ),
    highlight: ({ children }) => (
      <mark className="bg-yellow-200/50 dark:bg-yellow-900/50 px-1 rounded">
        {children}
      </mark>
    ),
    link: ({ value, children }) => (
      <a
        href={value?.href}
        className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
        target={value?.href?.startsWith("http") ? "_blank" : undefined}
        rel={value?.href?.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    ),
  },
  types: {
    image: ({ value }) => (
      <figure className="my-8">
        <div className="relative w-full aspect-video">
          <Image
            src={getSanityImageUrl(value.asset._ref)}
            alt={value.alt || ""}
            fill
            className="rounded-lg object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
        {value.caption && (
          <figcaption className="text-xs text-muted-foreground text-center mt-2">
            {value.caption}
          </figcaption>
        )}
      </figure>
    ),
    code: ({ value }) => (
      <pre className="my-6 p-4 rounded-lg bg-muted overflow-x-auto">
        <code className="text-xs font-mono text-foreground">
          {value.code}
        </code>
      </pre>
    ),
  },
}

interface PortableTextRendererProps {
  content: PortableTextBlock[]
}

export function PortableTextRenderer({ content }: PortableTextRendererProps) {
  return (
    <div className="prose-content">
      <PortableText value={content} components={components} />
    </div>
  )
}
