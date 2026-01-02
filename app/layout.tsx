import './globals.css'
import Script from 'next/script'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Veritas Q-AI - Supreme Legal Analytics',
  description: 'Advanced AI-powered legal document analysis platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body style={{ backgroundColor: '#182332', color: 'white', margin: 0, padding: 0 }}>
        {children}
        <Script 
          src="https://app.lemonsqueezy.com/storage/v1/reload.js" 
          strategy="afterInteractive" 
        />
      </body>
    </html>
  )
}