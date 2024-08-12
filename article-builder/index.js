import 'dotenv/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

if (!process.env.GEMINI_API_KEY) {
	console.error('GEMINI_API_KEY is not set')
	process.exit(1)
}

let rateLimiter = 0

console.log('Starting...')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

async function getURLSFromFile(filepath) {
	const urls = await fs.readFileSync(filepath, 'utf8').split('\n')

	// Remove \r from each URL
	urls.map((url) => url.replace(/\r/g, ''))

	return urls
}

async function getResponse(prompt) {
	// save the current timestamp in milliseconds to rate limit the requests
	const currentTimestamp = new Date().getTime()
	if (currentTimestamp - rateLimiter < 10000) {
		await new Promise((resolve) => setTimeout(resolve, 10000))
	}
	rateLimiter = currentTimestamp
	const result = await model.generateContent(prompt)
	let response

	try {
		response = await result.response
		return response.text()
	} catch (e) {
		console.log('Error generating content:', e)
	}

	return ''
}

const sanitizeURL = (url) => {
	url = url.replace(/\r/g, '')
	return url
}

async function rateArticleRelevance(url) {
	if (!url || url === '') return 1
	const prompt =
		'You are a SEO expert writing blog posts and recipe pages for a famous Cocktail Recipe website called Ask Tipsy. You are tasked with looking at the sitemaps of competitor websites and rating on a scale of 1-10 how relevant the article would be to a Cocktail Recipe website. We do not want to use AI for product articles, so if the article seems like it is directly reviewing a product, or comparing brands, rate it a "1". If the article is not related to cocktails or mocktails, say "1". If the article is very relevant to a Cocktail Recipe website, say "10". You are only able to say the number of your score. You never say any words except for the number you rate the url. For example, given the url has the path "/recipes/wings" or "/article/best-rum-brands", you would say "1". If you are given a URL with the path "/recipes/old-fashioned/" or "/recipes/why-make-mocktails-for-parties/", you would say "10". Please rate the relevance of the following URL: ' +
		sanitizeURL(url)

	let response = ''
	try {
		response = await getResponse(prompt)
	} catch (e) {
		console.log('Error getting response:', e)
		return 1
	}

	// Try to JSON parse the response
	let score = 1

	// Convert string to number
	try {
		score = parseInt(response)
	} catch (e) {
		console.log('Error parsing response:', e)
		return 1
	}

	return score
}

async function decideIfArticleOrRecipe(url) {
	const prompt =
		'You are a SEO expert writing blog posts and recipe pages for a famous Cocktail Recipe website called Ask Tipsy. You are going to be given a URL from the sitemap of a competitor and you are going to be tasked with deciding if you think it would make more sense to write an article or a recipe to compete with it. If it makes more sense for Ask Tipsy to write an article to compete with the URL, say "article". If it makes more sense for Ask Tipsy to write a recipe to compete with the URL, say "recipe". You are only able to say the word "article" or "recipe". You never say any other words. For example, given the URL "https://www.liquor.com/old-fashioned/", you would say "recipe". Given the URL "https://www.liquor.com/the-best-tequila-for-margaritas/" you would say "article". Please decide if the following URL should be an article or a recipe: ' +
		sanitizeURL(url)

	const response = await getResponse(prompt)

	if (response.includes('recipe')) {
		return 'recipes'
	}

	return 'articles'
}

async function wouldArticleBeUnique(competitorURL, existingURLs) {
	if (existingURLs.length === 0) {
		return 'true'
	}
	const prompt =
		'You are an SEO expert responsible for optimizing content on a well-known cocktail recipe website called Ask Tipsy. Your task is to analyze whether a new page should be created to compete with a URL from a competitor’s sitemap. You will be provided with a URL from a competitor’s website and a list of existing URLs on our site. Your job is to determine if we already have a page that competes with the competitor’s URL. If we already have a competing page (i.e., a similar or equivalent page), respond with "false." If we do not have a competing page and should create one, respond with "true." For example, if the competitor URL is "https://www.liquor.com/margarita-recipe/" and our existing URLs include "/margarita", respond with "false" because the content is already covered. If the url is https://www.liquor.com/strawberry-margarita-recipe/ and our existing URLs only include "/margarita", respond with "true". The competitor URL is: ' +
		sanitizeURL(competitorURL) +
		'. The existing URLs are: ' +
		existingURLs.join(', ')

	const response = await getResponse(prompt)

	if (response.includes('true')) {
		return true
	}

	return false
}

async function createFocusKeyPhrase(url) {
	const prompt =
		'You are an SEO expert responsible for optimizing content on a well-known cocktail recipe website called Ask Tipsy. Your task is to analyze a competitor\'s URL and infer the best SEO focus key phrase that our site should target when creating a new page to compete. Consider the content, keywords, and structure of the competitor\'s URL to determine the most effective key phrase. The key phrase should be specific, relevant, and likely to attract organic traffic. For example, if the competitor URL is "https://www.liquor.com/margarita-recipe/," a suitable key phrase might be "classic margarita recipe" or "how to make a margarita". You can only say the key phrase, only include the key phrase in your response and nothing else. Please provide the focus key phrase for the following URL: ' +
		sanitizeURL(url)

	const response = await getResponse(prompt)

	return response
}

async function getResearchTopicsForKeyPhrase(keyPhrase) {
	const prompt =
		'You are a research expert and content planner for the cocktail recipe website Ask Tipsy. Your task is to provide a list of topics and specific information that should be researched to create a comprehensive and engaging article based on the given key phrase. The list should include various aspects that will help in writing a compelling article and cover different angles related to the key phrase. For example, if the key phrase is "best margarita mix," some research topics might include: Best-selling margarita mix brands and popular flavors. Key ingredients used in margarita mixes.Comparison of store-bought vs. homemade margarita mixes. Consumer reviews and ratings for different margarita mixes. Tips for selecting the best margarita mix for different occasions. Please provide a list of research topics and information for the following key phrase: ' +
		keyPhrase

	const response = await getResponse(prompt)

	return response
}

async function getCategoriesFromKeyPhrase(keyPhrase) {
	const existingCategories = await getCurrentCategories()

	const prompt =
		'You are an SEO and content categorization expert for the cocktail recipe website Ask Tipsy. Your task is to analyze a provided focus key phrase and return a JSON array of relevant categories from a given list to tag the article with. The categories should be the most appropriate and related to the key phrase, ensuring that the article is properly classified for both user navigation and SEO. For example, if the focus key phrase is "classic margarita recipe" and the available categories are ["classic", "tequila", "gin", "punches"], the output might be ["tequila", "classic"]. You can only say the JSON array of categories, only include the JSON array in your response and nothing else. Please provide the relevant categories for the focus key phrase: ' +
		keyPhrase +
		'. The available categories are: ' +
		JSON.stringify(existingCategories)

	const response = await getResponse(prompt)

	// Try to parse the response as JSON
	let categories = []

	try {
		categories = JSON.parse(response)
	} catch (e) {
		console.log('Error parsing response:', e)
	}

	return categories
}

async function createTitleFromKeyPhrase(keyPhrase) {
	const prompt =
		'As an experienced writer for Ask Tipsy, a leading cocktail recipe website, your task is to craft a persuasive and SEO-optimized article title based on a given focus key phrase. The title should be clear, appealing, and designed to draw in readers while effectively utilizing the key phrase. For example, if the focus key phrase is "classic daiquiri recipe," an appropriate title could be "A simple guide to make a Classic Daiquiri". You can only say the title, only include the title in your response and nothing else. The title must be fewer than 40 characters long. Please create a title based on the focus key phrase: ' +
		keyPhrase

	const response = await getResponse(prompt)

	return response.trim().replace(/\r?\n|\r/g, '')
}

async function createSlugFromKeyPhrase(keyPhrase) {
	const prompt =
		'As an SEO expert for Ask Tipsy, a leading cocktail recipe site, your job is to generate an optimized slug for a new page using a provided focus key phrase. The slug should be short, descriptive, and include the key phrase to enhance search engine visibility. For instance, if the key phrase is "classic margarita," a possible slug could be "classic-margarita. Don\'t put the word recipe or cocktail in the slug because it is already going to be in the filepath, so if the key phrase is "classic margarita recipe", the slug would be "classic-margarita". You can only say the slug, only include the slug in your response and nothing else. Please create a slug based on the focus key phrase: ' +
		keyPhrase

	const response = await getResponse(prompt)

	// Remove any spaces
	return response.trim().replace(/\s/g, '-')
}

async function createMetaDescriptionFromKeyPhrase(keyPhrase) {
	const prompt =
		'You are an SEO expert and content writer for the cocktail recipe website Ask Tipsy. Your task is to create a concise and compelling meta description for an article based on a given focus key phrase. The meta description must be exactly 115 characters long. It may not be longer or shorter. Include the key phrase naturally, and provide a brief, enticing summary of the article to encourage clicks. For example, if the focus key phrase is "easy margarita recipe," a suitable meta description might be "Learn how to make an easy margarita with our recipe. Perfect for any occasion, this classic cocktail is a must-try!". You can only say the 115-character-long meta description, only include the meta description in your response and nothing else. Please create a 115-character-long meta description based on the focus key phrase: ' +
		keyPhrase

	const response = await getResponse(prompt)

	return response.trim().replace(/\r?\n|\r/g, '')
}

async function createImageDescriptionFromKeyPhrase(keyPhrase) {
	const prompt =
		'You are an expert content creator for the cocktail recipe website Ask Tipsy. Your task is to generate a detailed and descriptive image caption based on the provided key phrase. The description should be vivid and specific. It should include key elements, colors, and features that should be depicted in the image. For example, if the key phrase is "classic mojito," a suitable image description might be: "A refreshing classic mojito served in a tall glass with crushed ice, garnished with fresh mint leaves and a lime wedge. The drink has a vibrant green color and is topped with a splash of sparkling club soda, set against a summer outdoor backdrop.". The description must be 2 sentences in length or shorter. Please provide an image description for the following key phrase: ' +
		keyPhrase

	const response = await getResponse(prompt)

	return response.trim().replace(/\r?\n|\r/g, '')
}

async function createConclusionFromKeyPhraseAndTitle(keyPhrase, title) {
	// figure out what research would be needed to create a well-informed and useful article
	const topics = await getResearchTopicsForKeyPhrase(keyPhrase)

	const prompt =
		`You are a skilled content writer for the cocktail recipe website Ask Tipsy. Your task is to write a strong, engaging conclusion for an article based on the provided focus key phrase and title. The conclusion should summarize the key points, reinforce the focus key phrase, and encourage readers to take action, such as trying the recipe or exploring more content. For example, if the key phrase is "classic margarita recipe" and the title is "The Ultimate Classic Margarita Recipe: Perfect for Any Occasion," the conclusion might emphasize the simplicity and timeless appeal of the margarita, inviting readers to enjoy this classic drink at their next gathering. Make sure the article is well-researched an incorporates research data in a way that makes the article educational and well-informed. An example from the Margarita recipe page is:
		
		### Enjoy!

The Margarita is more than just a cocktail; it's a celebration in a glass. With its harmonious blend of flavors and timeless appeal, this drink is sure to become a favorite. So, gather your ingredients, mix up a Margarita, and toast to the refreshing and zesty charm of this classic cocktail. Cheers to the Margarita!

_Tipsy_ 🍹

You can only say the conclusion, only include the conclusion in your response and nothing else. In markdown format, write a conclusion based on the focus key phrase and title. Key Phrase: ` +
		keyPhrase +
		' | Title: ' +
		title +
		'| Research Topics: ' +
		topics

	const response = await getResponse(prompt)

	return response
}

async function createContentFromKeyPhraseAndConclusion(keyPhrase, conclusion) {
	let prompt =
		'You are an expert content writer for the cocktail recipe website Ask Tipsy. Your task is to write the main body of an article based on a provided focus key phrase and a given conclusion. The content should be informative, engaging, and structured to flow naturally into the provided conclusion. Make sure to incorporate the focus key phrase throughout the article, covering relevant subtopics, details, and steps. For example, if the key phrase is "classic margarita recipe" and the conclusion emphasizes the simplicity and timeless appeal of the drink, the article might include sections on ingredients, preparation steps, tips for making the perfect margarita, and variations of the recipe. Here is the markdown content from the Margarita recipe page: '

	prompt =
		prompt +
		`## The Margarita: A Zesty Classic

Indulge in the vibrant and refreshing **Margarita**! This classic cocktail is a perfect blend of tequila, lime juice, and triple sec, offering a zesty and invigorating sip that's ideal for any occasion.

### The Origin of the Margarita

The Margarita's origins are often debated, but it has firmly established itself as one of the most popular cocktails worldwide. Its delightful combination of citrusy lime and smooth tequila makes it a beloved favorite.

### Why You'll Love It

1. **Refreshing Flavor**: The blend of tequila and lime juice creates a crisp and zesty taste that's incredibly refreshing.
2. **Versatile**: Perfect for any occasion, from casual gatherings to festive celebrations.
3. **Customizable**: Easily adjusted to suit your taste by varying the sweetness or experimenting with different flavors.

### Perfect Pairings

The Margarita pairs wonderfully with Mexican cuisine and spicy dishes. Try it with tacos, nachos, or a flavorful ceviche. Its citrusy profile also complements grilled seafood and light appetizers.

### Tips for the Perfect Margarita

-   **Quality Tequila**: Use a good quality tequila, preferably 100% agave, for the best flavor.
-   **Fresh Lime Juice**: Freshly squeezed lime juice is essential for an authentic Margarita.
-   **Salted Rim**: A salted rim enhances the overall flavor and adds a traditional touch.

### Get Creative

Feel free to experiment with this classic recipe! You can adjust the sweetness by varying the amount of triple sec, or try adding fruit purees like strawberry or mango for a unique twist.

### Enjoy!

The Margarita is more than just a cocktail; it's a celebration in a glass. With its harmonious blend of flavors and timeless appeal, this drink is sure to become a favorite. So, gather your ingredients, mix up a Margarita, and toast to the refreshing and zesty charm of this classic cocktail. Cheers to the Margarita!

_Tipsy_ 🍹

`

	prompt =
		prompt +
		' You can only say the content, only include the content in your response and nothing else. In markdown format, write the main body of the article based on the focus key phrase and conclusion. Key Phrase: ' +
		keyPhrase +
		' | Conclusion: ' +
		conclusion

	const response = await getResponse(prompt)

	return response
}

async function getRecipeIngredients(keyPhrase) {
	const prompt =
		'You are a recipe development expert for the cocktail recipe website Ask Tipsy. Your task is to generate a JSON array of ingredients and quantities for a cocktail recipe based on the provided focus key phrase. The JSON array should list the ingredients with their respective quantities in the following format: `[{ "name": "Ingredient Name", "quantity": "Quantity" },{ "name": "Ingredient Name", "quantity": "Quantity" },{ "name": "Ingredient Name", "quantity": "Quantity" }]`. For example, if the key phrase is "classic mojito," the output might be: `[{ "name": "White Rum", "quantity": "2 oz" },{ "name": "Fresh Lime Juice", "quantity": "1 oz" },{ "name": "Simple Syrup", "quantity": "¾ oz" },{ "name": "Mint Leaves", "quantity": "10 leaves" },{ "name": "Club Soda", "quantity": "Top with" }]`. You can only say the JSON array of ingredients, only include the JSON array in your response and nothing else. Please provide the ingredients and quantities for the focus key phrase: ' +
		keyPhrase

	const response = await getResponse(prompt)

	let ingredients = []

	try {
		ingredients = JSON.parse(response)
	} catch (e) {
		console.log('Error parsing response:', e)
	}

	return ingredients
}

async function getRecipeSteps(keyPhrase, ingredients) {
	const prompt =
		'You are a cocktail recipe expert for the website Ask Tipsy. Your task is to create a JSON array of steps for making a cocktail based on the provided focus key phrase and a JSON array of ingredients. The steps should be clear, sequential, and easy to follow. Output the steps in the following JSON format: `["Step 1","Step 2","Step 3","Step 4","Step 5"]`. For example, if the key phrase is "classic mojito" and the ingredients are: `[{ "name": "White Rum", "quantity": "2 oz" },{ "name": "Fresh Lime Juice", "quantity": "1 oz" },{ "name": "Simple Syrup", "quantity": "¾ oz" },{ "name": "Mint Leaves", "quantity": "10 leaves" },{ "name": "Club Soda", "quantity": "Top with" }]` The output might be: `["Muddle the mint leaves with the simple syrup in a glass.","Fill the glass with ice.","Add the white rum and fresh lime juice to the glass.","Top with club soda and stir gently.","Garnish with additional mint leaves and a lime slice."]` Ensure the steps are detailed and correspond to the provided ingredients. You can only say the JSON array of steps, only include the JSON array in your response and nothing else. Please provide the steps for the focus key phrase and ingredients. Key Phrase: ' +
		keyPhrase +
		' | Ingredients: ' +
		JSON.stringify(ingredients)

	const response = await getResponse(prompt)

	let steps = []

	try {
		steps = JSON.parse(response)
	} catch (e) {
		console.log('Error parsing response:', e)
	}

	return steps
}

async function removeIrrelevantURLs() {
	const startTimestamp = new Date().getTime()
	const urls = await getURLSFromFile('article-builder/inputs.txt', 'utf8')
	console.log('Number of URLs to sort: ' + urls.length)

	// If there is no relevant-urls.txt file, create one
	if (!fs.existsSync('article-builder/relevant-urls.txt')) {
		fs.writeFileSync('article-builder/relevant-urls.txt', '')
	}

	let relevantArticles = await getURLSFromFile(
		'article-builder/relevant-urls.txt',
		'utf8'
	)
	const urlsLength = urls.length

	let i = 0

	// Always use the first URL in the list
	const urlIndex = 0

	while (urls.length > 0) {
		const url = urls[urlIndex]
		i++
		console.log('Processing URL: ' + i + ' of ' + urlsLength + ': ' + url)

		// Get the relevance score of the URL
		const score = await rateArticleRelevance(url)

		// Remove the current URL from the input file
		urls.splice(urlIndex, 1)

		// Write the new list back to the file
		fs.writeFileSync('article-builder/inputs.txt', urls.join('\n'))

		console.log('    - Score: ' + score)

		if (score < 7) continue
		relevantArticles.push(url)
		// Remove any duplicates
		const uniqueRelevantURLS = [...new Set(relevantArticles)].filter(
			(url) => url.trim() !== ''
		)
		// Write the new list back to the file
		fs.writeFileSync(
			'article-builder/relevant-urls.txt',
			uniqueRelevantURLS.join('\n')
		)
	}

	const endTimestamp = new Date().getTime()

	console.log(
		'Finished sorting relevant URLs. Time taken: ' +
			(endTimestamp - startTimestamp) / 1000
	)
}

async function getCurrentCategories() {
	const directory = 'src/content/categories'

	try {
		const files = fs.readdirSync(directory)
		return files.map((file) => {
			// remove the .md extension
			return file.replace('.md', '')
		})
	} catch (e) {
		console.log(e)
	}
}

async function getCurrentURLs(type) {
	const directory = `src/content/${type}`

	try {
		const files = fs.readdirSync(directory)
		return files.map((file) => {
			// remove the .md extension
			return '/' + type + '/' + file.replace('.md', '')
		})
	} catch (e) {
		console.log(e)
	}
}

async function buildFile(url) {
	console.log('Building file for URL: ' + url)
	const startTimestamp = new Date().getTime()

	const type = await decideIfArticleOrRecipe(url)

	const existingURLs = await getCurrentURLs(type)

	// Check if the URL would be duplicate content
	const isUnique = await wouldArticleBeUnique(url, existingURLs)

	if (!isUnique) {
		console.log('URL is not unique. Skipping...')
		return
	}

	// Create focus key phrase
	const keyPhrase = await createFocusKeyPhrase(url)
	console.log('    - Key Phrase: ' + keyPhrase)

	// Get categories
	const categories = await getCategoriesFromKeyPhrase(keyPhrase)
	console.log('    - Categories: ' + JSON.stringify(categories))

	// Create a title
	const title = await createTitleFromKeyPhrase(keyPhrase)
	console.log('    - Title: ' + title)

	// Create a slug
	const slug = await createSlugFromKeyPhrase(keyPhrase)
	console.log('    - Slug: ' + slug)

	// Create a meta description
	const metaDescription = await createMetaDescriptionFromKeyPhrase(keyPhrase)
	console.log('    - Meta Description: ' + metaDescription)

	// Generate description text for the image
	const imageDescription = await createImageDescriptionFromKeyPhrase(
		keyPhrase
	)
	console.log('    - Image Description: ' + imageDescription)

	// Create the article's conclusion
	const conclusion = await createConclusionFromKeyPhraseAndTitle(
		keyPhrase,
		title
	)

	// Create the article content
	const content = await createContentFromKeyPhraseAndConclusion(
		keyPhrase,
		conclusion
	)

	let recipes = []
	let steps = []

	if (type === 'recipes') {
		recipes = await getRecipeIngredients(keyPhrase)
		steps = await getRecipeSteps(keyPhrase, recipes)
	}

	// Get the date in yyyy-mm-dd format
	const date = new Date().toISOString().split('T')[0]

	// Assemble the content
	let fileContent = `---
title: "${title.replace(/"/g, '\\"')}"
pubDate: ${date}
description: "${metaDescription.replace(/"/g, '\\"')}"
author: 'Tipsy'
image: '../../assets/recipes/placeholder.jpg'
imageAlt: "${imageDescription.replace(/"/g, '\\"')}"
`

	if (type === 'recipes') {
		fileContent += `tags: ${JSON.stringify(categories)}
ingredients: ${JSON.stringify(recipes)}
instructions: ${JSON.stringify(steps)}
`
	}

	fileContent += `---
${content}
`

	const endTimestamp = new Date().getTime()

	console.log(
		'Finished building article. Time taken: ' +
			(endTimestamp - startTimestamp) / 1000
	)

	// Write the content to a file
	const filename = `src/content/${type}/${slug}.md`

	fs.writeFileSync(filename, fileContent)

	console.log('File written: ' + filename)
}

async function buildContentFiles() {
	const startTimestamp = new Date().getTime()
	// Get the relevant URLs
	const urls = await getURLSFromFile(
		'article-builder/relevant-urls.txt',
		'utf8'
	)

	let i = 0
	let urlLength = urls.length

	console.log('Writing ' + urls.length + ' articles.')

	while (urls.length > 0) {
		i++
		console.log('Building article: ' + i + ' of ' + urlLength)
		const url = urls[0]
		await buildFile(url)
		urls.splice(0, 1)
	}

	const endTimestamp = new Date().getTime()

	console.log(
		'Finished building articles. Time taken: ' +
			(endTimestamp - startTimestamp) / 1000
	)
}

// Strip out irrelevant URLs
await removeIrrelevantURLs()

// Create a new content astro file for each URL
await buildContentFiles()
