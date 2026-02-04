import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getPostBySlug, getAllSlugs } from "@/lib/blog"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return { title: "Post Not Found | ADAgent" }
  }

  return {
    title: `${post.title} | ADAgent Blog`,
    description: post.excerpt,
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <Link
        href="/blog"
        className="inline-flex items-center text-sm text-[#8a8f98] hover:text-[#f7f8f8] mb-8 transition-colors"
      >
        ← Back to Blog
      </Link>

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-medium text-[#5e6ad2] bg-[#5e6ad2]/10 px-2 py-1 rounded">
              {post.category}
            </span>
            {post.featured && (
              <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                Featured
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-[#f7f8f8] mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-[#6b7280]">
            <span>{post.author.name}</span>
            <span>•</span>
            <span>{formatDate(post.date)}</span>
            <span>•</span>
            <span>{post.readTime}</span>
          </div>
        </header>

        <div className="prose prose-invert prose-sm max-w-none">
          {post.isPortableText ? (
            <div className="text-[#c9ccd1] leading-relaxed whitespace-pre-wrap">
              {/* For Portable Text, extract plain text for now */}
              {Array.isArray(post.content)
                ? post.content
                    .filter((block: any) => block._type === "block")
                    .map((block: any, i: number) => (
                      <p key={i} className="mb-4">
                        {block.children?.map((child: any) => child.text).join("")}
                      </p>
                    ))
                : post.content}
            </div>
          ) : (
            <div
              className="text-[#c9ccd1] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.content as string }}
            />
          )}
        </div>
      </article>
    </div>
  )
}
