import { Container, Box, Input, Button, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import supabase from './../utils/supabase.js';
import { useRouter } from 'next/navigation';
import { ThemeSupa, } from '@supabase/auth-ui-shared'
import { Auth } from '@supabase/auth-ui-react';
// on this project, I want to be able to customize the authentication ui

export default function AuthPage(){

    const { push } = useRouter();

    useEffect(() => {
        supabase.auth.onAuthStateChange((event, session) => {
            if(session?.user){
                push('/');
            }
        })
    });

    return (
        <Container>
            <Auth 
                supabaseClient={supabase}
                providers={[]}
                appearance={{theme: ThemeSupa}}/>
        </Container>
    )
}