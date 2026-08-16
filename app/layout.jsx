import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-display' });
const sans = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans' });

export const metadata = {
  title: 'Anita Mishel · Asesoría Académica',
  description:
    'Acompañamiento personalizado de tesis para profesionales que estudian mientras trabajan. Ecuador.',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.24.0/dist/tabler-icons.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Sacramento&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
