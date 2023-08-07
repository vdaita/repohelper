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

    const [messages, setMessages] = useState([]);

    const messageInput = useRef();
    const [isLoading, setIsLoading] = useState(false);

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
            setIsLoading(true);
            let localMessages = [...messages, {role: 'user', message: messageInput.current.value}];
            messageInput.current.value = "";

            let reqBody = JSON.stringify({
                messages: localMessages.at(-1)['message'],
                repo: router.query.repo
            })

            console.log("Sending body: ", reqBody, "current repo: ", router.query.repo);
            let res = await fetch("/api/chat/", {
                body: reqBody,
                method: 'POST'
            });
            res = await res.json();

            console.log("Response: ", res);
    
            // when the information is received, add the sources information to the regular information
    
            let sourcesString = "";
            if(res['sources']){
                for(var i = 0; i < res['sources'].length; i++){
                    let metadata = res['sources']['metadata']['title'];
                    
                    sourcesString += `[${metadata['title'] ? metadata['title'] : metadata['url']}](${metadata['url']}) \n`;
                }
        
                res['message'] += "\n ### Sources" + sourcesString;
            }
    
            setMessages([...messages, {role: 'assistant', 'message': res['message']}]);
            setIsLoading(false);
        } catch (err) {
            console.error(err);
            setIsLoading(false);
            setError(true);
        }
    }


    return (
        <>
            
            <Container py='lg' px='md' styles={{ borderColor: 'black', borderWidth: 2 }}>
                <Box h={400} style={{ overflowY: 'scroll', alignContent: 'flex-end', alignItems: 'end' }} >
                    {messages.length == 0 ? 'Your messages will show here' : ''}
                    {messages.map((item, index) => (
                        <Card shadow="sm" padding="lg" radius="md" withBorder>
                            <Text weight={500}>{item.role}</Text>
                            <CodeRenderedMarkdown markdown={item.content}></CodeRenderedMarkdown>
                        </Card>
                    ))}
                    {isLoading && <Loader/>}
                    <div ref={messagesFooter}/>
                </Box>


                <Box gap="md" justify="flex-start" align="flex-start" direction="row" style={{marginBottom: 'auto'}}>
                    <Textarea size="lg" w='flex' style={{alignSelf: 'flex-end'}} ref={messageInput} radius='md' placeholder="Your message" label="Message"/>
                    <Button onClick={() => sendMessage()} size="lg" style={{alignSelf: 'flex-end'}} radius='md' disabled={isLoading}>Send</Button>
                </Box>

                {error && <Alert withCloseButton closeButtonLabel="Close alert" onClose={() => setError(false)} icon={<IconAlertCircle size="1rem"/>} title="Error" color="red">
                        There was an error loading your response.
                    </Alert>}
            </Container>  
        </>
    );
}