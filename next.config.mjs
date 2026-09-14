/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '6q0iedxcfemxlbr8.public.blob.vercel-storage.com',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'www.google.com',
				pathname: '/**',
			},
		],
	},
};

export default nextConfig;
