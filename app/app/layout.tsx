"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { PrivyProvider } from "@privy-io/react-auth";

const inter = Inter({ subsets: ["latin"] });

const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const particleProjectId = process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID;
const particleClientKey = process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY;
const particleAppId = process.env.NEXT_PUBLIC_PARTICLE_APP_ID;

function MissingKeysNotice() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a1f] p-8 text-center text-white">
      <div className="max-w-md space-y-3">
        <p className="text-lg font-semibold">Missing configuration</p>
        <p className="text-sm text-gray-400">
          Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code>,{" "}
          <code>NEXT_PUBLIC_PRIVY_CLIENT_ID</code>,{" "}
          <code>NEXT_PUBLIC_PARTICLE_PROJECT_ID</code>,{" "}
          <code>NEXT_PUBLIC_PARTICLE_CLIENT_KEY</code>, and{" "}
          <code>NEXT_PUBLIC_PARTICLE_APP_ID</code> in{" "}
          <code>app/.env.local</code> (values from dashboard.privy.io and
          dashboard.particle.network) and restart the dev server.
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
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
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
