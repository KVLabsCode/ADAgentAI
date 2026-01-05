import { getAllPosts } from "@/lib/blog"
import { BlogList } from "./blog-list"

export const dynamic = "force-dynamic"
export const revalidate = 60 // Revalidate every 60 seconds

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Blog
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Product updates, tips, and insights on ad monetization.
            </p>
          </div>
        </div>
      </section>

      <BlogList posts={posts} />

      {/* Newsletter CTA */}
      <section className="py-12 border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h2 className="text-base font-medium">Stay updated</h2>
            <p className="text-xs text-muted-foreground">
              Get the latest posts and product updates delivered to your inbox.
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-8 px-3 text-xs rounded-md border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button className="h-8 px-3 text-xs font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
