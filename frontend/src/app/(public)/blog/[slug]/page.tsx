import { Metadata } from "next"
import { connection } from "next/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { BlogContent } from "./blog-post-content"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const { getPostBySlug } = await import("@/lib/blog")
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
  await connection()
  const { getPostBySlug, getAllPosts } = await import("@/lib/blog")
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // Get all posts for prev/next navigation
  const allPosts = await getAllPosts()
  const sortedPosts = allPosts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const currentIndex = sortedPosts.findIndex((p) => p.slug === slug)
  const prevPost = currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : null
  const nextPost = currentIndex > 0 ? sortedPosts[currentIndex - 1] : null

  return (
    <div className="min-h-screen bg-[#08090a]">
      <main className="pt-16 pb-24">
        {/* Article container - Linear style centered layout */}
        <article className="mx-auto max-w-[900px] px-6">
          {/* Breadcrumbs - Linear style, centered */}
          <nav aria-label="Breadcrumbs" className="mb-4 flex justify-center">
            <ol className="flex items-center gap-2 text-[13px] leading-[1.5] text-[#8a8f98]">
              <li>
                <Link
                  href="/blog"
                  className="hover:text-[#f7f8f8] transition-colors duration-150"
                >
                  Blog
                </Link>
              </li>
              {post.category && (
                <>
                  <li>/</li>
                  <li>
                    <span className="capitalize">{post.category}</span>
                  </li>
                </>
              )}
            </ol>
          </nav>

          {/* Title - Linear style: 48px, centered */}
          <h1 className="text-[48px] font-[590] leading-[1.1] tracking-[-0.022em] text-[#f7f8f8] text-center mb-10">
            {post.title}
          </h1>

          {/* Cover image from Sanity, gradient fallback for posts without */}
          {post.coverImage ? (
            <div className="mb-10 rounded-lg overflow-hidden">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="mb-10 aspect-[21/9] rounded-lg overflow-hidden bg-gradient-to-br from-[#18191b] to-[#0d0e0f] flex items-center justify-center">
              <div className="text-[#2a2a2e] text-9xl font-semibold opacity-10">
                {post.title.charAt(0)}
              </div>
            </div>
          )}

          {/* Author + Date - Linear style meta, centered */}
          <div className="flex items-center justify-center text-[15px] leading-[1.5] text-[#8a8f98] mb-12">
            <span>{post.author.name}</span>
            <span className="mx-2">·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>

          {/* Content area - Linear style prose with max-width 624px for readability */}
          <div className="mx-auto max-w-[624px]">
            <BlogContent content={post.content} isPortableText={post.isPortableText} />
          </div>

          {/* Previous / Next Navigation */}
          <div className="mx-auto max-w-[624px] mt-16 pt-10 border-t border-[#1a1b1d]">
            <div className="grid grid-cols-2 gap-8">
              {/* Previous Post */}
              <div>
                {prevPost ? (
                  <Link href={`/blog/${prevPost.slug}`} className="group block">
                    <span className="text-[13px] text-[#6b6f76] mb-2 block">
                      ← Previous
                    </span>
                    <span className="text-[15px] text-[#8a8f98] group-hover:text-[#f7f8f8] transition-colors duration-150 line-clamp-2">
                      {prevPost.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
              </div>

              {/* Next Post */}
              <div className="text-right">
                {nextPost ? (
                  <Link href={`/blog/${nextPost.slug}`} className="group block">
                    <span className="text-[13px] text-[#6b6f76] mb-2 block">
                      Next →
                    </span>
                    <span className="text-[15px] text-[#8a8f98] group-hover:text-[#f7f8f8] transition-colors duration-150 line-clamp-2">
                      {nextPost.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}
