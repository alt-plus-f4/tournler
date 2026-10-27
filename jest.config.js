import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
	// Provide the path to your Next.js app to load next.config.js and .env files
	dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	testEnvironment: 'jest-environment-jsdom',
	moduleNameMapper: {
		// Handle module aliases (if you use them in your project)
		'^@/components/(.*)$': '<rootDir>/src/components/$1',
		'^@/lib/(.*)$': '<rootDir>/src/lib/$1',
		'^@/app/(.*)$': '<rootDir>/src/app/$1',
	},
	testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
	// Add more setup options if needed
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config
const baseJestConfig = createJestConfig(customJestConfig);

// next/jest's own transformIgnorePatterns only allowlists next's internal ESM packages, and it merges
// by concatenation rather than replacement, so adding entries to customJestConfig can't loosen it.
// sanitize-html's dependency chain (htmlparser2, domhandler, domutils, domelementtype, parse5) ships
// ESM-only packages, so the resolved config is patched here to also let those through the transform.
export default async () => {
	const config = await baseJestConfig();
	config.transformIgnorePatterns = [
		'/node_modules/(?!.pnpm)(?!(geist|next/dist/client|next/dist/shared/lib|next/src/client|next/src/shared/lib|sanitize-html|htmlparser2|domhandler|domutils|domelementtype|dom-serializer|entities|parse5)/)',
		'/node_modules[\\/]\\.pnpm[\\/](?!(geist|next\\+dist\\+client|next\\+dist\\+shared\\+lib|next\\+src\\+client|next\\+src\\+shared\\+lib)@)(?!.*node_modules[\\/](geist|next[\\/]dist[\\/]client|next[\\/]dist[\\/]shared[\\/]lib|next[\\/]src[\\/]client|next[\\/]src[\\/]shared[\\/]lib)[\\/])',
		'^.+\\.module\\.(css|sass|scss)$',
	];
	return config;
};
