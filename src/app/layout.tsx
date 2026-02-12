import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DTF Artwork Studio',
  description: 'Transform artwork into DTF-ready halftone and knockout assets'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
