"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyReservationCreated = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const firestore_2 = require("firebase-functions/v2/firestore");
const telegramBotToken = (0, params_1.defineSecret)('TELEGRAM_BOT_TOKEN');
const telegramAdminChatId = (0, params_1.defineSecret)('TELEGRAM_ADMIN_CHAT_ID');
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const formatCurrency = (value) => {
    if (typeof value !== 'number')
        return 'No definido';
    return `$${value.toFixed(2)}`;
};
const formatTicketNumbers = (numbers) => numbers
    .slice()
    .sort((left, right) => left - right)
    .map((number) => `#${String(number).padStart(2, '0')}`)
    .join(', ');
const buildTelegramMessage = (order) => {
    const lines = [
        '🔔 <b>Nueva reserva recibida</b>',
        '',
        `<b>Orden:</b> ${escapeHtml(order.orderId)}`,
        `<b>Rifa:</b> ${escapeHtml(order.raffleTitle)}`,
        `<b>Cliente:</b> ${escapeHtml(order.customerName)}`,
        `<b>Cédula:</b> ${escapeHtml(order.customerNationalId)}`,
        `<b>Teléfono:</b> ${escapeHtml(order.customerPhone)}`,
        `<b>Números:</b> ${escapeHtml(formatTicketNumbers(order.numbers))}`,
        `<b>Cantidad:</b> ${order.quantity}`,
        `<b>Precio por número:</b> ${escapeHtml(formatCurrency(order.ticketPrice))}`,
        `<b>Monto total:</b> ${escapeHtml(formatCurrency(order.totalAmount))}`,
        `<b>Referencia:</b> ${escapeHtml(order.paymentRef)}`,
        `<b>Fecha:</b> ${escapeHtml(new Date(order.createdAt).toLocaleString('es-VE'))}`,
        '',
        'Acción recomendada: revisar y validar el pago en el panel admin lo antes posible.',
    ];
    return lines.join('\n');
};
exports.notifyReservationCreated = (0, firestore_2.onDocumentCreated)({
    document: 'orders/{orderId}',
    region: 'us-central1',
    secrets: [telegramBotToken, telegramAdminChatId],
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const order = snapshot.data();
    const db = (0, firestore_1.getFirestore)();
    const orderRef = db.collection('orders').doc(snapshot.id);
    try {
        const response = await fetch(`https://api.telegram.org/bot${telegramBotToken.value()}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: telegramAdminChatId.value(),
                text: buildTelegramMessage(order),
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Telegram API request failed');
        }
        await orderRef.set({
            telegramNotificationStatus: 'sent',
            telegramNotifiedAt: new Date().toISOString(),
            telegramNotificationError: null,
        }, { merge: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Telegram error';
        await orderRef.set({
            telegramNotificationStatus: 'error',
            telegramNotificationError: message.slice(0, 1000),
        }, { merge: true });
        throw error;
    }
});
