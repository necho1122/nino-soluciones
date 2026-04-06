import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import PublicNavbar from '@/components/public-navbar';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'NINO` SOLUCIONES',
	description:
		'Rifas en línea con seguimiento de compra y sorteos en tiempo real.',
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const requestHeaders = await headers();
	const isAdminRoute = requestHeaders.get('x-admin-route') === '1';

	return (
		<html
			lang='es'
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className='min-h-full flex flex-col bg-[#0f172a]'>
				{!isAdminRoute && <PublicNavbar />}
				{children}
			</body>
		</html>
	);
}
