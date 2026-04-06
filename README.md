# Nino Soluciones - Rifa Pro 100

**Rifa Pro 100** es una plataforma de gestión de sorteos digitales de alto rendimiento, construida sobre el ecosistema de **Next.js 15** y **Firebase**. El sistema ofrece una experiencia de usuario fluida para la adquisición de boletos y una infraestructura robusta para el control administrativo de las operaciones.

---

## 🚀 Características Principales

* **Interfaz de Selección Dinámica**: Sistema visual interactivo para la selección de números con actualización de estados en tiempo real.
* **Gestión Integral de Boletos**: Control total sobre el inventario, permitiendo transiciones entre estados (*Disponible, Reservado, Vendido y No Disponible*).
* **Sincronización en Tiempo Real**: Integración nativa con Firebase para garantizar que la disponibilidad de los números sea exacta en todo momento.
* **Diseño Adaptive**: Interfaz optimizada mediante Tailwind CSS para una navegación intuitiva en smartphones, tablets y ordenadores.
* **Arquitectura de Tipado Estricto**: Desarrollo basado en TypeScript para minimizar errores en tiempo de ejecución y facilitar el mantenimiento.

---

## 🛠️ Stack Tecnológico

* **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
* **Base de Datos & Auth**: [Firebase](https://firebase.google.com/) (Firestore & Authentication)
* **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
* **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)

---

## 🔐 Seguridad y Privacidad

La seguridad es el pilar central de este proyecto. Se han implementado las siguientes medidas:

1.  **Protección de Rutas Privilegiadas**: Las áreas de gestión están protegidas mediante Middleware de Next.js y validación de sesiones activas.
2.  **Control de Acceso (RBAC)**: Implementación de reglas de seguridad en Firestore que restringen la escritura y lectura de datos sensibles basándose en la identidad del usuario.
3.  **Ofuscación de Módulos**: El acceso administrativo está desacoplado de la interfaz pública para prevenir accesos no autorizados.
4.  **Validación de Transacciones**: Cada cambio de estado de boleto requiere una validación de autorización previa a nivel de servidor/nube.

---

## ⚙️ Configuración del Entorno

Para ejecutar este proyecto localmente, asegúrate de configurar las variables de entorno necesarias en un archivo `.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
