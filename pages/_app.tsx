import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react'
import { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { MantineProvider } from '@mantine/core';
import { Inter } from 'next/font/google';
import { Notifications } from '@mantine/notifications';
// import { CustomFonts } from "../utils/CustomFonts";

const inter = Inter({subsets: ['latin']})
export default function App({ Component, pageProps }: AppProps) {
  
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}>
      <MantineProvider theme={{ fontFamily: "Inter, sans-serif" }} withGlobalStyles withNormalizeCSS>
        {/* <CustomFonts/> */}
        <Notifications/>
        <Component {...pageProps}/>
        <Analytics/>
      </MantineProvider>
    </SessionContextProvider>
  )
}
