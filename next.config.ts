import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	images: {
		localPatterns: [
			{
				pathname: '/logo.webp',
				search: '?v=20260328',
			},
		],
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'poptv.orange.es',
			},
			{
				protocol: 'https',
				hostname: 'images.ctfassets.net',
			},
			{
				protocol: 'https',
				hostname: 'images.pexels.com',
			},
		],
	},
};

export default nextConfig;
