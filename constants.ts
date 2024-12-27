/**
 * Constants for the application
 *
 * Exported to be defined globally through vite in ./astro.config.mjs.
 *
 * For VSCode to recognize these constants, add declarations to ./global.d.ts.
 *
 * Global variables will match the keys in the constants object.
 * - Example: constants.ORIGIN will be available as ORIGIN.
 */

const constants = {
	ADDRESS_CITY: 'City',
	ADDRESS_COUNTRY_CODE: 'US',
	ADDRESS_COUNTRY: 'United States of America',
	ADDRESS_STATE: 'State',
	ADDRESS_STREET: 'Street Address',
	ADDRESS_ZIP: 'Zip',
	AUTHOR: 'Jacob Lodes',
	ORIGIN: 'https://asktipsy.com/',
	SITE_NAME: 'AskTipsy',
	SOCIAL_URL_FACEBOOK: 'facebookURL',
	SOCIAL_URL_LINKEDIN: 'linkedinURL',
	SOCIAL_URL_TWITTER: 'twitterURL',
	TWITTER_USERNAME: '@twitterUsername',
	USERWAY_ID: 'B4N5h1wISt'
}

// An object with the same keys but each value is JSON stringified.
const stringifiedConstants = Object.entries(constants).reduce(
	(accumulator: { [key: string]: string }, [key, value]) => {
		accumulator[key] = JSON.stringify(value)
		return accumulator
	},
	{}
)

export { constants, stringifiedConstants }
