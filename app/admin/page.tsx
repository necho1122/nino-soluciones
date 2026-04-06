'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	collection,
	getDocs,
	orderBy,
	query,
	doc,
	setDoc,
	writeBatch,
} from 'firebase/firestore';
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut,
	User,
} from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Raffle } from '@/types/raffle';

const TOTAL_TICKETS = 100;

const formatRaffleDrawStatus = (raffle: Raffle) => {
	if (raffle.drawStatus === 'completed') {
		const executedLabel = raffle.drawExecutedAt
			? ` (${new Date(raffle.drawExecutedAt).toLocaleString()})`
			: '';

		return raffle.drawOutcome === 'no-winner'
			? `Finalizado sin ganador${executedLabel}`
			: `Finalizado${executedLabel}`;
	}

	if (raffle.drawStatus === 'drawing') {
		return 'En proceso';
	}

	if (raffle.drawStatus === 'scheduled') {
		const scheduledDate = raffle.drawScheduledAt || raffle.drawDate;
		return scheduledDate
			? `Programado para ${new Date(scheduledDate).toLocaleString()}`
			: 'Programado';
	}

	if (raffle.drawDate) {
		return `Pendiente (${new Date(raffle.drawDate).toLocaleDateString()})`;
	}

	return 'No definido';
};

const AdminPanel: React.FC = () => {
	const pathname = usePathname();
	const [raffles, setRaffles] = useState<Raffle[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const [adminEmail, setAdminEmail] = useState<string>('');
	const [adminPassword, setAdminPassword] = useState<string>('');
	const [adminError, setAdminError] = useState<string | null>(null);
	const [adminUser, setAdminUser] = useState<User | null>(null);

	const [newTitle, setNewTitle] = useState<string>('');
	const [newDescription, setNewDescription] = useState<string>('');
	const [newTicketPrice, setNewTicketPrice] = useState<string>('');
	const [newDrawDate, setNewDrawDate] = useState<string>('');
	const [newImageUrl, setNewImageUrl] = useState<string>('');
	const [creating, setCreating] = useState<boolean>(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [reactivatingId, setReactivatingId] = useState<string | null>(null);
	const [actionNotice, setActionNotice] = useState<string | null>(null);

	const isAdmin = !!adminUser;
	const adminBasePath = (() => {
		const firstSegment = pathname?.split('/').filter(Boolean)[0];
		return firstSegment ? `/${firstSegment}` : '/admin';
	})();

	const fetchRaffles = async () => {
		setLoading(true);
		setError(null);
		try {
			const rafflesCol = collection(db, 'raffles');
			const rafflesQuery = query(rafflesCol, orderBy('createdAt', 'desc'));
			const snapshot = await getDocs(rafflesQuery);
			setRaffles(
				snapshot.docs.map((doc) => {
					const data = doc.data() as Raffle;
					return {
						id: doc.id,
						title: data.title || 'Rifa sin titulo',
						description: data.description || '',
						ticketPrice:
							typeof data.ticketPrice === 'number' ? data.ticketPrice : null,
						drawDate: data.drawDate || '',
						imageUrl: data.imageUrl ?? null,
						createdAt: data.createdAt ?? null,
						isArchived: data.isArchived ?? false,
						archivedAt: data.archivedAt ?? null,
						drawScheduledAt: data.drawScheduledAt ?? null,
						drawExecutedAt: data.drawExecutedAt ?? null,
						drawStatus: data.drawStatus ?? 'notScheduled',
						drawOutcome: data.drawOutcome ?? null,
					};
				}),
			);
		} catch (err) {
			console.error('Error cargando rifas:', err);
			setError('No se pudieron cargar las rifas.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setAdminUser(user);
			if (user) {
				fetchRaffles();
			}
		});
		return () => unsubscribe();
	}, []);

	const signInAdmin = async () => {
		setAdminError(null);
		try {
			await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
			setAdminEmail('');
			setAdminPassword('');
			fetchRaffles();
		} catch (err) {
			console.error('Admin login failed', err);
			setAdminError('Credenciales invalidas o error de red.');
		}
	};

	const signOutAdmin = async () => {
		try {
			await signOut(auth);
			setAdminUser(null);
			setRaffles([]);
		} catch (err) {
			console.error('Admin logout failed', err);
			setAdminError('Error cerrando sesion.');
		}
	};

	const createRaffle = async () => {
		if (!newTitle.trim() || !newDescription.trim()) {
			setError('Debes completar titulo y descripcion.');
			return;
		}
		const parsedPrice = Number(newTicketPrice);
		if (
			!newTicketPrice.trim() ||
			Number.isNaN(parsedPrice) ||
			parsedPrice <= 0
		) {
			setError('Debes indicar un precio válido por número (mayor a 0).');
			return;
		}

		try {
			setCreating(true);
			const rafflesCol = collection(db, 'raffles');
			const id = `raffle-${Date.now()}`;
			const raffleRef = doc(rafflesCol, id);
			await setDoc(raffleRef, {
				id,
				title: newTitle.trim(),
				description: newDescription.trim(),
				ticketPrice: parsedPrice,
				drawDate: newDrawDate.trim() || '',
				imageUrl: newImageUrl.trim() || null,
				createdAt: new Date().toISOString(),
				isArchived: false,
				archivedAt: null,
			});

			const ticketsBatch = writeBatch(db);
			for (
				let ticketNumber = 1;
				ticketNumber <= TOTAL_TICKETS;
				ticketNumber += 1
			) {
				ticketsBatch.set(doc(db, 'tickets', `${id}_${ticketNumber}`), {
					raffleId: id,
					number: ticketNumber,
					status: 'available',
					orderId: null,
					userId: null,
					userName: null,
					userNationalId: null,
					userPhone: null,
					paymentRef: null,
					purchasedAt: null,
				});
			}
			await ticketsBatch.commit();

			setNewTitle('');
			setNewDescription('');
			setNewTicketPrice('');
			setNewDrawDate('');
			setNewImageUrl('');
			setActionNotice('Rifa creada correctamente.');
			setTimeout(() => setActionNotice(null), 2200);
			fetchRaffles();
		} catch (err) {
			console.error('Error creando rifa:', err);
			setError('No se pudo crear la rifa.');
		} finally {
			setCreating(false);
		}
	};

	const archiveRaffle = async (raffleId: string) => {
		const confirmed = window.confirm(
			'¿Marcar esta rifa como culminada? Se conservarán todos los datos para auditoría.',
		);
		if (!confirmed) return;
		try {
			setDeletingId(raffleId);
			await setDoc(
				doc(db, 'raffles', raffleId),
				{
					isArchived: true,
					archivedAt: new Date().toISOString(),
				},
				{ merge: true },
			);
			setActionNotice(
				'Rifa enviada a culminadas. Datos conservados en Firebase.',
			);
			setTimeout(() => setActionNotice(null), 2200);
			fetchRaffles();
		} catch (err) {
			console.error('Error archivando rifa:', err);
			setError('No se pudo marcar la rifa como culminada.');
		} finally {
			setDeletingId(null);
		}
	};

	const reactivateRaffle = async (raffleId: string) => {
		const confirmed = window.confirm(
			'¿Reactivar esta rifa para que vuelva a mostrarse al público?',
		);
		if (!confirmed) return;
		try {
			setReactivatingId(raffleId);
			await setDoc(
				doc(db, 'raffles', raffleId),
				{
					isArchived: false,
					archivedAt: null,
				},
				{ merge: true },
			);
			setActionNotice('Rifa reactivada correctamente.');
			setTimeout(() => setActionNotice(null), 2200);
			fetchRaffles();
		} catch (err) {
			console.error('Error reactivando rifa:', err);
			setError('No se pudo reactivar la rifa.');
		} finally {
			setReactivatingId(null);
		}
	};

	const activeRaffles = raffles.filter((r) => r.isArchived !== true);
	const archivedRaffles = raffles.filter((r) => r.isArchived === true);

	if (!isAdmin) {
		return (
			<div className='min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 flex items-center justify-center'>
				<div className='max-w-md w-full bg-slate-900/80 border border-slate-700 p-6 rounded-3xl'>
					<h2 className='text-2xl font-bold text-white mb-4 text-center'>
						Admin login
					</h2>
					<div className='space-y-3'>
						<input
							value={adminEmail}
							onChange={(e) => setAdminEmail(e.target.value)}
							placeholder='Email'
							className='w-full rounded-lg border border-slate-700 px-3 py-2 bg-slate-800 text-slate-100'
						/>
						<input
							value={adminPassword}
							type='password'
							onChange={(e) => setAdminPassword(e.target.value)}
							placeholder='Password'
							className='w-full rounded-lg border border-slate-700 px-3 py-2 bg-slate-800 text-slate-100'
						/>
						<button
							onClick={signInAdmin}
							className='w-full rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white py-2 font-bold'
						>
							Ingresar
						</button>
						{adminError && (
							<p className='text-sm text-red-300 text-center'>{adminError}</p>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-[#0f172a] text-slate-200 p-3 sm:p-4 md:p-8'>
			<div className='max-w-7xl mx-auto'>
				{actionNotice && (
					<div className='mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300'>
						{actionNotice}
					</div>
				)}
				<div className='flex flex-col md:flex-row md:justify-between md:items-center gap-3 sm:gap-4 mb-6'>
					<h1 className='text-2xl sm:text-4xl font-black'>
						Panel Admin - Rifas
					</h1>
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full md:w-auto'>
						<Link
							href='/'
							target='_blank'
							className='rounded-full bg-slate-700 px-4 py-2.5 text-center text-white font-bold hover:bg-slate-600'
						>
							Ver sitio público ↗
						</Link>
						<button
							onClick={signOutAdmin}
							className='rounded-full bg-red-500 px-4 py-2.5 text-white font-bold hover:bg-red-400'
						>
							Cerrar sesión
						</button>
					</div>
				</div>

				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					<div className='bg-slate-900/80 border border-slate-700 p-4 rounded-2xl'>
						<h2 className='text-lg font-bold mb-2'>Crear nueva rifa</h2>
						<input
							value={newTitle}
							onChange={(e) => setNewTitle(e.target.value)}
							placeholder='Título'
							className='w-full rounded-lg border border-slate-700 p-2.5 mb-2 bg-slate-800'
						/>
						<textarea
							value={newDescription}
							onChange={(e) => setNewDescription(e.target.value)}
							placeholder='Descripción'
							className='w-full rounded-lg border border-slate-700 p-2.5 mb-2 bg-slate-800 text-slate-100'
							rows={3}
						/>
						<input
							value={newTicketPrice}
							onChange={(e) => setNewTicketPrice(e.target.value)}
							type='number'
							min='0'
							step='0.01'
							placeholder='Precio por número'
							className='w-full rounded-lg border border-slate-700 p-2.5 mb-2 bg-slate-800'
						/>
						<input
							value={newDrawDate}
							onChange={(e) => setNewDrawDate(e.target.value)}
							type='date'
							className='w-full rounded-lg border border-slate-700 p-2.5 mb-2 bg-slate-800'
						/>
						<p className='text-xs text-slate-400 -mt-1 mb-2'>
							La fecha es opcional. El precio por número es obligatorio.
						</p>
						<input
							value={newImageUrl}
							onChange={(e) => setNewImageUrl(e.target.value)}
							placeholder='URL de imagen'
							className='w-full rounded-lg border border-slate-700 p-2.5 mb-2 bg-slate-800'
						/>
						<button
							onClick={createRaffle}
							disabled={creating}
							className='w-full rounded-lg bg-amber-500 px-3 py-2.5 font-bold text-slate-900 hover:bg-amber-400'
						>
							{creating ? 'Creando...' : 'Crear rifa'}
						</button>
						{error && <p className='text-sm text-red-300 mt-2'>{error}</p>}
					</div>

					{loading ? (
						<p className='text-white'>Cargando...</p>
					) : activeRaffles.length === 0 ? (
						<p className='text-sm text-slate-400'>
							No hay rifas activas en este momento.
						</p>
					) : (
						activeRaffles.map((raffle) => (
							<div
								key={raffle.id}
								className='bg-slate-900/80 border border-slate-700 p-4 rounded-2xl'
							>
								<div className='mb-3'>
									<h3 className='text-xl font-bold text-white'>
										{raffle.title}
									</h3>
									<p className='text-sm text-slate-300 mt-1'>
										{raffle.description}
									</p>
									<p className='text-xs text-slate-400 mt-1'>
										Sorteo: {formatRaffleDrawStatus(raffle)}
									</p>
									<p className='text-xs text-slate-400 mt-1'>
										Precio por número:{' '}
										{typeof raffle.ticketPrice === 'number'
											? `$${raffle.ticketPrice.toFixed(2)}`
											: 'No definido'}
									</p>
								</div>
								<div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
									<Link
										href={`${adminBasePath}/raffle/${raffle.id}`}
										className='rounded-lg bg-indigo-500 px-3 py-2.5 text-sm font-semibold text-center text-white'
									>
										Administrar
									</Link>
									<Link
										href={`/certificado/${raffle.id}`}
										target='_blank'
										className='rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-center text-emerald-200 hover:border-emerald-300 hover:text-white'
									>
										Ver certificado
									</Link>
									<button
										onClick={() => archiveRaffle(raffle.id)}
										disabled={deletingId === raffle.id}
										className='rounded-lg bg-red-500 px-3 py-2.5 text-sm font-semibold text-white sm:col-span-2'
									>
										{deletingId === raffle.id ? 'Archivando...' : 'Culminar'}
									</button>
								</div>
							</div>
						))
					)}
				</div>

				<div className='mt-8'>
					<h2 className='text-xl font-bold text-slate-100 mb-3'>
						Rifas culminadas
					</h2>
					{archivedRaffles.length === 0 ? (
						<p className='text-sm text-slate-400'>
							Aún no hay rifas culminadas.
						</p>
					) : (
						<div className='grid gap-3 md:grid-cols-2'>
							{archivedRaffles.map((raffle) => (
								<div
									key={`archived-${raffle.id}`}
									className='rounded-2xl border border-slate-700 bg-slate-900/50 p-4'
								>
									<p className='text-sm text-slate-400 mb-1'>Culminada</p>
									<h3 className='text-lg font-bold text-white'>
										{raffle.title}
									</h3>
									<p className='text-sm text-slate-300 mt-1 line-clamp-2'>
										{raffle.description}
									</p>
									<p className='text-xs text-slate-400 mt-2'>
										Archivada:{' '}
										{raffle.archivedAt
											? new Date(raffle.archivedAt).toLocaleString()
											: 'Sin fecha'}
									</p>
									<p className='text-xs text-slate-400 mt-1'>
										Precio por número:{' '}
										{typeof raffle.ticketPrice === 'number'
											? `$${raffle.ticketPrice.toFixed(2)}`
											: 'No definido'}
									</p>
									<div className='mt-3'>
										<div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
											<Link
												href={`${adminBasePath}/raffle/${raffle.id}`}
												className='inline-flex justify-center rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600'
											>
												Ver historial
											</Link>
											<Link
												href={`/certificado/${raffle.id}`}
												target='_blank'
												className='inline-flex justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 hover:border-emerald-300 hover:text-white'
											>
												Ver certificado
											</Link>
											<button
												onClick={() => reactivateRaffle(raffle.id)}
												disabled={reactivatingId === raffle.id}
												className='rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 sm:col-span-2'
											>
												{reactivatingId === raffle.id
													? 'Reactivando...'
													: 'Reactivar'}
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AdminPanel;
