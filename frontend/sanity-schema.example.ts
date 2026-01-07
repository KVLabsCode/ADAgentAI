/**
 * Sanity Studio Schema for Blog Posts
 *
 * To use this:
 * 1. Create a new Sanity project at https://sanity.io/get-started
 * 2. Install Sanity CLI: npm install -g @sanity/cli
 * 3. Initialize Sanity Studio: sanity init
 * 4. Copy this schema to your Sanity Studio schemas folder
 * 5. Update your .env.local with the project ID and dataset
 *
 * Schema: Post
 */

// Sanity validation rule type (simplified for example schema)
interface SanityRule {
  required: () => SanityRule
  max: (n: number) => SanityRule
}

export const postSchema = {
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule: SanityRule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule: SanityRule) => Rule.required(),
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Brief description for SEO and previews (max 160 characters)',
      validation: (Rule: SanityRule) => Rule.max(160),
    },
    {
      name: 'content',
      title: 'Content',
      type: 'text', // or 'array' with block content for rich text
      description: 'Main blog post content (supports Markdown)',
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Product', value: 'Product' },
          { title: 'Company', value: 'Company' },
          { title: 'Education', value: 'Education' },
          { title: 'Tips', value: 'Tips' },
        ],
        layout: 'radio',
      },
      validation: (Rule: SanityRule) => Rule.required(),
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Published', value: 'published' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
    },
    {
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Show this post as featured on the blog page',
      initialValue: false,
    },
    {
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    },
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      category: 'category',
    },
    prepare({ title, status, category }: { title: string; status: string; category: string }) {
      return {
        title,
        subtitle: `${status === 'published' ? '✓' : '○'} ${category || 'Uncategorized'}`,
      }
    },
  },
}

/**
 * Schema: Author
 */
export const authorSchema = {
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule: SanityRule) => Rule.required(),
    },
    {
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g., "Product", "Engineering", "Growth"',
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
  ],
}
