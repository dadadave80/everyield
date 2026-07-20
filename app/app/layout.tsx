"use client";

import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PrivyProvider } from "@privy-io/react-auth";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const fontVars = `${fraunces.variable} ${hanken.variable} ${jetbrains.variable}`;

// Runs before paint so a saved theme choice never flashes the wrong palette.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('ey-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const particleProjectId = process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID;
const particleClientKey = process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY;
const particleAppId = process.env.NEXT_PUBLIC_PARTICLE_APP_ID;

function MissingKeysNotice() {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-3">
        <p className="font-display text-2xl text-ink">Almost there</p>
        <p className="text-sm text-ink-soft">
          Set <code className="font-mono text-ink">NEXT_PUBLIC_PRIVY_APP_ID</code>,{" "}
          <code className="font-mono text-ink">NEXT_PUBLIC_PRIVY_CLIENT_ID</code>,{" "}
          <code className="font-mono text-ink">NEXT_PUBLIC_PARTICLE_PROJECT_ID</code>,{" "}
          <code className="font-mono text-ink">NEXT_PUBLIC_PARTICLE_CLIENT_KEY</code>, and{" "}
          <code className="font-mono text-ink">NEXT_PUBLIC_PARTICLE_APP_ID</code> in{" "}
          <code className="font-mono text-ink">app/.env.local</code>, then restart the dev
          server.
        </p>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Everyield — the savings account that doesn&apos;t know what a chain is</title>
        <meta
          name="description"
          content="Everyield is a savings account that earns yield everywhere at once. You see one balance, one number. It never asks you what a chain is."
        />
        <meta name="theme-color" content="#0d110f" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${fontVars} antialiased`} suppressHydrationWarning>
        {appId && clientId && particleProjectId && particleClientKey && particleAppId ? (
          <PrivyProvider
            appId={appId}
            clientId={clientId}
            config={{
              embeddedWallets: {
                ethereum: {
                  createOnLogin: "all-users",
                },
              },
            }}
          >
            {children}
          </PrivyProvider>
        ) : (
          <MissingKeysNotice />
        )}
      </body>
    </html>
  );
}
