import { defineConfig } from 'astro/config'

import cloudflare from '@astrojs/cloudflare'

// https://astro.build/config
export default defineConfig({
	output: 'hybrid',
	redirects: {
		'/categories': '/recipes'
	},
	adapter: cloudflare({
		imageService: 'compile'
	}),
	image: {
		entrypoint: 'compile',
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'external-image-host-domain.com'
			}
		]
	}
})
