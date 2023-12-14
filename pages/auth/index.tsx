'use client'

import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useEffect, useState } from 'react'
import { Container, Button, TextInput } from '@mantine/core';
import { useRouter } from 'next/router';
import { notifications } from '@mantine/notifications';

const LoginPage = () => {
  const supabaseClient = useSupabaseClient()
  const user = useUser()
  const [data, setData] = useState()
  const [email, setEmail] = useState("");

  const router = useRouter();

  useEffect(() => {
    function redirect() {
        router.push("/chat")
    }
    // Only run query once user is logged in.
    if (user) redirect()
  }, [user])

  let sendEmail = async () => {
    let { data, error } = await supabaseClient.auth.signInWithOtp({
        email: email,
        options: {
            emailRedirectTo: "http://localhost:3000"
        }
    });
    // return some sort of feedback to the user

    if(error){
      notifications.show({
        title: "Error logging in", 
        message: error.message
      });
    }
  }

  if (!user) {
    return (
        <Container>
          <TextInput placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}></TextInput>
          <Button onClick={() => sendEmail()}>Send email</Button>
        </Container>
    )
  }
}

export default LoginPage
