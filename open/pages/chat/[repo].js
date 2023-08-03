import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import { Container, TextInput, Button, Card, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useChat } from "ai";

export default function RepoChat(){
    const router = useRouter();

    const [error, setError] = useState(false);

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat(
        {
            onError: (err) => {
                setError(err);
            },
            body: {
                repo: router.query.slug
            }
        }
    );

    return (
      <Container>
        {messages.map((item, index) => (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text weight={500}>{item.role}</Text>
                <CodeRenderedMarkdown markdown={item.content}></CodeRenderedMarkdown>
            </Card>
        ))}
        <form onSubmit={handleSubmit}>
            <Flex gap="md" justify="flex-start" align="flex-start" direction="row">
                <TextInput onChangeText={handleInputChange} value={input} placeholder="Your message" label="Message"/>
                <Button disabled={isLoading}>{isLoading ? 'Loading...' : 'Send'}</Button>
            </Flex>
        </form>

        {error && <Alert  withCloseButton closeButtonLabel="Close alert" icon={<IconAlertCircle size="1rem"/>} title="error :(" color="red">
                there was an error loading your response. if this issue persists please let us know. we will try to fix it asap.
            </Alert>}
      </Container>  
    );
}