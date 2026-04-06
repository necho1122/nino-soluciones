import Link from 'next/link';

const WHATSAPP_URL = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_URL ?? '#';
const WHATSAPP_LABEL =
	process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_LABEL ?? 'No configurado';

const ContactPage = () => {
	return (
		<div className='min-h-screen bg-[#0f172a] px-4 py-6 text-slate-200 md:px-8'>
			<div className='mx-auto max-w-4xl'>
				<div className='mb-6'>
					<Link
						href='/'
						className='inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white'
					>
						← Volver al inicio
					</Link>
				</div>

				<div className='rounded-3xl border border-slate-700 bg-slate-900/70 p-5 sm:p-8'>
					<p className='text-sm font-semibold uppercase tracking-[0.3em] text-amber-300'>
						Contacto
					</p>
					<h1 className='mt-3 text-3xl font-black text-white sm:text-4xl'>
						Estamos para ayudarte
					</h1>
					<p className='mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base'>
						Si tienes dudas sobre una rifa, validación de pago, entrega del
						premio o cualquier detalle del proceso, puedes comunicarte con el
						equipo de NINO SOLUCIONES por nuestros canales habituales.
					</p>

					<div className='mt-8 grid gap-4 md:grid-cols-3'>
						<a
							href={WHATSAPP_URL}
							target='_blank'
							rel='noopener noreferrer'
							aria-disabled={WHATSAPP_URL === '#'}
							className='group rounded-2xl border border-emerald-500/20 bg-slate-950/70 p-4 transition hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-emerald-500/10'
						>
							<p className='text-xs uppercase tracking-[0.25em] text-slate-500'>
								WhatsApp
							</p>
							<p className='mt-3 text-lg font-bold text-white group-hover:text-emerald-300'>
								{WHATSAPP_LABEL}
							</p>
							<p className='mt-2 text-sm text-slate-400'>
								Toca aquí para abrir WhatsApp y escribirnos directamente.
							</p>
						</a>
						<div className='rounded-2xl border border-slate-800 bg-slate-950/70 p-4'>
							<p className='text-xs uppercase tracking-[0.25em] text-slate-500'>
								Horario
							</p>
							<p className='mt-3 text-lg font-bold text-white'>Lun a Sab</p>
							<p className='mt-2 text-sm text-slate-400'>9:00 AM a 6:00 PM</p>
						</div>
					</div>

					<div className='mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100'>
						Para validar una compra más rápido, ten a la mano tu nombre, cédula,
						número comprado y referencia de pago.
					</div>
				</div>
			</div>
		</div>
	);
};

export default ContactPage;
