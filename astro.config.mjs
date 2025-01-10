// @ts-check
import { defineConfig } from 'astro/config'
import { constants, stringifiedConstants } from './constants'
import icon from 'astro-icon'
import mdx from '@astrojs/mdx'
import openGraphImages from './integrations/open-graph-images/index.ts'
import sitemap from '@astrojs/sitemap'

const { ORIGIN } = constants

// https://astro.build/config
export default defineConfig({
	integrations: [
		openGraphImages(),
		sitemap(),
		icon({
			include: {
				'fa6-solid': [],
				solar: [
					'heart-angle-outline',
					'bill-check-linear',
					'share-linear',
					'square-arrow-right-linear'
				]
			}
		})
	],
	prefetch: {
		prefetchAll: true
	},
	site: ORIGIN,
	vite: {
		define: { ...stringifiedConstants }
	}
})
