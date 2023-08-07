import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { MantineProvider } from '@mantine/core';
import { Inter } from 'next/font/google';

const inter = Inter({subsets: ['latin']})

export default function App({ Component, pageProps }: AppProps) {
  return <MantineProvider theme={{ fontFamily: inter.style.fontFamily }} withGlobalStyles withNormalizeCSS>
    <Component {...pageProps} />
  </MantineProvider>
}
