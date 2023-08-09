import { useRouter } from 'next/router';
import React, { useState, useEffect, useRef } from 'react';
import { AppBar, Container, TextInput, Badge, Button, Loader, Card, Alert, Flex, Textarea, Box, Text, useMantineTheme, Navbar, AppShell } from '@mantine/core';
import Head from 'next/head';
import { IconAlertCircle } from '@tabler/icons-react';
import { useChat } from "ai/react";
import ReactMarkdown from 'react-markdown'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {atomDark} from 'react-syntax-highlighter/dist/cjs/styles/prism'
import styles from '@/styles/Chat.module.css';
import { Mixpanel } from '@/utils/Mixpanel';
import { notifications } from "@mantine/notifications";

export default function RepoChat(){
    const router = useRouter();
    const theme = useMantineTheme();

    const messagesFooter = useRef();

    const [error, setError] = useState(false);

    const messageInput = useRef();
    const [isLoadingSources, setIsLoadingSources] = useState(false);
    
    const [feedbackProvided, setFeedbackProvided] = useState(false);
    const [canMixpanelAnswered, setCanMixpanelAnswered] = useState(false);

    const [sources, setSources] = useState([]);
    
    const [shouldJump, setShouldJump] = useState(true);


    const {messages, setMessages, append, isLoading} = useChat({
        api: "/api/chat_openai",
        onError: (err) => {
            console.error(err);
            setError(err);
        },
        body: {
            repo: router.query.repo,
            documents: sources
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
    }, [messages]);

    useEffect(() => {

        // by default: should it be on true or false?

        setFeedbackProvided(localStorage.getItem("feedbackProvided") ? true : false); // want to be more explicit about null = false, idk why I did that
        setCanMixpanelAnswered(localStorage.getItem("canMixpanelAnswered") ? true : false);
    }, []);

    let handleKeyPress = (event) => {
        console.log(event);
        if(event.key === 'Enter') {
            console.log("Sending message on enter");
            sendMessage();
        }
    }

    let sendMessage = async () => {

        if(messageInput.current.value == 0){
            return;
        }

        try {
            Mixpanel.track('Question asked');

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
                Mixpanel.track("Error retrieving documents", {"error": documentsRes["error"]});
                setIsLoadingSources(false);
                setError(true);
                return;
            }
            
            setSources(documentsRes["documents"]);
            console.log("Documents retrieval result: ", documentsRes["documents"]);
            
            let sourcesString = "";
            let sourcesSet = new Set();

            if(documentsRes["documents"].length > 0){
                sourcesString = "### Sources \n";
                for(var i = 0; i < documentsRes["documents"].length; i++){
                    let metadata = documentsRes["documents"][i]["metadata"];
                    if(!sourcesSet.has(metadata["source"])){
                        sourcesSet.add(metadata["source"]);
                        sourcesString += `[${metadata['title'] ? metadata['title'] : metadata['source']}](${metadata['source']})\n`
                    }
                }
            } else {
                sourcesString = "No available sources.";
            }


            setIsLoadingSources(false);

            // localMessages.push({role: 'system', content: sourcesString});
            append({role: 'system', content: sourcesString});
        } catch (err) {
            console.error(err);
            Mixpanel.track("Error with requests: ", {error: err});
            setIsLoadingSources(false);
            setError(true);
        }
    }

    let deleteMessage = (index) => {
        let localMessages = [...messages];
        localMessages.splice(index, 1);
        setMessages(localMessages);
        setShouldJump(false);
    }

    let genGradient = (role) => {
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

    let feedback = (type) => {
        Mixpanel.track("Feedback Provided", {"type": type});
        localStorage.setItem("feedbackProvided", true);
        notifications.show({
            title: 'Thank you!',
            message: "Thank you for submitting your feedback!"
        });
        setFeedbackProvided(true);
    }

    let mixpanelResponse = (ans) => {
        if(!ans){
            mixpanel.opt_out_tracking();
        }
        setCanMixpanelAnswered(true);
        localStorage.setItem("canMixpanelAnswered", true);
    }

    return (
        <AppShell>  
            <Container py='lg' px='md' styles={{ borderColor: 'black', borderWidth: 2 }}>
                <Card shadow="sm" style={{position: 'sticky', top: 0, background: 'white', zIndex: 100}}>
                    <Text size="lg">chat with {router.query.repo} docs</Text>
                    <Text size="xs">alpha</Text>
                </Card>


                <Card shadow="sm" m="md" padding="lg" radius="md" withBorder>
                    We use Mixpanel to understand how people use this website and to track errors.
                    <Button size="xs" m="xs" mcolor="green" onClick={() => mixpanelResponse(true)}>Sounds good!</Button>
                    <Button size="xs" m="xs" color="red" onClick={() => mixpanelResponse(true)}>Opt out.</Button>
                </Card>

                <Box  >
                    {messages.length == 0 ? 'Your messages will show here' : ''}
                    {messages.map((item, index) => (
                        <Card key={index} shadow="sm" m="md" padding="lg" radius="md" withBorder>
                            <Badge variant="gradient" gradient={genGradient(item.role)}> 
                                <Text weight={500}>
                                    {item.role}
                                </Text>
                            </Badge>
                            <ReactMarkdown
                                m="sm"
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


                <Box p="sm" gap="md" justify="flex-start" align="flex-start" direction="row" style={{marginBottom: 'auto'}}>
                    <Textarea disabled={isLoading || isLoadingSources} m="sm" size="lg" w='flex' onKeyPress={handleKeyPress} style={{alignSelf: 'flex-end'}} ref={messageInput} radius='md' placeholder="Your question"/>
                    <Text m="sm" size="xs">Press Enter to submit and Shift-Enter for newline.</Text>
                    <Button mx="sm" onClick={() => sendMessage()} size="lg" style={{alignSelf: 'flex-end'}} radius='md' disabled={isLoading || isLoadingSources}>Send</Button>
                </Box>
                
                { /* do you like the service? */ }
                {(!feedbackProvided && messages.length > 3) && 
                    <Card p="sm" m="sm" style={{flex: 'flex-shrink', flexWrap: 'wrap', alignSelf: 'baseline'}} direction="row" withBorder shadow="sm" radius="md">
                        <Box style={{flexDirection: 'row', flex: 'flex-shrink', flexWrap: 'wrap', alignSelf:'baseline'}}>
                            <>
                                Like this service?
                                <Button style={{ backgroundColor: 'transparent', border: '1px solid lightGray'}} m='xs'  size="sm" color onClick={() => feedback("positive")}>
                                👍
                                </Button>
                                <Button style={{ backgroundColor: 'transparent', border: '1px solid lightGray'}}  size="sm" onClick={() => feedback("negative")}>
                                👎
                                </Button>
                            </>
                        </Box>
                    </Card>
                }
            </Container>  
        </AppShell>
    );
}