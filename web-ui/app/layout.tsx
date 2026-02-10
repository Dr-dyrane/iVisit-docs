import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { VaultShell } from '@/components/VaultShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'iVisit Data Room — Secure Intelligence Portal',
  description: 'Access confidential business proposals, technical blueprints, and strategic documents from the iVisit Intelligence Collective.',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'iVisit Data Room',
    description: 'Secure document portal for investors, partners, and developers.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-black text-foreground antialiased font-sans">
        <AuthProvider>
          <Toaster
            position="top-right"
            expand={true}
            richColors
            closeButton
            toastOptions={{
              style: {
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px)',
                border: 'none',
                color: '#f5f5f5',
              },
            }}
          />
          <VaultShell>
            {children}
          </VaultShell>
        </AuthProvider>
      </body>
    </html>
  );
}
