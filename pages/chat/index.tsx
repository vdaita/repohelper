'use client';

import { useRouter } from 'next/router';
import React, { useState, useEffect, useRef } from 'react';
import { Container, TextInput, Badge, Button, Loader, Card, Alert, Group, Grid, Flex, Textarea, Box, Text, useMantineTheme, Navbar, AppShell } from '@mantine/core';
import Head from 'next/head';
import { IconAlertCircle } from '@tabler/icons-react';
import { useChat } from "ai/react";
import ReactMarkdown from 'react-markdown'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {atomDark} from 'react-syntax-highlighter/dist/cjs/styles/prism'
import styles from '@/styles/Chat.module.css';
import { notifications } from "@mantine/notifications";
import axios from 'axios';

export default function RepoChat(){
    const router = useRouter();
    const theme = useMantineTheme();

    const messagesFooter = useRef<HTMLDivElement>(null);

    const [error, setError] = useState(false);

    const [message, setMessage] = useState("");
    const [sources, setSources] = useState([]);
    const [isLoadingSources, setIsLoadingSources] = useState(false);
    
    const [shouldJump, setShouldJump] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
    }, []);

    const [messages, setMessages] = useState<any[]>([]);

    function generateRandomString(length: number) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
      
        for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
      
        return result;
      }

    let handleKeyPress = (event: any) => { // figure out the type for this
        // console.log(event);
        if(event.key === 'Enter') {
            console.log("Sending message on enter");
            sendMessage();
        }
    }

    function isUrlValid(str: string) {
        const pattern = new RegExp(
          '^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR IP (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$', // fragment locator
          'i'
        );
        return pattern.test(str);
    }

    let sendMessage = async () => {
        // get relevant sources
        let sourcesData = await fetch("/api/relevant_sources", {
            body: JSON.stringify({
                messages: messages
            }),
            method: 'POST'
        });

        if(!sourcesData.ok){
            console.error("Error receiving messages from sourcesData");

            setError(true);
            return;
        }

        let sourcesDataJson = await sourcesData.json();

        // Add the sources to the list
        setMessages([...messages, {role: 'system', content: "```json \n " + JSON.stringify(sourcesDataJson) + "\n ```", id: generateRandomString(10)}]);


        let messageRes = await fetch("/api/chat_openai", {
            method: "POST",
            body: JSON.stringify({

            })
        });

        const messageData = messageRes.body;

        if(!messageData || !messageRes.ok) {
            console.error("Error receiving messages from messageData");

            setError(true);
            return;
        }

        const reader = messageData.getReader();
        const decoder = new TextDecoder();

        let done = false;
        
        let currentMessages = [...messages, {
            role: "assistant",
            content: "",
            id: generateRandomString(10)
        }];
        while(!done) {
            const { value, done: doneReading } = await reader.read();
            currentMessages.at(-1)!.content += value;
            setMessages(currentMessages);
        }
    }

    let deleteMessage = (index: number) => {
        let localMessages = [...messages];
        localMessages.splice(index, 1);
        setMessages(localMessages);
        setShouldJump(false);
    }

    let genGradient = (role: string) => {
        if(role === "user"){
            return { from: 'indigo', to: 'cyan' };
        } else if (role === "system") {
            return {from: 'teal', to: 'lime', deg: 105};
        } else if (role === "assistant") {
            return {from: 'orange', to: 'red'}
        } else {
            return {from: '#ed6ea0', to: '#ec8c69', deg: 35}
        }
    }

    return (
        <>
            <Head>
                <title>Repohelper</title>
                <meta name="description" content="Generated by create next app" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Container py='lg' px='md' styles={{ borderColor: 'black', borderWidth: 2}} className={styles.container}>
                <Card shadow="sm" style={{position: 'sticky', top: 0, background: 'white', zIndex: 100}}>
                    <Text size="lg" className={styles.container}>Chat with documentation</Text>
                    <Text size="xs">alpha</Text>
                </Card>

                <Box m="md">

                </Box>

                <Box mt="md">
                    {messages.length == 0 ? 'Your messages will show here' : ''}
                    {messages.map((item, index) => (
                        <Card key={index} shadow="sm" m="md" padding="lg" radius="md" withBorder>
                            <Badge variant="gradient" gradient={genGradient(item.role)}> 
                                <Text weight={500}>
                                    {item.role}
                                </Text>
                            </Badge>
                            <Group m="sm">

                            </Group>
                            <ReactMarkdown
                                children={item.content}
                                components={{
                                code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                    <SyntaxHighlighter
                                        {...props}
                                        children={String(children).replace(/\n$/, '')}
                                        style={atomDark}
                                        language={match[1]}
                                        PreTag="div"
                                    />
                                    ) : (
                                    <code {...props} className={className}>
                                        {children}
                                    </code>
                                    )
                                }
                                }}
                            />
                            {(!isLoading && !isLoadingSources) && <Button color="red" size="xs" onClick={() => deleteMessage(index)}>Delete message</Button>}
                        </Card>
                    ))}
                    {error && <Alert withCloseButton closeButtonLabel="Close alert" onClose={() => setError(false)} icon={<IconAlertCircle size="1rem"/>} title="Error" color="red">
                        There was an error loading your response.
                    </Alert>}
                    {(isLoadingSources || isLoading) && <Loader m="sm"/>}
                    <div ref={messagesFooter}/>
                </Box>

                <Box p="sm" style={{marginBottom: 'auto'}}>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} disabled={isLoading || isLoadingSources} m="sm" size="lg" w='flex' onKeyPress={handleKeyPress} className={styles.container}  radius='md' placeholder="Your question"/>
                    <Text m="sm" size="xs">Press Enter to submit and Shift-Enter for newline.</Text>
                    <Button mx="sm" onClick={() => sendMessage()} size="lg" style={{alignSelf: 'flex-end'}} radius='md' disabled={isLoading || isLoadingSources}>Send</Button>
                </Box>
                

            </Container>  
        </>
    );
}