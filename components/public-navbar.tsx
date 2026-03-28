'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const LOGO_SRC = '/logo.webp?v=20260328';

const NAV_ITEMS = [
	{ href: '/', label: 'Rifas' },
	{ href: '/contacto', label: 'Contacto' },
	{ href: '/terminos', label: 'Políticas' },
];

const PublicNavbar = () => {
	const pathname = usePathname();

	if (pathname?.startsWith('/admin')) {
		return null;
	}

	return (
		<header className='sticky top-0 z-40 border-b border-slate-800/80 bg-[#0f172a]/85 backdrop-blur-xl'>
			<div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8'>
				<Link
					href='/'
					className='min-w-0'
				>
					<div className='flex items-center gap-3'>
						<Image
							src={LOGO_SRC}
							alt='NINO SOLUCIONES Logo'
							width={40}
							height={40}
							className='rounded-full object-cover'
						/>
						<div className='min-w-0'>
							<p className='truncate text-sm font-black tracking-[0.18em] text-white'>
								NINO&apos; SOLUCIONES
							</p>
							<p className='truncate text-xs text-slate-400'>Rifas en línea</p>
						</div>
					</div>
				</Link>

				<nav className='flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 p-1'>
					{NAV_ITEMS.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
									isActive
										? 'bg-amber-400 text-slate-950'
										: 'text-slate-300 hover:bg-slate-800 hover:text-white'
								}`}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>
			</div>
		</header>
	);
};

export default PublicNavbar;
