import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { MantineProvider } from '@mantine/core';
import { Inter } from 'next/font/google';
import mixpanel from 'mixpanel-browser';
import { Notifications } from '@mantine/notifications';

const inter = Inter({subsets: ['latin']})
mixpanel.init('MIXPANEL_TOKEN', {
  debug: true,
  track_pageview: true,
  persistence: 'localStorage'
});
export default function App({ Component, pageProps }: AppProps) {
  return <MantineProvider theme={{ fontFamily: inter.style.fontFamily }} withGlobalStyles withNormalizeCSS>
    <Notifications/>
    <Component {...pageProps} />
  </MantineProvider>
}
