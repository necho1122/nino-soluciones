# Nino Soluciones - Rifa Pro 100

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Rifa Pro 100

Sistema de rifas con Firebase para gestión de boletos y pagos.

## Características

- **Interfaz de Usuario**: Selección de números de rifa con referencia de pago
- **Panel administrativo**: Gestión de estados de boletos (disponible, reservado, vendido, no disponible)
- **Firebase Integration**: Base de datos en tiempo real y autenticación
- **Responsive Design**: Funciona en móvil y desktop
- **Estados Visuales**: Indicadores visuales para diferentes estados de boletos

## Estructura del Proyecto

```text
app/
├── page.tsx          # Interfaz principal de usuario
├── [ruta-admin-oculta]/
│   └── ...           # Acceso administrativo (protegido por configuración)
├── globals.css       # Estilos globales
└── layout.tsx        # Layout principal

lib/
└── firebase.ts       # Configuración de Firebase

types/
└── raffle.ts         # Tipos TypeScript
```

## Configuración de Firebase

### 1. Configurar Autenticación

En Firebase Console:

1. Ve a **Authentication** > **Sign-in method**
2. Habilita **Email/Password**
3. Crea un usuario administrador

### 2. Configurar Firestore

1. Ve a **Firestore Database**
2. Crea una colección llamada `tickets`
3. El sistema creará automáticamente los documentos de boletos

### 3. Configurar Dominios Autorizados

Para desarrollo local, agrega estos dominios en Firebase Console:

- **Authentication** > **Settings** > **Authorized domains**:
  - `localhost`
  - `localhost:3000`
  - `localhost:3001`

## Uso

### Interfaz de Usuario (`/`)

- Selecciona números disponibles
- Completa el formulario con:
  - Nombre completo
  - Número de teléfono
  - Referencia de pago
- Confirma la compra

### Panel administrativo (ruta oculta)

- Inicia sesión con credenciales de Firebase Auth
- Selecciona números para cambiar estado
- Elige el nuevo estado (disponible, reservado, vendido, no disponible)
- Aplica cambios masivamente
- Revisa la tabla de tickets vendidos con datos de compradores

## Estados de Boletos

- **Disponible**: Verde, seleccionable por usuarios
- **Reservado**: Azul, no seleccionable
- **Vendido**: Rojo con línea diagonal, no seleccionable
- **No disponible**: Azul con indicador, no seleccionable

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Tecnologías

- **Next.js 16** - Framework React
- **Firebase** - Base de datos y autenticación
- **Tailwind CSS** - Estilos
- **TypeScript** - Tipado estático
- **ESLint** - Linting de código

## Seguridad

- Panel administrativo separado de la interfaz pública
- Autenticación requerida para acceso administrativo
- Ruta administrativa configurable y no documentada públicamente
- Reglas Firestore con autorización por custom claim (`admin=true`)

## Variables de entorno requeridas

Configura estas variables en tu entorno local y producción:

```bash
# Ruta administrativa oculta
ADMIN_HIDDEN_PATH=amin

# Firebase (cliente)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Contacto público
NEXT_PUBLIC_CONTACT_WHATSAPP_URL=
NEXT_PUBLIC_CONTACT_WHATSAPP_LABEL=

# Datos de pago público
NEXT_PUBLIC_PAYMENT_BANK_NAME=
NEXT_PUBLIC_PAYMENT_BANK_CODE=
NEXT_PUBLIC_PAYMENT_NATIONAL_ID=
NEXT_PUBLIC_PAYMENT_PHONE=

# Notificaciones de backend (Cloud Functions)
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
