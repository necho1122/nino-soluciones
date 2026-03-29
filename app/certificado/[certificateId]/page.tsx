'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import QRCode from 'qrcode';
import { db } from '@/lib/firebase';
import { RaffleCertificate } from '@/types/raffle';

const formatDate = (value?: string | null) => {
	if (!value) return 'No disponible';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'No disponible';
	return date.toLocaleString('es-VE', {
		dateStyle: 'full',
		timeStyle: 'short',
	});
};

const CertificatePage: React.FC = () => {
	const params = useParams();
	const certificateId = (params?.certificateId as string) ?? '';
	const hasCertificateId = certificateId.trim().length > 0;

	const [certificate, setCertificate] = useState<RaffleCertificate | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!hasCertificateId) {
			return;
		}

		const certRef = doc(db, 'raffleCertificates', certificateId);
		const unsub = onSnapshot(
			certRef,
			(snapshot) => {
				if (!snapshot.exists()) {
					setCertificate(null);
					setError('Este certificado no existe o fue revocado.');
					setLoading(false);
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
					status: data.status === 'valid' ? 'valid' : 'valid',
				});
				setError(null);
				setLoading(false);
			},
			(err) => {
				console.error('Error cargando certificado:', err);
				setError('No se pudo validar el certificado en este momento.');
				setLoading(false);
			},
		);

		return () => unsub();
	}, [certificateId, hasCertificateId]);

	useEffect(() => {
		if (!certificate?.verificationUrl) {
			return;
		}

		let isAlive = true;
		QRCode.toDataURL(certificate.verificationUrl, {
			width: 260,
			margin: 1,
			color: {
				dark: '#101A2F',
				light: '#FFFFFF',
			},
		})
			.then((dataUrl: string) => {
				if (isAlive) setQrDataUrl(dataUrl);
			})
			.catch((qrError: unknown) => {
				console.error('Error generando QR:', qrError);
			});

		return () => {
			isAlive = false;
		};
	}, [certificate?.verificationUrl]);

	const winnerNumber = useMemo(
		() => String(certificate?.drawWinnerNumber ?? 0).padStart(2, '0'),
		[certificate?.drawWinnerNumber],
	);

	const hasWinner = certificate?.drawOutcome === 'winner';

	const displayError = hasCertificateId
		? error
		: 'Identificador de certificado no valido.';
	const displayLoading = hasCertificateId ? loading : false;

	return (
		<div className='relative min-h-screen overflow-hidden bg-[#f4efe2] text-[#1f2937]'>
			<div className='pointer-events-none absolute inset-0'>
				<div className='absolute -left-28 -top-30 h-96 w-96 rounded-full bg-[#d97706]/20 blur-3xl' />
				<div className='absolute -right-30 top-45 h-80 w-80 rounded-full bg-[#0f172a]/20 blur-3xl' />
				<div className='absolute -bottom-30 left-1/3 h-96 w-96 rounded-full bg-[#14532d]/10 blur-3xl' />
			</div>

			<div className='relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8'>
				<div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
					<Link
						href='/'
						className='inline-flex items-center rounded-full border border-[#1e293b]/20 bg-white/70 px-4 py-2 text-sm font-semibold text-[#0f172a] backdrop-blur hover:bg-white'
					>
						Volver al inicio
					</Link>
					<button
						type='button'
						onClick={() => window.print()}
						className='rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#020617]'
					>
						Imprimir certificado
					</button>
				</div>

				<div className='rounded-3xl border border-[#0f172a]/15 bg-white/85 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.16)] backdrop-blur md:p-8'>
					{displayLoading ? (
						<div className='rounded-2xl border border-[#1e293b]/10 bg-[#f8fafc] p-6 text-center text-sm text-[#475569]'>
							Validando certificado...
						</div>
					) : displayError ? (
						<div className='rounded-2xl border border-red-400/40 bg-red-50 p-6 text-center text-sm text-red-700'>
							{displayError}
						</div>
					) : certificate ? (
						<div className='grid gap-6 lg:grid-cols-[1.25fr_0.75fr]'>
							<div>
								<p className='text-xs uppercase tracking-[0.34em] text-[#b45309]'>
									Certificado oficial
								</p>
								<h1 className='mt-3 text-3xl font-black leading-tight text-[#0f172a] sm:text-4xl'>
									Validez oficial del sorteo
								</h1>
								<p className='mt-4 text-sm leading-7 text-[#334155] sm:text-base'>
									Se certifica que el sorteo de la rifa{' '}
									<strong>{certificate.raffleTitle}</strong> fue ejecutado en la
									fecha indicada y el resultado registrado en la base de datos
									oficial de Nino Soluciones.
								</p>

								<div className='mt-6 grid gap-3 sm:grid-cols-2'>
									<div className='rounded-2xl border border-[#0f172a]/10 bg-[#f8fafc] p-4'>
										<p className='text-xs uppercase tracking-[0.2em] text-[#64748b]'>
											Resultado
										</p>
										<p className='mt-1 text-xl font-black text-[#0f172a]'>
											{hasWinner ? 'Con ganador' : 'Sin ganador'}
										</p>
										<p className='mt-1 text-sm text-[#475569]'>
											{hasWinner
												? `Ganador: ${certificate.winnerName ?? 'Participante'}`
												: 'El número sorteado no estaba vendido al momento del sorteo.'}
										</p>
										{hasWinner && (
											<p className='mt-1 text-sm text-[#475569]'>
												Telefono: {certificate.winnerPhone ?? 'No registrado'}
											</p>
										)}
									</div>
									<div className='rounded-2xl border border-[#0f172a]/10 bg-[#f8fafc] p-4'>
										<p className='text-xs uppercase tracking-[0.2em] text-[#64748b]'>
											Numero sorteado
										</p>
										<p className='mt-1 text-xl font-black text-[#0f172a]'>
											#{winnerNumber}
										</p>
										<p className='mt-1 text-sm text-[#475569]'>
											Sorteado: {formatDate(certificate.drawExecutedAt)}
										</p>
									</div>
									<div className='rounded-2xl border border-[#14532d]/20 bg-[#ecfdf5] p-4 sm:col-span-2'>
										<p className='text-xs uppercase tracking-[0.2em] text-[#166534]'>
											Estado de validez
										</p>
										<p className='mt-1 text-lg font-black text-[#166534]'>
											CERTIFICADO VALIDO
										</p>
										<p className='mt-1 text-sm text-[#14532d]'>
											Codigo de verificacion: {certificate.verificationCode}
										</p>
									</div>
								</div>

								<div className='mt-6 rounded-2xl border border-[#0f172a]/10 bg-[#f8fafc] p-4'>
									<p className='text-xs uppercase tracking-[0.2em] text-[#64748b]'>
										Registro y emision
									</p>
									<p className='mt-2 text-sm text-[#334155]'>
										Emitido: {formatDate(certificate.issuedAt)}
									</p>
									<p className='mt-1 break-all text-sm text-[#334155]'>
										URL de verificacion: {certificate.verificationUrl}
									</p>
								</div>
							</div>

							<div className='space-y-4'>
								<div className='rounded-2xl border border-[#0f172a]/10 bg-[#f8fafc] p-4 text-center'>
									<p className='text-xs uppercase tracking-[0.2em] text-[#64748b]'>
										QR de verificacion
									</p>
									<div className='mt-3 flex justify-center'>
										{qrDataUrl ? (
											<Image
												src={qrDataUrl}
												alt='QR de verificacion del certificado'
												width={208}
												height={208}
												unoptimized
												className='h-52 w-52 rounded-xl border border-[#0f172a]/10 bg-white p-2'
											/>
										) : (
											<div className='flex h-52 w-52 items-center justify-center rounded-xl border border-[#0f172a]/10 bg-white text-xs text-[#64748b]'>
												Generando QR...
											</div>
										)}
									</div>
									<p className='mt-3 text-xs text-[#475569]'>
										Escanea para abrir esta validacion publica en cualquier
										momento.
									</p>
								</div>

								<div className='rounded-2xl border border-[#b45309]/20 bg-[#fffbeb] p-4 text-sm leading-6 text-[#78350f]'>
									Este documento tiene validez digital mientras su codigo y URL
									de verificacion esten activos en nuestro sistema.
								</div>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
};

export default CertificatePage;
