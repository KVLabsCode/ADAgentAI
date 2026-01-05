import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Twitter, Linkedin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getPostBySlug, getRelatedPosts, getAllSlugs } from "@/lib/blog"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PortableTextRenderer } from "@/components/blog/portable-text-renderer"
import type { PortableTextBlock } from "@/lib/sanity"

export const dynamic = "force-dynamic"
export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const [post, relatedPosts] = await Promise.all([
    getPostBySlug(slug),
    getRelatedPosts(slug),
  ])

  if (!post) {
    notFound()
  }

  return (
    <article className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to blog
          </Link>

          {/* Header */}
          <header className="mb-8">
            <Badge variant="outline" className="mb-4 text-[10px]">
              {post.category}
            </Badge>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
              {post.title}
            </h1>
            <p className="text-muted-foreground mb-6">
              {post.excerpt}
            </p>

            {/* Meta */}
            <div className="flex items-center justify-between py-4 border-y border-border/50">
              <div className="flex items-center gap-3">
                {post.author.image ? (
                  <img
                    src={post.author.image}
                    alt={post.author.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-semibold">
                    {post.author.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium">{post.author.name}</p>
                  <p className="text-[11px] text-muted-foreground">{post.author.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(post.date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{post.readTime}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          {post.isPortableText ? (
            <PortableTextRenderer content={post.content as PortableTextBlock[]} />
          ) : (
            <div className="prose-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
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
                  p: ({ children }) => (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-4 ml-4 space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-4 ml-4 space-y-2 list-decimal">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                      <span className="text-emerald-500 mt-1">*</span>
                      <span>{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-foreground/80">{children}</em>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-border pl-4 my-6 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-foreground">
                      {children}
                    </code>
                  ),
                  hr: () => (
                    <hr className="my-8 border-border/50" />
                  ),
                }}
              >
                {post.content as string}
              </ReactMarkdown>
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 p-5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-border/50">
            <p className="text-sm font-medium mb-2">Ready to simplify your ad management?</p>
            <p className="text-xs text-muted-foreground mb-4">
              Join our early access program and start asking questions today.
            </p>
            <Button asChild size="sm" className="h-8 text-xs">
              <Link href="/login">Get started free</Link>
            </Button>
          </div>

          {/* Share */}
          <div className="mt-10 pt-6 border-t border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Share this article</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://adagent.ai/blog/${slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://adagent.ai/blog/${slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* More posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-10 pt-8 border-t border-border/50">
              <h2 className="text-sm font-medium mb-4">More from the blog</h2>
              <div className="grid gap-3">
                {relatedPosts.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium group-hover:text-foreground/80 transition-colors">
                        {p.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{p.readTime}</p>
                    </div>
                    <ArrowLeft className="h-3 w-3 text-muted-foreground rotate-180" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
