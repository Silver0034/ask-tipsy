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

async function getResponse(prompt) {
	// save the current timestamp in milliseconds to rate limit the requests
	const currentTimestamp = new Date().getTime()
	if (currentTimestamp - rateLimiter < 1000) {
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}
	rateLimiter = currentTimestamp
	const result = await model.generateContent(prompt)
	const response = await result.response
	return response.text()
}

const sanitizeURL = (url) => {
	url = url.replace(/\r/g, '')
	return url
}

async function rateArticleRelevance(url) {
	const prompt =
		'You are a SEO expert writing blog posts and recipe pages for a famous Cocktail Recipe website called Ask Tipsy. You are tasked with looking at the sitemaps of competitor websites and rating on a scale of 1-10 how relevant the article would be to a Cocktail Recipe website. If the article is not related to cocktails or mocktails, say "1". If the article is very relevant to a Cocktail Recipe website, say "10". You are only able to say the number of your score. You never say any words except for the number you rate the url. For example, given the url "https://www.pizzahut.com/menu/wings", you would say "1". If you are given the URL "https://www.liquor.com/recipes/old-fashioned/", you would say "10". Please rate the relevance of the following URL: ' +
		sanitizeURL(url)

	const response = await getResponse(prompt)

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

async function removeIrrelevantURLS() {
	const urls = fs
		.readFileSync('article-builder-inputs.txt', 'utf8')
		.split('\n')
	console.log('Number of URLs to sort: ' + urls.length)
	const relevantArticles = []
	for (let i = 0; i < urls.length; i++) {
		console.log('Processing URL: ' + i + ': ' + urls[i])
		const score = await rateArticleRelevance(urls[i])
		console.log('    - Score: ' + score)
		if (score < 7) continue
		relevantArticles.push(urls[i])
	}

	console.log('Saving relevant articles to article-builder-output.txt')
	// If there is no output file, create one
	fs.writeFileSync('article-builder-output.txt', relevantArticles.join('\n'))
}

removeIrrelevantURLS()
