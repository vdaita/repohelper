import { useRouter } from 'next/router';
import React, { useState, useEffect, useRef } from 'react';
import { Container, TextInput, Button, Card, Alert, Flex, Textarea, Box } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useChat } from "ai/react";

export default function RepoChat(){
    const router = useRouter();

    const messagesFooter = useRef();

    const [error, setError] = useState(false);

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        onError: (err) => {
            setError(err);
        },
        body: {
            repo: router.query.slug
        }
    });

    useEffect(() => {
        messagesFooter.current.scrollIntoView();
    }, [messages])


    return (
      <Container py='lg' px='md' styles={{ borderColor: 'black', borderWidth: 2 }}>
        <Box h={400} style={{ overflowY: 'scroll', alignContent: 'flex-end', alignItems: 'end' }} >
            {messages.length == 0 ? 'Your messages will show here' : ''}
            {messages.map((item, index) => (
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Text weight={500}>{item.role}</Text>
                    <CodeRenderedMarkdown markdown={item.content}></CodeRenderedMarkdown>
                </Card>
            ))}
            <div ref={messagesFooter}/>
        </Box>


        <form onSubmit={handleSubmit}>
            <Flex gap="md" justify="flex-start" align="flex-start" direction="row" style={{marginBottom: 'auto'}}>
                <Textarea size="lg" style={{alignSelf: 'flex-end'}} onChangeText={handleInputChange} radius='md' value={input} placeholder="Your message" label="Message"/>
                <Button size="lg" style={{alignSelf: 'flex-end'}} radius='md' disabled={isLoading}>{isLoading ? 'Loading...' : 'Send'}</Button>
            </Flex>
        </form>

        {error && <Alert withCloseButton closeButtonLabel="Close alert" icon={<IconAlertCircle size="1rem"/>} title="error :(" color="red">
                there was an error loading your response. if this issue persists please let us know. we will try to fix it asap.
            </Alert>}
      </Container>  
    );
}