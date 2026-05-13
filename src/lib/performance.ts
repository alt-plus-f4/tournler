/**
 * Performance optimization utilities
 */

/**
 * Debounce function for search and input fields
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;

	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Throttle function for scroll and resize events
 */
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
	let inThrottle: boolean;

	return function executedFunction(...args: Parameters<T>) {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => {
				inThrottle = false;
			}, limit);
		}
	};
}

/**
 * Image optimization preset
 */
export const imageOptimization = {
	thumbnail: { width: 64, height: 64, quality: 80 },
	avatar: { width: 128, height: 128, quality: 85 },
	teamLogo: { width: 256, height: 256, quality: 90 },
	banner: { width: 1200, height: 400, quality: 80 },
	card: { width: 400, height: 300, quality: 85 },
};

/**
 * Cache strategies for API requests
 */
export const cacheConfig = {
	short: { revalidate: 60 }, // 1 minute
	medium: { revalidate: 300 }, // 5 minutes
	long: { revalidate: 3600 }, // 1 hour
	never: { revalidate: false }, // No cache
};

/**
 * Preload images to improve perceived performance
 */
export function preloadImage(src: string): void {
	const link = document.createElement('link');
	link.rel = 'preload';
	link.as = 'image';
	link.href = src;
	document.head.appendChild(link);
}

/**
 * Intersection Observer helper for lazy loading
 */
export function observeElement(element: HTMLElement, callback: (isVisible: boolean) => void, options?: IntersectionObserverInit): IntersectionObserver {
	const observer = new IntersectionObserver(([entry]) => {
		callback(entry.isIntersecting);
	}, options);

	observer.observe(element);
	return observer;
}
