'use client';

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
import { notifications } from "@mantine/notifications";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from 'langchain/document';
import BackendEmbeddings from './../utils/BackendEmbeddings';
import rehypeRaw from 'rehype-raw'; // TODO: Find a way to sanitize the responses from the request or write custom to deal with details-summary
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';


export default function RepoChat(){
    const router = useRouter();
    const theme = useMantineTheme();

    const messagesFooter = useRef();

    const [error, setError] = useState(false);

    const messageInput = useRef();
    const [isLoadingSources, setIsLoadingSources] = useState(false);

    const [docsLoadingState, setDocsLoadingState] = useState("unloaded"); // unloaded, loading, loaded

    const [sources, setSources] = useState([]);
    const [sourceUrl, setSourceUrl] = useState("");
    
    const [shouldJump, setShouldJump] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [vectorStore, setVectorStore] = useState();

    useEffect(() => {
    }, []);

    const {messages, setMessages, append, isLoading: chatLoading} = useChat({
        api: "/api/chat_llm",
        onError: (err) => {
            console.error(err);
            setError(err);
        },
        onFinish: (message) => {
            console.log("Received message: ", message);
            if(message.content.length === 0){
                setMessages([...messages, {role: 'assistant', content: "There was an error on the backend."}]);
            }
        }
    });

    let handleKeyPress = (event) => {
        // console.log(event);
        if(event.key === 'Enter') {
            console.log("Sending message on enter");
            sendMessage();
        }
    }

    function isUrlValid(str) {
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

    let addSourceList = async(sourceUrls=sourceUrl) => {
        let splitUrls = sourceUrls.split(",");
        for(var i = 0; i < splitUrls.length; i++){
            let strippedUrl = splitUrls[i].trim();
            await addSource(strippedUrl);
        }
    }

    let addSourceUser = async() => {
        if(!isUrlValid(sourceUrl)){
            setDocsLoadingState("Please use a valid URL");
            return;
        }
        addSource(sourceUrl);
    }

    let addSource = async(sourceUrl=sourceUrl) => {



        setDocsLoadingState("loading");
        setIsLoadingSources(true);

        let res = await fetch("/api/stream_source", {
            method: "POST",
            body: JSON.stringify({
                url: sourceUrl
            })
        });

        if(!res.ok) {
            setDocsLoadingState("error");
        }

        const data = res.body;
        console.log(data);
        if(!data){
            return;
        }

        let embeddingsVectors = [];
        let documents = [];

        const reader = data.getReader();
        const decoder = new TextDecoder();

        let done = false;
        while(!done) {
            const { value, done: doneReading } = await reader.read();
            console.log(value, doneReading);
            done = doneReading;
            if(doneReading){
                console.log("Done reading: ", value, doneReading);
                break;
            }
            const chunkValue = decoder.decode(value);
            console.log("Received value: ", chunkValue, done);

            try {
                let newSource = JSON.parse(chunkValue);
                setDocsLoadingState("Loaded " + newSource["title"] + " - " + newSource["link"]);
    
                let content = newSource["content"];
                // console.log("Content: ", content);

                let embeddingsVector = newSource["embeddings"];
                if(!embeddingsVector){
                    continue;
                }

                newSource["content"] = undefined;
                newSource["embeddings"] = undefined;
    
                let document = new Document({
                    pageContent: content,
                    metadata: newSource
                })
    
                embeddingsVectors.push(embeddingsVector);
                documents.push(document);
            } catch (e) {
                console.log("Unparseable stream: ", e);
            }

        }

        console.log("Documents: ", documents);

        setSources(documents);

        let tempVectorStore = vectorStore;
        if(!vectorStore){
            tempVectorStore = await MemoryVectorStore.fromDocuments([], new BackendEmbeddings());
        }
        await tempVectorStore.addVectors(embeddingsVectors, documents);

        setVectorStore(tempVectorStore);

        setDocsLoadingState("loaded");
        setIsLoadingSources(false);
    }


    let sendMessage = async () => {

        if(messageInput.current.value == 0){
            return;
        }

        try {

            setIsLoading(true);

            let localMessages = [...messages, {role: 'user', content: messageInput.current.value}];
            setMessages(localMessages);

            messageInput.current.value = "";
            
            const documents = await vectorStore.similaritySearch(localMessages.at(-1).content, 2); // get the top 4 articles
        
            console.log("Retrieved documents: ", documents);

            let sourcesString;
            if(documents.length > 0){
                sourcesString = "### Provided documentation \n";
                for(var i = 0; i < documents.length; i++){
                    let metadata = documents[i].metadata;
                    sourcesString += `\n <details> 
                        <summary>
                            <a href="${metadata['link']}">${metadata['title'] ? metadata['title'] : metadata['link']}</a>
                        </summary>
                        ${documents[i].pageContent}
                    </details>\n`
                }
            } else {
                sourcesString = "No available sources.";
            }

            // localMessages.push({role: 'system', content: sourcesString});
            append({role: 'system', content: sourcesString});
            setIsLoading(false);
        } catch (err) {
            console.error(err);

            setIsLoading(false);
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

                <Card shadow="sm" m="lg" >
                    <Text size="md">Add the URLs of the library you want to chat with.</Text>
                    <Text size="xs">Up to 100 pages will be loaded.</Text>
                    <TextInput value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}></TextInput>

                    <Flex direction='row' mt="sm">
                        <Button variant="light" mr="xs" onClick={(e) => addSource("https://mantine.dev -site:https://v5.mantine.dev -site:https://v4.mantine.dev -site:https://v3.mantine.dev -site:https://v2.mantine.dev -site:https://v1.mantine.dev")}>Mantine Docs</Button>
                        <Button variant="light" onClick={(e) => addSource("https://sdk.vercel.ai/docs")}>Vercel AI Docs</Button>
                    </Flex>

                    <Button mt="sm" onClick={() => addSourceUser()}>Add</Button>
                    {sources.map((item, index) => (
                        <Text>Document <i>{item.metadata["title"]}</i> added</Text>
                    ))}
                    <div>
                        <Text>{docsLoadingState === "unloaded" || sources.length === 0 ? "No documents have been loaded." : ""}</Text>
                        <Text>{docsLoadingState === "loaded" ? "Your documents have been loaded." : ""}</Text>
                        <Text>{docsLoadingState === "loading" ? "Your documents are loading." : ""}</Text>
                        <Text>{docsLoadingState === "error" ? "There was an error loading your documents. " : ""}</Text>
                        <Text>{docsLoadingState[0] === docsLoadingState[0].toUpperCase() ? docsLoadingState : ""}</Text>
                        {/* {docsLoadingState} */}
                    </div>

                </Card>

                <Box mt="md">
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
                                rehypePlugins={[rehypeRaw]}
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
                    <Textarea disabled={isLoading || isLoadingSources} m="sm" size="lg" w='flex' onKeyPress={handleKeyPress} styles={{alignSelf: 'flex-end'}} className={styles.container} ref={messageInput} radius='md' placeholder="Your question"/>
                    <Text m="sm" size="xs">Press Enter to submit and Shift-Enter for newline.</Text>
                    <Button mx="sm" onClick={() => sendMessage()} size="lg" style={{alignSelf: 'flex-end'}} radius='md' disabled={isLoading || isLoadingSources}>Send</Button>
                </Box>
                

            </Container>  
        </>
    );
}