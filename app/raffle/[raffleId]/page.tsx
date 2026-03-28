'use client';

import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
	collection,
	query,
	orderBy,
	where,
	getDocs,
	doc,
	setDoc,
	onSnapshot,
	runTransaction,
	writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Raffle, Ticket } from '@/types/raffle';

const TOTAL_TICKETS = 100;

const formatTicketNumber = (ticketNumber: number) =>
	ticketNumber.toString().padStart(2, '0');

const formatCountdown = (target: string, now: number) => {
	const distance = new Date(target).getTime() - now;
	if (distance <= 0) return '00:00:00';
	const hours = Math.floor(distance / (1000 * 60 * 60));
	const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((distance % (1000 * 60)) / 1000);
	return [hours, minutes, seconds]
		.map((value) => value.toString().padStart(2, '0'))
		.join(':');
};

const RaffleDetailPage: React.FC = () => {
	const params = useParams();
	const raffleId = (params?.raffleId as string) ?? '';

	const [raffle, setRaffle] = useState<Raffle | null>(null);
	const [tickets, setTickets] = useState<Ticket[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
	const [showCheckout, setShowCheckout] = useState(false);
	const [buyerName, setBuyerName] = useState('');
	const [buyerNationalId, setBuyerNationalId] = useState('');
	const [buyerPhone, setBuyerPhone] = useState('');
	const [paymentReference, setPaymentReference] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [drawRunning, setDrawRunning] = useState(false);
	const [now, setNow] = useState(Date.now());
	const seedingRef = useRef(false);

	useEffect(() => {
		const timer = window.setInterval(() => {
			setNow(Date.now());
		}, 1000);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		if (!raffleId) return;

		const raffleRef = doc(db, 'raffles', raffleId);
		const ticketsQuery = query(
			collection(db, 'tickets'),
			where('raffleId', '==', raffleId),
			orderBy('number'),
		);

		const unsubRaffle = onSnapshot(
			raffleRef,
			(snapshot) => {
				if (!snapshot.exists()) {
					setError('La rifa no existe.');
					setLoading(false);
					return;
				}
				const data = snapshot.data() as Raffle;
				const isArchived = data.isArchived ?? false;
				setRaffle({
					id: snapshot.id,
					title: data.title ?? '',
					description: data.description ?? '',
					drawDate: data.drawDate ?? '',
					ticketPrice:
						typeof data.ticketPrice === 'number' ? data.ticketPrice : null,
					imageUrl: data.imageUrl ?? null,
					createdAt: data.createdAt ?? null,
					isArchived,
					archivedAt: data.archivedAt ?? null,
					drawScheduledAt: data.drawScheduledAt ?? null,
					drawExecutedAt: data.drawExecutedAt ?? null,
					drawStatus: data.drawStatus ?? 'notScheduled',
					drawOutcome: data.drawOutcome ?? null,
					drawWinnerNumber: data.drawWinnerNumber ?? null,
					drawWinnerName: data.drawWinnerName ?? null,
					drawWinnerPhone: data.drawWinnerPhone ?? null,
				});
				if (isArchived) {
					setError('Esta rifa ya culminó y no está disponible al público.');
				}
				setLoading(false);
			},
			(err) => {
				console.error('Error cargando rifa:', err);
				setError('No se pudo cargar la rifa.');
				setLoading(false);
			},
		);

		const unsubTickets = onSnapshot(
			ticketsQuery,
			async (snapshot) => {
				if (snapshot.empty && !seedingRef.current) {
					seedingRef.current = true;
					try {
						const existingSnapshot = await getDocs(ticketsQuery);
						if (existingSnapshot.empty) {
							await Promise.all(
								Array.from({ length: TOTAL_TICKETS }, (_, index) => {
									const ticketNumber = index + 1;
									return setDoc(
										doc(db, 'tickets', `${raffleId}_${ticketNumber}`),
										{
											raffleId,
											number: ticketNumber,
											status: 'available',
											userId: null,
											userName: null,
											userNationalId: null,
											userPhone: null,
											paymentRef: null,
											purchasedAt: null,
										},
									);
								}),
							);
						}
					} catch (seedError) {
						console.error('Error creando tickets:', seedError);
						setError('No se pudieron inicializar los números.');
					} finally {
						seedingRef.current = false;
					}
					return;
				}

				setTickets(
					snapshot.docs.map((ticketDoc) => {
						const data = ticketDoc.data() as Ticket;
						return {
							id: ticketDoc.id,
							raffleId: data.raffleId,
							number: Number(data.number ?? 0),
							status: data.status ?? 'available',
							userId: data.userId ?? null,
							userName: data.userName ?? null,
							userNationalId: data.userNationalId ?? null,
							userPhone: data.userPhone ?? null,
							paymentRef: data.paymentRef ?? null,
							purchasedAt: data.purchasedAt ?? null,
						};
					}),
				);
				setLoading(false);
			},
			(err) => {
				console.error('Error cargando tickets:', err);
				setError('No se pudieron cargar los números.');
				setLoading(false);
			},
		);

		return () => {
			unsubRaffle();
			unsubTickets();
		};
	}, [raffleId]);

	const runDraw = useCallback(async () => {
		if (!raffleId || !tickets.length || drawRunning) return;
		setDrawRunning(true);
		try {
			const raffleRef = doc(db, 'raffles', raffleId);
			const claimed = await runTransaction(db, async (transaction) => {
				const raffleSnapshot = await transaction.get(raffleRef);
				if (!raffleSnapshot.exists()) {
					throw new Error('Raffle not found');
				}
				const currentRaffle = raffleSnapshot.data() as Raffle;
				if (
					currentRaffle.drawStatus === 'drawing' ||
					currentRaffle.drawStatus === 'completed'
				) {
					return false;
				}
				transaction.set(raffleRef, { drawStatus: 'drawing' }, { merge: true });
				return true;
			});
			if (!claimed) {
				setDrawRunning(false);
				return;
			}

			await new Promise((resolve) => setTimeout(resolve, 1800));
			const winnerTicket = tickets[Math.floor(Math.random() * tickets.length)];
			const hasWinner = winnerTicket.status === 'sold';
			await setDoc(
				raffleRef,
				{
					drawStatus: 'completed',
					drawExecutedAt: new Date().toISOString(),
					drawOutcome: hasWinner ? 'winner' : 'no-winner',
					drawWinnerNumber: winnerTicket.number,
					drawWinnerName: hasWinner
						? (winnerTicket.userName ?? 'Participante')
						: null,
					drawWinnerPhone: hasWinner ? (winnerTicket.userPhone ?? null) : null,
				},
				{ merge: true },
			);
		} catch (drawError) {
			console.error('Error ejecutando sorteo:', drawError);
		} finally {
			setDrawRunning(false);
		}
	}, [drawRunning, raffleId, tickets]);

	useEffect(() => {
		if (!raffle?.drawScheduledAt || raffle.drawStatus !== 'scheduled') return;
		const msUntilDraw = new Date(raffle.drawScheduledAt).getTime() - Date.now();
		if (msUntilDraw <= 0) {
			runDraw();
			return;
		}
		const timer = window.setTimeout(() => {
			runDraw();
		}, msUntilDraw);
		return () => window.clearTimeout(timer);
	}, [raffle?.drawScheduledAt, raffle?.drawStatus, runDraw]);

	const selectedTickets = useMemo(
		() => tickets.filter((ticket) => selectedNumbers.includes(ticket.number)),
		[selectedNumbers, tickets],
	);

	const soldCount = tickets.filter((ticket) => ticket.status === 'sold').length;
	const availableCount = tickets.filter(
		(ticket) => ticket.status === 'available',
	).length;
	const ticketPrice = raffle?.ticketPrice ?? null;
	const selectedTotal =
		typeof ticketPrice === 'number'
			? ticketPrice * selectedNumbers.length
			: null;
	const purchaseLocked =
		raffle?.isArchived ||
		raffle?.drawStatus === 'drawing' ||
		raffle?.drawStatus === 'completed';
	const canProceedToCheckout =
		selectedNumbers.length > 0 &&
		!purchaseLocked &&
		typeof ticketPrice === 'number' &&
		ticketPrice > 0;

	const toggleNumberSelection = (ticket: Ticket) => {
		if (ticket.status !== 'available' || purchaseLocked) {
			return;
		}

		setSelectedNumbers((current) =>
			current.includes(ticket.number)
				? current.filter((number) => number !== ticket.number)
				: [...current, ticket.number].sort((left, right) => left - right),
		);
	};

	const handleCheckout = async () => {
		if (purchaseLocked) {
			setError(
				'La compra ya no está disponible porque el sorteo está en curso o finalizado.',
			);
			return;
		}
		if (
			!buyerName.trim() ||
			!buyerNationalId.trim() ||
			!buyerPhone.trim() ||
			!paymentReference.trim()
		) {
			setError('Completa todos los datos para registrar tu compra.');
			return;
		}
		if (!acceptedTerms) {
			setError('Debes aceptar los términos y condiciones para continuar.');
			return;
		}
		if (!selectedTickets.length) {
			setError('Selecciona al menos un número.');
			return;
		}
		if (typeof ticketPrice !== 'number' || ticketPrice <= 0) {
			setError('Esta rifa no tiene un precio válido configurado.');
			return;
		}

		setSubmitting(true);
		setError(null);

		try {
			const batch = writeBatch(db);
			selectedTickets.forEach((ticket) => {
				batch.set(
					doc(db, 'tickets', ticket.id),
					{
						status: 'sold',
						userName: buyerName.trim(),
						userNationalId: buyerNationalId.trim(),
						userPhone: buyerPhone.trim(),
						paymentRef: paymentReference.trim(),
						purchasedAt: new Date().toISOString(),
					},
					{ merge: true },
				);
			});
			await batch.commit();

			setSuccessMessage('Tu compra fue registrada con éxito.');
			setSelectedNumbers([]);
			setBuyerName('');
			setBuyerNationalId('');
			setBuyerPhone('');
			setPaymentReference('');
			setAcceptedTerms(false);
			setShowCheckout(false);
		} catch (submitError) {
			console.error('Error registrando compra:', submitError);
			setError('No se pudo registrar la compra. Intenta nuevamente.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className='min-h-screen bg-[#0f172a] text-slate-200'>
			<div className='max-w-7xl mx-auto px-4 py-8 pb-32 sm:px-6 sm:pb-8 lg:px-8'>
				<div className='mb-6'>
					<Link
						href='/'
						className='inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition'
					>
						← Volver a rifas
					</Link>
				</div>

				{successMessage && (
					<div className='mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300'>
						{successMessage}
					</div>
				)}

				{error && (
					<div className='mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300'>
						{error}
					</div>
				)}

				{loading && (
					<div className='mb-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300'>
						Cargando información de la rifa...
					</div>
				)}

				{raffle && (
					<div className='grid gap-6 lg:grid-cols-[1.15fr_0.85fr]'>
						<div className='space-y-6'>
							<div className='overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70'>
								<div className='relative aspect-16/10 w-full'>
									{raffle.imageUrl ? (
										<Image
											src={raffle.imageUrl}
											alt={raffle.title}
											fill
											sizes='(max-width: 1024px) 100vw, 60vw'
											className='object-cover'
											priority
										/>
									) : (
										<div className='h-full w-full bg-slate-800' />
									)}
								</div>
								<div className='p-5 sm:p-6'>
									<h1 className='bg-linear-to-r from-amber-200 via-white to-sky-200 bg-clip-text text-3xl font-black text-transparent sm:text-4xl'>
										{raffle.title}
									</h1>
									<p className='mt-3 text-sm leading-6 text-slate-300 sm:text-base'>
										{raffle.description}
									</p>
									<div className='mt-5 grid gap-3 sm:grid-cols-4'>
										<div className='rounded-2xl border border-slate-800 bg-slate-950/70 p-4'>
											<p className='text-xs uppercase tracking-[0.25em] text-slate-500'>
												Disponibles
											</p>
											<p className='mt-2 text-2xl font-black text-emerald-300'>
												{availableCount}
											</p>
										</div>
										<div className='rounded-2xl border border-slate-800 bg-slate-950/70 p-4'>
											<p className='text-xs uppercase tracking-[0.25em] text-slate-500'>
												Vendidos
											</p>
											<p className='mt-2 text-2xl font-black text-rose-300'>
												{soldCount}
											</p>
										</div>
										<div className='rounded-2xl border border-slate-800 bg-slate-950/70 p-4'>
											<p className='text-xs uppercase tracking-[0.25em] text-slate-500'>
												Precio
											</p>
											<p className='mt-2 text-2xl font-black text-amber-300'>
												{typeof ticketPrice === 'number'
													? `$${ticketPrice.toFixed(2)}`
													: 'N/D'}
											</p>
										</div>
										<div className='rounded-2xl border border-slate-800 bg-slate-950/70 p-4'>
											<p className='text-xs uppercase tracking-[0.25em] text-slate-500'>
												Sorteo
											</p>
											<p className='mt-2 text-sm font-semibold text-slate-200'>
												{raffle.drawScheduledAt
													? new Date(raffle.drawScheduledAt).toLocaleString()
													: raffle.drawDate
														? new Date(raffle.drawDate).toLocaleDateString()
														: 'Por anunciar'}
											</p>
										</div>
									</div>
								</div>
							</div>

							<div className='rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6'>
								<div className='flex flex-wrap items-center justify-between gap-3'>
									<div>
										<p className='text-xs uppercase tracking-[0.3em] text-slate-500'>
											Selecciona tus números
										</p>
										<h2 className='mt-2 text-xl font-black text-white'>
											Tablero disponible
										</h2>
									</div>
									<div className='rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300'>
										{selectedNumbers.length} seleccionados
									</div>
								</div>
								<div className='mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10'>
									{tickets.map((ticket) => {
										const isSelected = selectedNumbers.includes(ticket.number);
										const baseStyles =
											'flex h-12 items-center justify-center rounded-2xl border text-sm font-black transition';
										let stateStyles =
											'border-slate-800 bg-slate-950 text-slate-500';

										if (ticket.status === 'available' && !purchaseLocked) {
											stateStyles = isSelected
												? 'border-amber-400 bg-amber-400 text-slate-950 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
												: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-500/20';
										}
										if (ticket.status === 'sold') {
											stateStyles =
												'border-rose-500/40 bg-rose-500/10 text-rose-300 cursor-not-allowed';
										}
										if (ticket.status === 'reserved') {
											stateStyles =
												'border-sky-500/40 bg-sky-500/10 text-sky-300 cursor-not-allowed';
										}
										if (purchaseLocked && ticket.status === 'available') {
											stateStyles =
												'border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed';
										}

										return (
											<button
												key={ticket.id}
												type='button'
												onClick={() => toggleNumberSelection(ticket)}
												disabled={
													ticket.status !== 'available' || purchaseLocked
												}
												className={`${baseStyles} ${stateStyles}`}
											>
												{formatTicketNumber(ticket.number)}
											</button>
										);
									})}
								</div>
								{selectedNumbers.length > 0 && !showCheckout && (
									<div className='mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100 sm:hidden'>
										Tienes {selectedNumbers.length} número
										{selectedNumbers.length === 1 ? '' : 's'} seleccionado
										{selectedNumbers.length === 1 ? '' : 's'}. Usa la barra
										inferior para continuar al pago.
									</div>
								)}
							</div>
						</div>

						<div className='space-y-6'>
							<div className='rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6'>
								<p className='text-xs uppercase tracking-[0.3em] text-slate-500'>
									Sorteo en vivo
								</p>
								<h2 className='mt-2 text-xl font-black text-white'>
									Estado actual
								</h2>
								{raffle.drawStatus === 'scheduled' &&
									raffle.drawScheduledAt && (
										<>
											<p className='mt-4 text-sm text-slate-300'>
												El sorteo comienza el{' '}
												{new Date(raffle.drawScheduledAt).toLocaleString()}.
											</p>
											<p className='mt-3 text-4xl font-black text-amber-300'>
												{formatCountdown(raffle.drawScheduledAt, now)}
											</p>
										</>
									)}
								{(raffle.drawStatus === 'drawing' || drawRunning) && (
									<p className='mt-4 text-lg font-bold text-sky-300'>
										Sorteando en vivo...
									</p>
								)}
								{raffle.drawStatus === 'completed' && (
									<div className='mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4'>
										<p className='text-sm text-slate-400'>Resultado oficial</p>
										<p className='mt-2 text-3xl font-black text-white'>
											Número #{formatTicketNumber(raffle.drawWinnerNumber ?? 0)}
										</p>
										<p className='mt-2 text-sm text-slate-300'>
											{raffle.drawOutcome === 'winner'
												? `Ganador: ${raffle.drawWinnerName ?? 'Participante'}`
												: 'No hubo ganador porque el número sorteado no había sido comprado.'}
										</p>
									</div>
								)}
								{raffle.drawStatus === 'notScheduled' && (
									<p className='mt-4 text-sm text-slate-400'>
										Aún no hay una fecha programada para el sorteo.
									</p>
								)}
							</div>

							<div className='rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6'>
								<p className='text-xs uppercase tracking-[0.3em] text-slate-500'>
									Tu selección
								</p>
								<h2 className='mt-2 text-xl font-black text-white'>
									Resumen de compra
								</h2>
								{selectedNumbers.length === 0 ? (
									<p className='mt-4 text-sm text-slate-400'>
										Selecciona uno o varios números para continuar.
									</p>
								) : (
									<>
										<div className='mt-4 flex flex-wrap gap-2'>
											{selectedNumbers.map((ticketNumber) => (
												<span
													key={ticketNumber}
													className='rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-200'
												>
													#{formatTicketNumber(ticketNumber)}
												</span>
											))}
										</div>
										<p className='mt-3 text-sm text-slate-300'>
											Total:{' '}
											<span className='font-bold text-amber-300'>
												{selectedTotal !== null
													? `$${selectedTotal.toFixed(2)}`
													: 'No definido'}
											</span>
										</p>
										<button
											type='button'
											onClick={() => setShowCheckout(true)}
											disabled={
												purchaseLocked ||
												typeof ticketPrice !== 'number' ||
												ticketPrice <= 0
											}
											className='mt-5 w-full rounded-2xl bg-linear-to-r from-amber-400 via-orange-400 to-rose-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:opacity-90 disabled:opacity-60'
										>
											Proceder al pago
										</button>
									</>
								)}
								{purchaseLocked && (
									<p className='mt-4 text-sm text-amber-300'>
										Las compras están cerradas porque el sorteo ya está en curso
										o finalizó.
									</p>
								)}
								{(typeof ticketPrice !== 'number' || ticketPrice <= 0) && (
									<p className='mt-4 text-sm text-red-300'>
										Esta rifa no tiene precio configurado por número.
									</p>
								)}
							</div>

							<div className='rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6'>
								<p className='text-xs uppercase tracking-[0.3em] text-slate-500'>
									Guía rápida
								</p>
								<ul className='mt-4 space-y-3 text-sm text-slate-300'>
									<li>1. Elige tus números disponibles.</li>
									<li>2. Envía el pago por tu método habitual.</li>
									<li>3. Registra tu referencia para validar la compra.</li>
									<li>
										4. Sigue esta página para ver la cuenta regresiva y el
										resultado en tiempo real.
									</li>
								</ul>
							</div>
						</div>
					</div>
				)}
			</div>

			{raffle && selectedNumbers.length > 0 && !showCheckout && (
				<div className='fixed inset-x-0 bottom-0 z-40 border-t border-slate-700 bg-slate-950/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden'>
					<div className='mx-auto flex max-w-7xl items-center gap-3'>
						<div className='min-w-0 flex-1'>
							<p className='text-xs uppercase tracking-[0.25em] text-slate-400'>
								Selección activa
							</p>
							<p className='mt-1 truncate text-sm font-semibold text-white'>
								{selectedNumbers.length} número
								{selectedNumbers.length === 1 ? '' : 's'} seleccionado
								{selectedNumbers.length === 1 ? '' : 's'}
							</p>
							<p className='text-sm text-amber-300'>
								Total:{' '}
								{selectedTotal !== null
									? `$${selectedTotal.toFixed(2)}`
									: 'No definido'}
							</p>
						</div>
						<button
							type='button'
							onClick={() => setShowCheckout(true)}
							disabled={!canProceedToCheckout}
							className='rounded-2xl bg-linear-to-r from-amber-400 via-orange-400 to-rose-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:opacity-90 disabled:opacity-60'
						>
							Ir al pago
						</button>
					</div>
				</div>
			)}

			{showCheckout && (
				<div className='fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center'>
					<div className='w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6'>
						<div className='flex items-center justify-between gap-3'>
							<div>
								<p className='text-xs uppercase tracking-[0.3em] text-slate-500'>
									Checkout
								</p>
								<h3 className='mt-2 text-xl font-black text-white'>
									Completa tus datos
								</h3>
							</div>
							<button
								type='button'
								onClick={() => setShowCheckout(false)}
								className='rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300'
							>
								Cerrar
							</button>
						</div>

						<div className='mt-5 space-y-4'>
							<div>
								<label className='mb-2 block text-sm font-semibold text-slate-200'>
									Nombre y apellido
								</label>
								<input
									type='text'
									value={buyerName}
									onChange={(event) => setBuyerName(event.target.value)}
									className='w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400'
									placeholder='Ej: María Pérez'
								/>
							</div>
							<div>
								<label className='mb-2 block text-sm font-semibold text-slate-200'>
									Cédula de identidad
								</label>
								<input
									type='text'
									value={buyerNationalId}
									onChange={(event) => setBuyerNationalId(event.target.value)}
									className='w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400'
									placeholder='Ej: V-12345678'
								/>
							</div>
							<div>
								<label className='mb-2 block text-sm font-semibold text-slate-200'>
									Teléfono
								</label>
								<input
									type='tel'
									value={buyerPhone}
									onChange={(event) => setBuyerPhone(event.target.value)}
									className='w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400'
									placeholder='Ej: 0412-0000000'
								/>
							</div>
							<div>
								<label className='mb-2 block text-sm font-semibold text-slate-200'>
									Referencia de pago
								</label>
								<input
									type='text'
									value={paymentReference}
									onChange={(event) => setPaymentReference(event.target.value)}
									className='w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400'
									placeholder='Ej: 123456'
								/>
							</div>
							<label className='flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300'>
								<input
									type='checkbox'
									checked={acceptedTerms}
									onChange={(event) => setAcceptedTerms(event.target.checked)}
									className='mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-amber-400'
								/>
								<span>
									Acepto los{' '}
									<Link
										href='/terminos'
										className='font-semibold text-amber-300 underline'
									>
										términos y condiciones
									</Link>
									.
								</span>
							</label>
						</div>

						<button
							type='button'
							onClick={handleCheckout}
							disabled={submitting || purchaseLocked}
							className='mt-5 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-70'
						>
							{submitting ? 'Registrando compra...' : 'Confirmar compra'}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default RaffleDetailPage;
