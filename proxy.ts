import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const normalizePathToken = (value: string) => value.replace(/^\/+|\/+$/g, '');

export function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const hiddenAdminEntry = normalizePathToken(
		process.env.ADMIN_HIDDEN_PATH ?? 'amin',
	);

	if (!hiddenAdminEntry || hiddenAdminEntry === 'admin') {
		return NextResponse.next();
	}

	if (pathname === '/admin' || pathname.startsWith('/admin/')) {
		return new NextResponse('Not Found', {
			status: 404,
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'cache-control': 'no-store',
			},
		});
	}

	const hiddenPrefix = `/${hiddenAdminEntry}`;
	if (pathname === hiddenPrefix || pathname.startsWith(`${hiddenPrefix}/`)) {
		const url = request.nextUrl.clone();
		url.pathname = pathname.replace(hiddenPrefix, '/admin');

		const requestHeaders = new Headers(request.headers);
		requestHeaders.set('x-admin-route', '1');

		return NextResponse.rewrite(url, {
			request: {
				headers: requestHeaders,
			},
		});
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
