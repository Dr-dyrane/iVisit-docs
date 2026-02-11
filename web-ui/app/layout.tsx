import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { VaultShell } from '@/components/VaultShell';
import { ThemeProvider } from '@/components/ThemeProvider';

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
  metadataBase: new URL('https://docs.ivisit.ng'),
  title: 'iVisit Data Room | Secure Intelligence Portal',
  description: 'Access confidential business proposals, technical blueprints, and strategic documents from the iVisit Intelligence Collective.',
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
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased font-sans transition-colors duration-base">
        <ThemeProvider>
          <AuthProvider>
            <Toaster
              position="top-right"
              expand={true}
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: 'var(--toast-bg)',
                  backdropFilter: 'blur(12px)',
                  border: 'none',
                  color: 'var(--toast-fg)',
                },
              }}
            />
            <VaultShell>
              {children}
            </VaultShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
