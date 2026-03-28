import Link from 'next/link';

const TermsPage = () => {
	return (
		<div className='min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8'>
			<div className='max-w-4xl mx-auto'>
				<div className='mb-6'>
					<Link
						href='/'
						className='inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition'
					>
						← Volver al inicio
					</Link>
				</div>

				<div className='rounded-3xl border border-slate-700 bg-slate-900/70 p-5 sm:p-8'>
					<h1 className='text-2xl sm:text-4xl font-black text-white mb-2'>
						Terminos y Condiciones
					</h1>
					<p className='text-slate-400 text-sm sm:text-base mb-8'>
						NINO&apos; SOLUCIONES - Bases y Condiciones del Sorteo
					</p>

					<div className='space-y-7 text-sm sm:text-base leading-relaxed'>
						<section>
							<h2 className='text-lg sm:text-xl font-bold text-amber-300 mb-2'>
								1. Transparencia y Metodo de Seleccion
							</h2>
							<p className='text-slate-300'>
								Para garantizar la total veracidad y seguridad de los
								participantes, el ganador sera elegido de la siguiente manera:
							</p>
							<ul className='mt-3 list-disc list-inside space-y-2 text-slate-300'>
								<li>
									Plataforma utilizada: se usara la plataforma NINO&apos;
									SOLUCIONES, la cual genera un Certificado de Validez publico e
									irreversible.
								</li>
								<li>
									Transmision en vivo: el sorteo se realizara en directo el dia
									siguiente a la venta del último número en tiempo real para
									evitar cualquier sospecha de edición.
								</li>
							</ul>
						</section>

						<section>
							<h2 className='text-lg sm:text-xl font-bold text-amber-300 mb-2'>
								2. Requisitos para Participar
							</h2>
							<ol className='list-decimal list-inside space-y-2 text-slate-300'>
								<li>Elegir la rifa en la que deseas participar.</li>
								<li>Seleccionar el numero o los numeros que desees.</li>
								<li>Proceder a la realizacion del pago.</li>
								<li>
									Luego de pagar, llena el formulario con tus datos y la
									referencia.
								</li>
								<li>
									Debes aceptar los terminos y condiciones para completar tu
									participacion.
								</li>
							</ol>
						</section>

						<section>
							<h2 className='text-lg sm:text-xl font-bold text-amber-300 mb-2'>
								3. El Premio:
							</h2>
							<p className='text-slate-300'>
								El ganador recibira el premio descrito en la pagina de la rifa.
								Este premio es elegido cuidadosamente por el equipo de
								NINO&apos; SOLUCIONES para asegurar que aporte una utilidad real
								y duradera en el dia a dia del ganador.
							</p>
							<p className='text-slate-300 mt-2'>
								Proposito: este bien ha sido seleccionado para aportar una
								utilidad real y duradera en el dia a dia del ganador.
							</p>
						</section>

						<section>
							<h2 className='text-lg sm:text-xl font-bold text-amber-300 mb-2'>
								4. Entrega y Verificacion de Ganadores
							</h2>
							<p className='text-slate-300'>
								Una vez anunciado el ganador por medio de la plataforma
								NINO&apos; SOLUCIONES, se procedera a contactarlo de forma
								privada para coordinar la entrega.
							</p>
							<p className='text-slate-300 mt-2'>
								Prueba de veracidad: el ganador se compromete a enviar una
								fotografia o video corto recibiendo el premio. Este material
								sera publicado en nuestra seccion de &quot;Ganadores
								Reales&quot;.
							</p>
						</section>

						<section>
							<h2 className='text-lg sm:text-xl font-bold text-amber-300 mb-2'>
								5. Restricciones
							</h2>
							<ul className='list-disc list-inside space-y-2 text-slate-300'>
								<li>No se permite el uso de cuentas falsas o bots.</li>
								<li>
									Usted declara y se compromete a no disponer de dinero que le
									sea esencial para participar en esta rifa.
								</li>
								<li>
									No habran devoluciones ni derecho a reclamo posterior a la
									realizacion del sorteo.
								</li>
								<li>El premio no es canjeable por dinero en efectivo.</li>
							</ul>
						</section>

						<section>
							<h2 className='text-lg sm:text-xl font-bold text-amber-300 mb-2'>
								6. Bonificacion por Testimonio
							</h2>
							<p className='text-slate-300'>
								Si el ganador publica un video resenando el producto y su
								utilidad, y remite a un participante que manifieste participar
								por su recomendacion, recibira un numero de participacion
								gratuita para el proximo sorteo.
							</p>
						</section>

						<section>
							<h2 className='text-lg sm:text-xl font-bold text-amber-300 mb-2'>
								7. Datos del Participante y Verificacion de Identidad
							</h2>
							<p className='text-slate-300'>
								Los datos suministrados por cada participante, incluyendo
								nombre, telefono, cedula de identidad y referencia de pago,
								seran resguardados por NINO&apos; SOLUCIONES con fines
								exclusivamente administrativos, de seguridad y control interno
								del sorteo.
							</p>
							<p className='text-slate-300 mt-2'>
								Estos datos podran ser utilizados posteriormente para verificar
								la identidad del ganador y confirmar que la persona que reclama
								el premio corresponde efectivamente al participante que realizo
								la compra del numero ganador.
							</p>
						</section>

						<div className='rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100'>
							Para proceder a la participacion en esta rifa, usted declara haber
							leido estos terminos y condiciones y se compromete a aceptarlos
							como validos para los fines pertinentes, por parte de NINO&apos;
							SOLUCIONES.
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TermsPage;
