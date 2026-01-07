import {defineField, defineType} from 'sanity'

export const post = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'meta', title: 'Meta'},
  ],
  fields: [
    // Main content fields - Medium style
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
      group: 'content',
      description: 'Optional subtitle or hook',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      group: 'content',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Code', value: 'code'},
              {title: 'Highlight', value: 'highlight'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {
              name: 'caption',
              type: 'string',
              title: 'Caption',
            },
            {
              name: 'alt',
              type: 'string',
              title: 'Alt text',
            },
          ],
        },
        {
          type: 'code',
          title: 'Code Block',
          options: {
            language: 'javascript',
            languageAlternatives: [
              {title: 'JavaScript', value: 'javascript'},
              {title: 'TypeScript', value: 'typescript'},
              {title: 'Python', value: 'python'},
              {title: 'HTML', value: 'html'},
              {title: 'CSS', value: 'css'},
              {title: 'JSON', value: 'json'},
              {title: 'Bash', value: 'bash'},
            ],
          },
        },
      ],
    }),

    // Meta fields
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      group: 'meta',
      rows: 3,
      description: 'Brief summary for previews and SEO',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      group: 'meta',
      options: {hotspot: true},
      description: 'Optional cover image for the post',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          {title: 'Education', value: 'Education'},
          {title: 'Tutorial', value: 'Tutorial'},
          {title: 'News', value: 'News'},
          {title: 'Tips', value: 'Tips'},
          {title: 'Product', value: 'Product'},
        ],
      },
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      group: 'meta',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'meta',
      initialValue: false,
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          {title: 'Draft', value: 'draft'},
          {title: 'Published', value: 'published'},
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
    }),

    // Author fields (auto-filled)
    defineField({
      name: 'authorId',
      title: 'Author ID',
      type: 'string',
      hidden: true,
      initialValue: (params, {currentUser}) => currentUser?.id,
    }),
    defineField({
      name: 'authorName',
      title: 'Author',
      type: 'string',
      group: 'meta',
      readOnly: true,
      initialValue: (params, {currentUser}) => currentUser?.name,
    }),
    defineField({
      name: 'authorEmail',
      title: 'Author Email',
      type: 'string',
      hidden: true,
      initialValue: (params, {currentUser}) => currentUser?.email,
    }),
    defineField({
      name: 'authorImage',
      title: 'Author Image',
      type: 'string',
      hidden: true,
      initialValue: (params, {currentUser}) => currentUser?.profileImage,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'subtitle',
      authorName: 'authorName',
      media: 'coverImage',
      status: 'status',
    },
    prepare({title, subtitle, authorName, media, status}) {
      return {
        title: title,
        subtitle: `${status === 'draft' ? '📝 ' : '✓ '}${authorName || 'Unknown'} ${subtitle ? `— ${subtitle}` : ''}`,
        media,
      }
    },
  },
  orderings: [
    {
      title: 'Publish Date, New',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
})
