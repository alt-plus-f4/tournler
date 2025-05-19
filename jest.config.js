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
export default createJestConfig(customJestConfig);
