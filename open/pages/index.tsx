import Head from 'next/head'
import Image from 'next/image'
import styles from '@/styles/Home.module.css'
import Link from 'next/link'
import { Button, Card, Flex, TextInput } from "@mantine/core";


export default function Home() {
  return (
    <>
      <Head>
        <title>Repohelper</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${styles.main}`}>
        <div className={styles.description}>
          <p style={{font: 'inter', alignContent: 'flex-start'}}>
            Chat with our existing repositories <br/>
            <Link href="/chat/mantine" style={{textDecorationLine: 'underline'}}>
              Mantine
            </Link>
          </p>

        </div>

        <div className={styles.center}>
          <h1 style={{fontSize: 100}} className={styles.gradient}>Repohelper</h1>
          <ul>
            <li>Documentation takes a long time to sift through.</li>
            <li>Web scrapers take a long time to create.</li>
            <li>Non-OpenAI LLMs are difficult to use day-to-day.</li>
          </ul>
          <p>Repohelper aims to create a powerful interface for developers to intelligently use documentation while programming.</p>
        </div>
      </main>
    </>
  )
}
