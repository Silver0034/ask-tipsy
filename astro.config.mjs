import { defineConfig } from 'astro/config'

import cloudflare from '@astrojs/cloudflare'
import pagefind from 'astro-pagefind'

// https://astro.build/config
export default defineConfig({
	output: 'hybrid',
	platformProxy: {
		enabled: true,
		configPath: 'wrangler.toml'
	},
	redirects: {
		'/categories': '/recipes'
	},
	adapter: cloudflare({
		imageService: 'compile'
	}),
	image: {
		entrypoint: 'compile'
	},
	integrations: [pagefind()]
})
