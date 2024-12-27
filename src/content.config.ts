import { z, defineCollection } from 'astro:content'
import { glob, file } from 'astro/loaders'

const categoriesCollection = defineCollection({
	type: 'content',
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			icon: z.string(),
			featured: z.boolean(),
			description: z.string(),
			image: image(),
			imageAlt: z.string()
		})
})

const faqsCollection = defineCollection({
	loader: file('src/data/faqs.json'),
	schema: z.object({
		question: z.string(),
		answer: z.string(),
		location: z.string().optional()
	})
})

const postsCollection = defineCollection({
	type: 'content',
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			pubDate: z.date(),
			description: z.string(),
			author: z.string(),
			image: image(),
			imageAlt: z.string(),
			tags: z.array(z.string())
		})
})

const recipesCollection = defineCollection({
	loader: glob({ pattern: 'src/data/recipes/*.md' }),
	schema: ({ image }) =>
		z.object({
			author: z.string(),
			description: z.string(),
			homeFeatured: z.boolean().optional(),
			image: image(),
			imageAlt: z.string(),
			ingredients: z.array(
				z.object({
					name: z.string(),
					quantity: z.string()
				})
			),
			instructions: z.array(z.string()),
			pubDate: z.date(),
			tags: z.array(z.string()),
			title: z.string()
		})
})

export const collections = {
	categories: categoriesCollection,
	faqs: faqsCollection,
	posts: postsCollection,
	recipes: recipesCollection
}
