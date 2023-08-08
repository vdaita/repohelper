import { useRouter } from 'next/router';
import React, { useState, useEffect, useRef } from 'react';
import { Container, TextInput, Button, Loader, Card, Alert, Flex, Textarea, Box, Text } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import Head from 'next/head';
import { IconAlertCircle } from '@tabler/icons-react';
import { useChat } from "ai/react";
import CodeRenderedMarkdown from './../../utils/CodeRenderedMarkdown';

export default function RepoChat(){
    const router = useRouter();

    const messagesFooter = useRef();

    const [error, setError] = useState(false);

    const messageInput = useRef();
    const [isLoadingSources, setIsLoadingSources] = useState(false);

    const {messages, setMessages, append, isLoading} = useChat({
        onError: (err) => {
            console.error(err);
            setError(err);
        },
        body: {
            repo: router.query.repo
        }
    });

    // const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    //     onError: (err) => {
    //         setError(err);
    //     },
    //     body: {
    //         repo: router.query.slug
    //     }
    // });

    useEffect(() => {
        messagesFooter.current.scrollIntoView();
    }, [messages])

    let sendMessage = async () => {
        try {
            setIsLoadingSources(true);
            let localMessages = [...messages, {role: 'user', content: messageInput.current.value}];
            setMessages(localMessages);            
            messageInput.current.value = "";

            let reqBody = JSON.stringify({
                messages: localMessages,
                repo: router.query.repo
            })


            console.log("Sending body: ", reqBody, "current repo: ", router.query.repo);

            let documentsRes = await fetch("/api/relevant_documents", {
                body: JSON.stringify(reqBody),
                method: 'POST'
            });
            documentsRes = await documentsRes.json();

            if(documentsRes["error"]){
                setIsLoadingSources(false);
                setError(true);
                return;
            }
            
            console.log("Documents retrieval result: ", documentsRes);
            let sourcesString = "### Sources \n";
            for(var i = 0; i < documentsRes.length; i++){
                sourcesString += `[${metadata['title'] ? metadata['title'] : metadata['source']}](${metadata['source']})\n`
            }

            setIsLoadingSources(false);

            localMessages.push({role: 'system', content: sourcesString});

            append(localMessages);
        } catch (err) {
            console.error(err);
            setIsLoadingSources(false);
            setError(true);
        }
    }


    return (
        <>
            
            <Container py='lg' px='md' styles={{ borderColor: 'black', borderWidth: 2 }}>
                <h2>{router.query.repo}</h2>
                <Box h={400} style={{ overflowY: 'scroll', alignContent: 'flex-end', alignItems: 'end' }} >
                    {messages.length == 0 ? 'Your messages will show here' : ''}
                    {messages.map((item, index) => (
                        <Card key={index} shadow="sm" m="md" padding="lg" radius="md" withBorder>
                            <Text weight={500}>{item.role}</Text>
                            <Text>{item.content}</Text>
                            {/* <CodeRenderedMarkdown markdown={item.content}></CodeRenderedMarkdown> */}
                        </Card>
                    ))}
                    {(isLoadingSources || isLoading) && <Loader m="sm"/>}
                    <div ref={messagesFooter}/>
                </Box>


                <Box p="sm" gap="md" justify="flex-start" align="flex-start" direction="row" style={{marginBottom: 'auto'}}>
                    <Textarea m="sm" size="lg" w='flex' style={{alignSelf: 'flex-end'}} ref={messageInput} radius='md' placeholder="Your message" label="Message"/>
                    <Button m="sm" onClick={() => sendMessage()} size="lg" style={{alignSelf: 'flex-end'}} radius='md' disabled={isLoading || isLoadingSources}>Send</Button>
                </Box>

                {error && <Alert withCloseButton closeButtonLabel="Close alert" onClose={() => setError(false)} icon={<IconAlertCircle size="1rem"/>} title="Error" color="red">
                        There was an error loading your response.
                    </Alert>}
            </Container>  
        </>
    );
}