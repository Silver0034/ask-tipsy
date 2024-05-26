// Import utilities from `astro:content`
import { z, defineCollection } from 'astro:content'
// Define a `type` and `schema` for each collection
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

// Export a single `collections` object to register your collection(s)
export const collections = {
	categories: categoriesCollection,
	posts: postsCollection,
	recipes: recipesCollection
}
