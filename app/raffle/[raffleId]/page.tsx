import RaffleDetailClient from './raffle-detail-client';

const getPaymentConfig = () => ({
	bankName: process.env.PAYMENT_BANK_NAME ?? 'No configurado',
	bankCode: process.env.PAYMENT_BANK_CODE ?? 'No configurado',
	nationalId: process.env.PAYMENT_NATIONAL_ID ?? 'No configurado',
	phone: process.env.PAYMENT_PHONE ?? 'No configurado',
});

const RaffleDetailPage = () => {
	return <RaffleDetailClient paymentConfig={getPaymentConfig()} />;
};

export default RaffleDetailPage;
