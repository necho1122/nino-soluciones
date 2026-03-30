import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

type OrderNotificationPayload = {
	orderId: string;
	raffleTitle: string;
	customerName: string;
	customerNationalId: string;
	customerPhone: string;
	numbers: number[];
	quantity: number;
	ticketPrice: number | null;
	totalAmount: number | null;
	paymentRef: string;
	createdAt: string;
};

const escapeHtml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatCurrency = (value: number | null) => {
	if (typeof value !== 'number') return 'No definido';
	return `$${value.toFixed(2)}`;
};

const formatNumbers = (numbers: number[]) =>
	numbers
		.slice()
		.sort((left, right) => left - right)
		.map((number) => `#${String(number).padStart(2, '0')}`)
		.join(', ');

const buildMessage = (order: OrderNotificationPayload): string =>
	[
		'🔔 <b>Nueva reserva recibida</b>',
		'',
		`<b>Orden:</b> <code>${escapeHtml(order.orderId)}</code>`,
		`<b>Rifa:</b> ${escapeHtml(order.raffleTitle)}`,
		'',
		`<b>Cliente:</b> ${escapeHtml(order.customerName)}`,
		`<b>Cédula:</b> ${escapeHtml(order.customerNationalId)}`,
		`<b>Teléfono:</b> ${escapeHtml(order.customerPhone)}`,
		'',
		`<b>Números:</b> ${escapeHtml(formatNumbers(order.numbers))}`,
		`<b>Cantidad:</b> ${order.quantity}`,
		`<b>Precio por número:</b> ${escapeHtml(formatCurrency(order.ticketPrice))}`,
		`<b>Monto total:</b> ${escapeHtml(formatCurrency(order.totalAmount))}`,
		`<b>Referencia de pago:</b> <code>${escapeHtml(order.paymentRef)}</code>`,
		`<b>Fecha:</b> ${escapeHtml(
			new Date(order.createdAt).toLocaleString('es-VE', {
				timeZone: 'America/Caracas',
			}),
		)}`,
		'',
		'⚡️ Verificar pago en el panel admin lo antes posible.',
	].join('\n');

export async function POST(request: NextRequest) {
	if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
		console.error('[notify-telegram] Missing env vars');
		return NextResponse.json(
			{ error: 'Telegram not configured' },
			{ status: 503 },
		);
	}

	let payload: OrderNotificationPayload;
	try {
		payload = (await request.json()) as OrderNotificationPayload;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (
		!payload.orderId ||
		!payload.customerPhone ||
		!Array.isArray(payload.numbers) ||
		payload.numbers.length === 0
	) {
		return NextResponse.json(
			{ error: 'Missing required fields' },
			{ status: 400 },
		);
	}

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: ADMIN_CHAT_ID,
					text: buildMessage(payload),
					parse_mode: 'HTML',
					disable_web_page_preview: true,
				}),
			},
		);

		if (!response.ok) {
			const errorBody = await response.text();
			console.error('[notify-telegram] Telegram API error:', errorBody);
			return NextResponse.json(
				{ error: 'Telegram API error' },
				{ status: 502 },
			);
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error('[notify-telegram] Fetch error:', error);
		return NextResponse.json({ error: 'Internal error' }, { status: 500 });
	}
}
