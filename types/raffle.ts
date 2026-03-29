export type TicketStatus = 'available' | 'reserved' | 'sold' | 'notAvailable';

export interface Raffle {
	id: string;
	title: string;
	description: string;
	drawDate: string;
	ticketPrice?: number | null;
	imageUrl?: string | null;
	createdAt?: string | null;
	isArchived?: boolean;
	archivedAt?: string | null;
	drawScheduledAt?: string | null;
	drawExecutedAt?: string | null;
	drawStatus?: 'notScheduled' | 'scheduled' | 'drawing' | 'completed';
	drawOutcome?: 'winner' | 'no-winner' | null;
	drawWinnerNumber?: number | null;
	drawWinnerName?: string | null;
	drawWinnerPhone?: string | null;
}

export interface Ticket {
	id: string;
	raffleId: string;
	number: number;
	status: TicketStatus;
	userId?: string | null;
	userName?: string | null;
	userNationalId?: string | null;
	userPhone?: string | null;
	paymentRef?: string | null;
	purchasedAt?: string | null;
}

export interface RaffleCertificate {
	id: string;
	raffleId: string;
	raffleTitle: string;
	drawExecutedAt: string;
	drawWinnerNumber: number;
	winnerName: string;
	winnerPhone: string | null;
	verificationCode: string;
	verificationUrl: string;
	issuedAt: string;
	issuedByUid: string | null;
	status: 'valid';
}
