import fs from "fs"
import path from "path"
import matter from "gray-matter"
import readingTime from "reading-time"

const BLOG_DIR = path.join(process.cwd(), "content/blog")

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  date: string
  readTime: string
  author: {
    name: string
    role: string
  }
  category: string
  featured: boolean
  content: string
}

export interface BlogPostMeta {
  slug: string
  title: string
  excerpt: string
  date: string
  readTime: string
  author: {
    name: string
    role: string
  }
  category: string
  featured: boolean
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return []
  }

  const files = fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith(".mdx"))

  const posts = files.map((file) => {
    const slug = file.replace(".mdx", "")
    const filePath = path.join(BLOG_DIR, file)
    const fileContent = fs.readFileSync(filePath, "utf-8")
    const { data, content } = matter(fileContent)
    const { text: readTime } = readingTime(content)

    return {
      slug,
      title: data.title || "",
      excerpt: data.excerpt || "",
      date: data.date || "",
      readTime,
      author: {
        name: data.author?.name || "ADAgent Team",
        role: data.author?.role || "",
      },
      category: data.category || "",
      featured: data.featured || false,
    }
  })

  // Sort by date descending
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContent = fs.readFileSync(filePath, "utf-8")
  const { data, content } = matter(fileContent)
  const { text: readTime } = readingTime(content)

  return {
    slug,
    title: data.title || "",
    excerpt: data.excerpt || "",
    date: data.date || "",
    readTime,
    author: {
      name: data.author?.name || "ADAgent Team",
      role: data.author?.role || "",
    },
    category: data.category || "",
    featured: data.featured || false,
    content,
  }
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return []
  }

  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(".mdx", ""))
}
