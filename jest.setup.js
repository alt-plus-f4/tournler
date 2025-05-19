/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

process.env.NEXTAUTH_URL = 'http://localhost:3000'; // Or any other appropriate mock URL

// Mock next/image since it's not available in the test environment
jest.mock('next/image', () => ({
	__esModule: true,
	default: (props) => {
		const {
			fill,
			priority,
			quality,
			layout,
			loader,
			blurDataURL,
			unoptimized,
			...rest
		} = props;
		// eslint-disable-next-line @next/next/no-img-element
		return <img {...rest} />; // Pass only the remaining standard img attributes
	},
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
		prefetch: jest.fn(),
	}),
	useSearchParams: () => ({ get: jest.fn() }),
	usePathname: () => '',
}));

// Mock next/link
jest.mock('next/link', () => {
	return ({ children, href, ...rest }) => {
		return (
			<a href={href} {...rest}>
				{children}
			</a>
		);
	};
});

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
	if (
		typeof args[0] === 'string' &&
		(args[0].includes('Warning: ReactDOM.render') ||
			args[0].includes('Warning: React.createElement') ||
			args[0].includes('Error: Uncaught [Error: expected'))
	) {
		return;
	}
	originalConsoleError(...args);
};
