'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Raffle } from '@/types/raffle';

const HomePage: React.FC = () => {
	const [raffles, setRaffles] = useState<Raffle[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchRaffles = async () => {
		setLoading(true);
		setError(null);
		try {
			const rafflesCol = collection(db, 'raffles');
			const rafflesQuery = query(rafflesCol, orderBy('createdAt', 'desc'));
			const snapshot = await getDocs(rafflesQuery);

			if (snapshot.empty) {
				setRaffles([]);
				return;
			}

			setRaffles(
				snapshot.docs
					.map((doc) => {
						const data = doc.data() as Raffle;
						return {
							id: doc.id,
							title: data.title || 'Rifa sin título',
							description: data.description || 'Sin descripción',
							ticketPrice:
								typeof data.ticketPrice === 'number' ? data.ticketPrice : null,
							drawDate: data.drawDate || '',
							imageUrl: data.imageUrl ?? null,
							createdAt: data.createdAt ?? null,
							isArchived: data.isArchived ?? false,
							drawStatus: data.drawStatus ?? 'notScheduled',
							drawExecutedAt: data.drawExecutedAt ?? null,
							drawOutcome: data.drawOutcome ?? null,
						};
					})
					.filter((raffle) => raffle.isArchived !== true),
			);
		} catch (err) {
			console.error('Error cargando rifas desde Firebase:', err);
			setError('No se pudieron cargar las rifas. Intenta recargar.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRaffles();
	}, []);

	if (loading) {
		return (
			<div className='min-h-screen flex items-center justify-center text-slate-300'>
				Cargando rifas...
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-[#0f172a] text-slate-200 p-3 sm:p-4 md:p-8'>
			<div className='max-w-6xl mx-auto'>
				<header className='text-center mb-8 sm:mb-10'>
					<h1 className='text-3xl sm:text-5xl font-black bg-linear-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent'>
						Rifas Disponibles
					</h1>
					<p className='text-slate-400 mt-3 text-sm sm:text-base'>
						Selecciona tu rifa y participa con tus números favoritos.
					</p>
				</header>

				{error && <div className='text-center text-red-300 py-8'>{error}</div>}

				{raffles.length === 0 ? (
					<div className='text-center text-slate-400 py-16'>
						No hay rifas disponibles por ahora.
					</div>
				) : (
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5'>
						{raffles.map((raffle, index) => (
							<div
								key={raffle.id}
								className='block rounded-2xl border border-slate-700 bg-slate-900/70 p-3 sm:p-4 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/30 active:scale-[0.99]'
							>
								{raffle.imageUrl ? (
									<div className='relative h-44 sm:h-40 w-full rounded-xl mb-3 overflow-hidden'>
										<Image
											src={raffle.imageUrl}
											alt={raffle.title}
											fill
											sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
											priority={index === 0}
											loading={index === 0 ? 'eager' : 'lazy'}
											className='object-cover'
										/>
									</div>
								) : (
									<div className='h-44 sm:h-40 w-full rounded-xl bg-slate-800 flex items-center justify-center mb-3 text-sm text-slate-400'>
										Sin imagen
									</div>
								)}
								<h2 className='text-xl font-bold text-white mb-1'>
									{raffle.title}
								</h2>
								<p className='text-sm text-slate-300 mb-2 line-clamp-3'>
									{raffle.description}
								</p>
								<p className='text-xs text-slate-400'>
									Sorteo:{' '}
									{raffle.drawStatus === 'completed'
										? `Culminado${raffle.drawExecutedAt ? ` (${new Date(raffle.drawExecutedAt).toLocaleDateString()})` : ''}`
										: raffle.drawStatus === 'drawing'
											? 'En curso'
											: raffle.drawDate
												? new Date(raffle.drawDate).toLocaleDateString()
												: 'No definido'}
								</p>
								<p className='text-xs text-slate-400 mt-1'>
									Precio por número:{' '}
									{typeof raffle.ticketPrice === 'number'
										? `$${raffle.ticketPrice.toFixed(2)}`
										: 'No definido'}
								</p>
								<div className='mt-3 grid grid-cols-1 gap-2'>
									<Link
										href={`/raffle/${raffle.id}`}
										className='w-full rounded-lg bg-amber-500 px-3 py-2.5 text-center font-bold text-slate-900 hover:bg-amber-400'
									>
										Participar
									</Link>
									{raffle.drawStatus === 'completed' && (
										<Link
											href={`/certificado/${raffle.id}`}
											className='w-full rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2.5 text-center text-sm font-semibold text-emerald-200 hover:border-emerald-300 hover:text-white'
										>
											Ver certificado de validez
										</Link>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default HomePage;
