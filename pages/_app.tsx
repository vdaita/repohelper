import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { MantineProvider } from '@mantine/core';
import { Inter } from 'next/font/google';
import { Notifications } from '@mantine/notifications';
// import { CustomFonts } from "../utils/CustomFonts";

const inter = Inter({subsets: ['latin']})
export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={{ fontFamily: "Inter, sans-serif" }} withGlobalStyles withNormalizeCSS>
      {/* <CustomFonts/> */}
      <Notifications/>
      <Component {...pageProps}/>
    </MantineProvider>
  )
}
