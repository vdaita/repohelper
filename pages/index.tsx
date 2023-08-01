import Head from 'next/head'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import { Box, Container, Input, Button, Text, VStack, useColorMode } from '@chakra-ui/react';
import supabase from '../utils/supabase';
import { useRouter } from 'next/navigation';
import React, {useEffect, useState} from 'react';
import PersonalChatPage from './personal_chat';
import AuthPage from './auth';

const inter = Inter({ subsets: ['latin'] })

export default function Home() {

  const {colorMode, toggleColorMode} = useColorMode();
  const { push } = useRouter();
  const [user, setUser] = useState<any>(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // console.log(supabase.auth.getUser());
    supabase.auth.onAuthStateChange((event, session) => {
      if(session?.user){
        // push("/auth")
        setUser(session?.user);
      } else {
        setUser(false);
      }
    });
  }, []);

  if(!user){
    return <AuthPage/>
  }
  
  return (
    <>
      <Head>
        <title>repohelper</title>
        <meta name="description" content="repohelper" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${styles.main} ${inter.className}`}>
        <div className={styles.description}>

          <VStack>
            <Text>{user.data ? user["data"]["user"]["email"] : ""}</Text>
            <Button onClick={() => push("/model")}>Manage your model</Button>
            <Button onClick={toggleColorMode}>Toggle {colorMode == 'light' ? 'Dark' : 'Light'} </Button>
            <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>
          </VStack>

          <PersonalChatPage/>
        </div>
      </main>
    </>
  )
}
