'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
	collection,
	query,
	orderBy,
	where,
	doc,
	getDoc,
	updateDoc,
	setDoc,
	onSnapshot,
	runTransaction,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import {
	Raffle,
	RaffleCertificate,
	Ticket,
	TicketStatus,
} from '@/types/raffle';

const STATUS_LABELS: Record<TicketStatus, string> = {
	available: 'Disponible',
	reserved: 'Reservado',
	sold: 'Vendido',
	notAvailable: 'No disponible',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
	available: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
	reserved: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
	sold: 'bg-red-500/20 text-red-300 border-red-500/40',
	notAvailable: 'bg-slate-700 text-slate-400 border-slate-600',
};

const toLocalDateTimeInput = (iso?: string | null) => {
	if (!iso) return '';
	const date = new Date(iso);
	const offset = date.getTimezoneOffset();
	const local = new Date(date.getTime() - offset * 60000);
	return local.toISOString().slice(0, 16);
};

const formatCountdown = (target: string) => {
	const distance = new Date(target).getTime() - Date.now();
	if (distance <= 0) return '00:00:00';
	const hours = Math.floor(distance / (1000 * 60 * 60));
	const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((distance % (1000 * 60)) / 1000);
	return [hours, minutes, seconds]
		.map((value) => value.toString().padStart(2, '0'))
		.join(':');
};

const buildVerificationCode = (raffleId: string, winnerNumber: number) => {
	const raffleToken = raffleId.slice(0, 6).toUpperCase();
	const winnerToken = String(winnerNumber).padStart(2, '0');
	const timeToken = Date.now().toString(36).toUpperCase();
	return `NINO-${raffleToken}-${winnerToken}-${timeToken}`;
};

const AdminRafflePage: React.FC = () => {
	const params = useParams();
	const raffleId = (params?.raffleId as string) ?? '';

	const [adminUser, setAdminUser] = useState<User | null>(null);
	const [raffle, setRaffle] = useState<Raffle | null>(null);
	const [tickets, setTickets] = useState<Ticket[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const [actionNotice, setActionNotice] = useState<string | null>(null);
	const [scheduleInput, setScheduleInput] = useState('');
	const [savingSchedule, setSavingSchedule] = useState(false);
	const [runningDraw, setRunningDraw] = useState(false);
	const [issuingCertificate, setIssuingCertificate] = useState(false);
	const [certificate, setCertificate] = useState<RaffleCertificate | null>(
		null,
	);

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, (user) => {
			setAdminUser(user);
			if (!user) {
				setLoading(false);
			}
		});
		return () => unsub();
	}, []);

	useEffect(() => {
		if (!adminUser || !raffleId) return;

		const raffleRef = doc(db, 'raffles', raffleId);
		const ticketsQuery = query(
			collection(db, 'tickets'),
			where('raffleId', '==', raffleId),
			orderBy('number'),
		);
		const certificateRef = doc(db, 'raffleCertificates', raffleId);

		const unsubRaffle = onSnapshot(
			raffleRef,
			(snapshot) => {
				if (!snapshot.exists()) {
					setError('Rifa no encontrada.');
					setLoading(false);
					return;
				}
				const data = snapshot.data() as Raffle;
				setRaffle({
					id: snapshot.id,
					title: data.title ?? '',
					description: data.description ?? '',
					drawDate: data.drawDate ?? '',
					ticketPrice:
						typeof data.ticketPrice === 'number' ? data.ticketPrice : null,
					imageUrl: data.imageUrl ?? null,
					createdAt: data.createdAt ?? null,
					isArchived: data.isArchived ?? false,
					archivedAt: data.archivedAt ?? null,
					drawScheduledAt: data.drawScheduledAt ?? null,
					drawExecutedAt: data.drawExecutedAt ?? null,
					drawStatus: data.drawStatus ?? 'notScheduled',
					drawOutcome: data.drawOutcome ?? null,
					drawWinnerNumber: data.drawWinnerNumber ?? null,
					drawWinnerName: data.drawWinnerName ?? null,
					drawWinnerPhone: data.drawWinnerPhone ?? null,
				});
				setScheduleInput(
					(prev) => prev || toLocalDateTimeInput(data.drawScheduledAt),
				);
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
			(snapshot) => {
				setTickets(
					snapshot.docs.map((ticketDoc) => {
						const data = ticketDoc.data() as Ticket;
						return {
							id: ticketDoc.id,
							raffleId: data.raffleId,
							number: Number(data.number ?? 0),
							status: (data.status as TicketStatus) ?? 'available',
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
				setError('No se pudieron cargar los tickets.');
				setLoading(false);
			},
		);

		const unsubCertificate = onSnapshot(
			certificateRef,
			(snapshot) => {
				if (!snapshot.exists()) {
					setCertificate(null);
					return;
				}
				const data = snapshot.data() as RaffleCertificate;
				setCertificate({
					id: snapshot.id,
					raffleId: data.raffleId,
					raffleTitle: data.raffleTitle,
					drawExecutedAt: data.drawExecutedAt,
					drawOutcome: data.drawOutcome ?? 'no-winner',
					drawWinnerNumber: Number(data.drawWinnerNumber ?? 0),
					winnerName: data.winnerName ?? null,
					winnerPhone: data.winnerPhone ?? null,
					verificationCode: data.verificationCode,
					verificationUrl: data.verificationUrl,
					issuedAt: data.issuedAt,
					issuedByUid: data.issuedByUid ?? null,
					status: 'valid',
				});
			},
			(err) => {
				console.error('Error cargando certificado:', err);
			},
		);

		return () => {
			unsubRaffle();
			unsubTickets();
			unsubCertificate();
		};
	}, [adminUser, raffleId]);

	const issueCertificate = useCallback(
		async (payload?: {
			drawExecutedAt: string;
			drawOutcome: 'winner' | 'no-winner';
			drawWinnerNumber: number;
			winnerName: string | null;
			winnerPhone: string | null;
		}) => {
			if (!raffle || !raffleId) return;
			const winnerNumber = payload?.drawWinnerNumber ?? raffle.drawWinnerNumber;
			const drawOutcome = payload?.drawOutcome ?? raffle.drawOutcome;
			const winnerName = payload?.winnerName ?? raffle.drawWinnerName ?? null;
			const drawExecutedAt = payload?.drawExecutedAt ?? raffle.drawExecutedAt;
			const winnerPhone =
				payload?.winnerPhone ?? raffle.drawWinnerPhone ?? null;

			if (
				typeof winnerNumber !== 'number' ||
				!drawExecutedAt ||
				(drawOutcome !== 'winner' && drawOutcome !== 'no-winner')
			) {
				setActionNotice('Faltan datos del sorteo para emitir el certificado.');
				setTimeout(() => setActionNotice(null), 2200);
				return;
			}

			setIssuingCertificate(true);
			try {
				const certRef = doc(db, 'raffleCertificates', raffleId);
				const currentCert = await getDoc(certRef);
				const verificationCode = currentCert.exists()
					? ((currentCert.data().verificationCode as string | undefined) ??
						buildVerificationCode(raffleId, winnerNumber))
					: buildVerificationCode(raffleId, winnerNumber);
				const origin = window.location.origin;
				const verificationUrl = `${origin}/certificado/${raffleId}`;

				await setDoc(
					certRef,
					{
						raffleId,
						raffleTitle: raffle.title,
						drawExecutedAt,
						drawOutcome,
						drawWinnerNumber: winnerNumber,
						winnerName: drawOutcome === 'winner' ? winnerName : null,
						winnerPhone: drawOutcome === 'winner' ? winnerPhone : null,
						verificationCode,
						verificationUrl,
						issuedAt: new Date().toISOString(),
						issuedByUid: adminUser?.uid ?? null,
						status: 'valid',
					},
					{ merge: true },
				);

				setActionNotice('Certificado emitido correctamente.');
				setTimeout(() => setActionNotice(null), 2400);
			} catch (err) {
				console.error('Error emitiendo certificado:', err);
				setActionNotice('No se pudo emitir el certificado.');
				setTimeout(() => setActionNotice(null), 2400);
			} finally {
				setIssuingCertificate(false);
			}
		},
		[adminUser?.uid, raffle, raffleId],
	);

	const updateTicketStatus = async (
		ticketId: string,
		newStatus: TicketStatus,
	) => {
		if (raffle?.isArchived) {
			setActionNotice('Esta rifa está culminada. Solo lectura para auditoría.');
			setTimeout(() => setActionNotice(null), 2200);
			return;
		}
		if (
			raffle?.drawStatus === 'drawing' ||
			raffle?.drawStatus === 'completed'
		) {
			setActionNotice('El sorteo ya está en curso o finalizado.');
			setTimeout(() => setActionNotice(null), 2200);
			return;
		}
		setUpdatingId(ticketId);
		try {
			await updateDoc(doc(db, 'tickets', ticketId), { status: newStatus });
			setActionNotice('Estado actualizado.');
			setTimeout(() => setActionNotice(null), 1800);
		} catch (err) {
			console.error('Error actualizando ticket:', err);
			setActionNotice('No se pudo actualizar el estado.');
			setTimeout(() => setActionNotice(null), 2200);
		} finally {
			setUpdatingId(null);
		}
	};

	const saveDrawSchedule = async () => {
		if (raffle?.isArchived) {
			setActionNotice('No puedes programar una rifa culminada.');
			setTimeout(() => setActionNotice(null), 2200);
			return;
		}
		try {
			setSavingSchedule(true);
			await setDoc(
				doc(db, 'raffles', raffleId),
				{
					drawScheduledAt: scheduleInput
						? new Date(scheduleInput).toISOString()
						: null,
					drawStatus: scheduleInput ? 'scheduled' : 'notScheduled',
					drawExecutedAt: null,
					drawOutcome: null,
					drawWinnerNumber: null,
					drawWinnerName: null,
					drawWinnerPhone: null,
				},
				{ merge: true },
			);
			setActionNotice(
				scheduleInput
					? 'Sorteo programado correctamente.'
					: 'Programación eliminada.',
			);
			setTimeout(() => setActionNotice(null), 2200);
		} catch (err) {
			console.error('Error programando sorteo:', err);
			setActionNotice('No se pudo guardar la programación del sorteo.');
			setTimeout(() => setActionNotice(null), 2200);
		} finally {
			setSavingSchedule(false);
		}
	};

	const runDraw = useCallback(async () => {
		if (!raffleId || !tickets.length) {
			setActionNotice('No hay tickets disponibles para realizar el sorteo.');
			setTimeout(() => setActionNotice(null), 2200);
			return;
		}
		if (raffle?.isArchived) {
			setActionNotice('No se puede ejecutar un sorteo en una rifa culminada.');
			setTimeout(() => setActionNotice(null), 2200);
			return;
		}
		if (runningDraw || raffle?.drawStatus === 'completed') {
			return;
		}

		setRunningDraw(true);
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
				setRunningDraw(false);
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 1800));
			const winnerTicket = tickets[Math.floor(Math.random() * tickets.length)];
			const hasWinner = winnerTicket.status === 'sold';
			const drawExecutedAt = new Date().toISOString();
			await setDoc(
				doc(db, 'raffles', raffleId),
				{
					drawStatus: 'completed',
					drawExecutedAt,
					drawOutcome: hasWinner ? 'winner' : 'no-winner',
					drawWinnerNumber: winnerTicket.number,
					drawWinnerName: hasWinner
						? (winnerTicket.userName ?? 'Participante')
						: null,
					drawWinnerPhone: hasWinner ? (winnerTicket.userPhone ?? null) : null,
				},
				{ merge: true },
			);
			await issueCertificate({
				drawExecutedAt,
				drawOutcome: hasWinner ? 'winner' : 'no-winner',
				drawWinnerNumber: winnerTicket.number,
				winnerName: hasWinner ? (winnerTicket.userName ?? 'Participante') : null,
				winnerPhone: hasWinner ? (winnerTicket.userPhone ?? null) : null,
			});
			setActionNotice(
				hasWinner
					? 'Sorteo ejecutado con ganador.'
					: 'Sorteo ejecutado sin ganador.',
			);
			setTimeout(() => setActionNotice(null), 2400);
		} catch (err) {
			console.error('Error ejecutando sorteo:', err);
			setActionNotice('No se pudo ejecutar el sorteo.');
			setTimeout(() => setActionNotice(null), 2400);
		} finally {
			setRunningDraw(false);
		}
	}, [
		issueCertificate,
		raffle?.drawStatus,
		raffle?.isArchived,
		raffleId,
		runningDraw,
		tickets,
	]);

	useEffect(() => {
		if (
			!adminUser ||
			!raffle?.drawScheduledAt ||
			raffle.drawStatus !== 'scheduled'
		) {
			return;
		}
		const msUntilDraw = new Date(raffle.drawScheduledAt).getTime() - Date.now();
		if (msUntilDraw <= 0) {
			runDraw();
			return;
		}
		const timer = window.setTimeout(() => {
			runDraw();
		}, msUntilDraw);
		return () => window.clearTimeout(timer);
	}, [adminUser, raffle?.drawScheduledAt, raffle?.drawStatus, runDraw]);

	const filtered =
		filterStatus === 'all'
			? tickets
			: tickets.filter((ticket) => ticket.status === filterStatus);

	const counts: Record<TicketStatus | 'all', number> = useMemo(
		() => ({
			all: tickets.length,
			available: tickets.filter((ticket) => ticket.status === 'available')
				.length,
			reserved: tickets.filter((ticket) => ticket.status === 'reserved').length,
			sold: tickets.filter((ticket) => ticket.status === 'sold').length,
			notAvailable: tickets.filter((ticket) => ticket.status === 'notAvailable')
				.length,
		}),
		[tickets],
	);

	if (!adminUser) {
		return (
			<div className='min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-300'>
				<div className='text-center'>
					<p className='mb-4'>Debes iniciar sesión como admin.</p>
					<Link
						href='/admin'
						className='rounded-lg bg-indigo-500 px-4 py-2 text-white font-bold'
					>
						Ir al login
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-[#0f172a] text-slate-200 p-3 sm:p-4 md:p-8'>
			<div className='max-w-7xl mx-auto'>
				{actionNotice && (
					<div className='mb-4 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-300'>
						{actionNotice}
					</div>
				)}
				<div className='mb-6'>
					<Link
						href='/admin'
						className='inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition'
					>
						← Volver al panel
					</Link>
				</div>

				{raffle && (
					<>
						<div className='flex flex-col md:flex-row gap-4 sm:gap-6 mb-6 bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-700'>
							{raffle.imageUrl && (
								<div className='relative w-full md:w-48 h-40 sm:h-36 rounded-xl overflow-hidden shrink-0'>
									<Image
										src={raffle.imageUrl}
										alt={raffle.title}
										fill
										sizes='(max-width: 768px) 100vw, 192px'
										className='object-cover'
									/>
								</div>
							)}
							<div>
								<h1 className='text-2xl sm:text-3xl font-black text-white mb-1'>
									{raffle.title}
								</h1>
								{raffle.isArchived && (
									<p className='inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 mb-2'>
										Rifa culminada (modo auditoría)
									</p>
								)}
								<p className='text-slate-300 text-sm mb-2'>
									{raffle.description}
								</p>
								{raffle.drawDate && (
									<p className='text-xs text-slate-400'>
										Sorteo general:{' '}
										{new Date(raffle.drawDate).toLocaleDateString()}
									</p>
								)}
								<p className='text-xs text-slate-400 mt-1'>
									Precio por número:{' '}
									{typeof raffle.ticketPrice === 'number'
										? `$${raffle.ticketPrice.toFixed(2)}`
										: 'No definido'}
								</p>
							</div>
						</div>

						<div className='mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]'>
							<div className='rounded-2xl border border-slate-700 bg-slate-900/60 p-4'>
								<h2 className='text-lg font-bold text-white mb-2'>
									Programar sorteo
								</h2>
								<p className='text-sm text-slate-400 mb-3'>
									Define la fecha y hora del sorteo. Para ejecución automática
									sin backend, mantén esta vista abierta hasta la hora
									programada.
								</p>
								<div className='flex flex-col sm:flex-row gap-2'>
									<input
										type='datetime-local'
										value={scheduleInput}
										onChange={(e) => setScheduleInput(e.target.value)}
										disabled={
											raffle.isArchived || raffle.drawStatus === 'drawing'
										}
										className='w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100'
									/>
									<button
										onClick={saveDrawSchedule}
										disabled={
											savingSchedule ||
											raffle.isArchived ||
											raffle.drawStatus === 'drawing'
										}
										className='rounded-lg bg-amber-500 px-4 py-2 font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-60'
									>
										{savingSchedule ? 'Guardando...' : 'Guardar fecha'}
									</button>
								</div>
								<div className='mt-3 flex flex-wrap gap-2'>
									<button
										onClick={runDraw}
										disabled={
											runningDraw ||
											raffle.isArchived ||
											raffle.drawStatus === 'completed' ||
											tickets.length === 0
										}
										className='rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-60'
									>
										{runningDraw || raffle.drawStatus === 'drawing'
											? 'Sorteando...'
											: 'Ejecutar sorteo ahora'}
									</button>
								</div>
							</div>

							<div className='rounded-2xl border border-slate-700 bg-slate-900/60 p-4'>
								<h2 className='text-lg font-bold text-white mb-2'>
									Estado del sorteo
								</h2>
								<p className='text-sm text-slate-300'>
									Estado actual:{' '}
									<span className='font-bold text-white'>
										{raffle.drawStatus ?? 'notScheduled'}
									</span>
								</p>
								{raffle.drawScheduledAt && (
									<p className='mt-2 text-sm text-slate-300'>
										Programado para:{' '}
										{new Date(raffle.drawScheduledAt).toLocaleString()}
									</p>
								)}
								{raffle.drawExecutedAt && (
									<p className='mt-2 text-sm text-slate-300'>
										Ejecutado:{' '}
										{new Date(raffle.drawExecutedAt).toLocaleString()}
									</p>
								)}
								{raffle.drawStatus === 'scheduled' &&
									raffle.drawScheduledAt && (
										<p className='mt-2 text-xl font-black text-amber-300'>
											{formatCountdown(raffle.drawScheduledAt)}
										</p>
									)}
								{raffle.drawStatus === 'completed' && (
									<div className='mt-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3'>
										<p className='text-sm text-slate-400 mb-1'>
											Resultado final
										</p>
										<p className='text-lg font-black text-white'>
											Número: #
											{String(raffle.drawWinnerNumber ?? '--').padStart(2, '0')}
										</p>
										<p className='text-sm text-slate-300 mt-1'>
											{raffle.drawOutcome === 'winner'
												? `Ganador: ${raffle.drawWinnerName ?? 'Participante'}`
												: 'No hubo ganador porque el número sorteado no fue comprado.'}
										</p>
										{(raffle.drawOutcome === 'winner' ||
											raffle.drawOutcome === 'no-winner') && (
											<div className='mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3'>
												<p className='text-xs uppercase tracking-[0.2em] text-emerald-300'>
													Certificado de validez
												</p>
												<p className='mt-1 text-sm text-slate-200'>
													Estado:{' '}
													<span className='font-bold text-white'>
														{certificate ? 'Emitido' : 'Pendiente'}
													</span>
												</p>
												<div className='mt-3 flex flex-wrap gap-2'>
													<button
														onClick={() => issueCertificate()}
														disabled={issuingCertificate}
														className='rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-emerald-300 disabled:opacity-60'
													>
														{issuingCertificate
															? 'Emitiendo...'
															: certificate
																? 'Reemitir certificado'
																: 'Emitir certificado'}
													</button>
													<Link
														href={`/certificado/${raffleId}`}
														target='_blank'
														className='rounded-lg border border-emerald-300/40 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:border-emerald-200 hover:text-white'
													>
														Ver certificado público
													</Link>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</>
				)}

				<div className='flex gap-2 mb-6 overflow-x-auto pb-1'>
					{(
						['all', 'available', 'reserved', 'sold', 'notAvailable'] as const
					).map((status) => (
						<button
							key={status}
							onClick={() => setFilterStatus(status)}
							className={`px-3 py-1.5 rounded-full text-sm font-semibold border whitespace-nowrap transition ${
								filterStatus === status
									? 'bg-amber-500 text-slate-900 border-amber-400'
									: 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
							}`}
						>
							{status === 'all' ? 'Todos' : STATUS_LABELS[status]} (
							{counts[status]})
						</button>
					))}
				</div>

				{error && <p className='text-red-300 mb-4'>{error}</p>}
				{raffle?.isArchived && (
					<p className='mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200'>
						Esta rifa fue culminada y se conserva como historial. Los cambios de
						estado y el sorteo están deshabilitados.
					</p>
				)}

				{loading ? (
					<p className='text-slate-400'>Cargando tickets...</p>
				) : (
					<>
						<div className='md:hidden space-y-3'>
							{filtered.map((ticket) => (
								<div
									key={ticket.id}
									className='rounded-2xl border border-slate-700 bg-slate-900/70 p-3'
								>
									<div className='flex items-center justify-between mb-2'>
										<p className='text-lg font-black text-white'>
											#{ticket.number.toString().padStart(2, '0')}
										</p>
										<span
											className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${STATUS_COLORS[ticket.status]}`}
										>
											{STATUS_LABELS[ticket.status]}
										</span>
									</div>
									<p className='text-sm text-slate-300'>
										<strong>Nombre:</strong> {ticket.userName ?? '—'}
									</p>
									<p className='text-sm text-slate-300'>
										<strong>Cédula:</strong> {ticket.userNationalId ?? '—'}
									</p>
									<p className='text-sm text-slate-300'>
										<strong>Telefono:</strong> {ticket.userPhone ?? '—'}
									</p>
									<p className='text-sm text-slate-300'>
										<strong>Referencia:</strong> {ticket.paymentRef ?? '—'}
									</p>
									<p className='text-xs text-slate-400 mb-2'>
										{ticket.purchasedAt
											? new Date(ticket.purchasedAt).toLocaleDateString()
											: 'Sin fecha de compra'}
									</p>
									<select
										value={ticket.status}
										disabled={
											updatingId === ticket.id ||
											raffle?.isArchived === true ||
											raffle?.drawStatus === 'drawing' ||
											raffle?.drawStatus === 'completed'
										}
										onChange={(e) =>
											updateTicketStatus(
												ticket.id,
												e.target.value as TicketStatus,
											)
										}
										className='w-full bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-70'
									>
										<option value='available'>Disponible</option>
										<option value='reserved'>Reservado</option>
										<option value='sold'>Vendido</option>
										<option value='notAvailable'>No disponible</option>
									</select>
								</div>
							))}
							{filtered.length === 0 && (
								<div className='rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-center text-slate-500'>
									No hay tickets con ese estado.
								</div>
							)}
						</div>

						<div className='hidden md:block overflow-x-auto rounded-2xl border border-slate-700'>
							<table className='w-full text-sm'>
								<thead className='bg-slate-800 text-slate-400'>
									<tr>
										<th className='px-4 py-3 text-left'>Número</th>
										<th className='px-4 py-3 text-left'>Estado</th>
										<th className='px-4 py-3 text-left'>Nombre</th>
										<th className='px-4 py-3 text-left'>Cédula</th>
										<th className='px-4 py-3 text-left'>Teléfono</th>
										<th className='px-4 py-3 text-left'>Referencia</th>
										<th className='px-4 py-3 text-left'>Fecha</th>
										<th className='px-4 py-3 text-left'>Acción</th>
									</tr>
								</thead>
								<tbody>
									{filtered.map((ticket) => (
										<tr
											key={ticket.id}
											className='border-t border-slate-800 hover:bg-slate-800/40'
										>
											<td className='px-4 py-3 font-bold text-white'>
												{ticket.number.toString().padStart(2, '0')}
											</td>
											<td className='px-4 py-3'>
												<span
													className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${STATUS_COLORS[ticket.status]}`}
												>
													{STATUS_LABELS[ticket.status]}
												</span>
											</td>
											<td className='px-4 py-3 text-slate-300'>
												{ticket.userName ?? '—'}
											</td>
											<td className='px-4 py-3 text-slate-300'>
												{ticket.userNationalId ?? '—'}
											</td>
											<td className='px-4 py-3 text-slate-300'>
												{ticket.userPhone ?? '—'}
											</td>
											<td className='px-4 py-3 text-slate-300'>
												{ticket.paymentRef ?? '—'}
											</td>
											<td className='px-4 py-3 text-slate-400 text-xs'>
												{ticket.purchasedAt
													? new Date(ticket.purchasedAt).toLocaleDateString()
													: '—'}
											</td>
											<td className='px-4 py-3'>
												<select
													value={ticket.status}
													disabled={
														updatingId === ticket.id ||
														raffle?.isArchived === true ||
														raffle?.drawStatus === 'drawing' ||
														raffle?.drawStatus === 'completed'
													}
													onChange={(e) =>
														updateTicketStatus(
															ticket.id,
															e.target.value as TicketStatus,
														)
													}
													className='bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-2 py-1 text-xs disabled:opacity-70'
												>
													<option value='available'>Disponible</option>
													<option value='reserved'>Reservado</option>
													<option value='sold'>Vendido</option>
													<option value='notAvailable'>No disponible</option>
												</select>
											</td>
										</tr>
									))}
									{filtered.length === 0 && (
										<tr>
											<td
												colSpan={8}
												className='px-4 py-8 text-center text-slate-500'
											>
												No hay tickets con ese estado.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default AdminRafflePage;
