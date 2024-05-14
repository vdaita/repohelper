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
import { FakeEmbeddings } from "langchain/embeddings/fake";
import rehypeRaw from 'rehype-raw'; // TODO: Find a way to sanitize the responses from the request or write custom to deal with details-summary
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';
import { Analytics } from '@vercel/analytics/react';
import rnvcembeddings from "./../utils/react-native-vector-camera-embeddings.json";

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
    const [filterUrls, setFilterURLs] = useState("");
    
    const [shouldJump, setShouldJump] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [vectorStore, setVectorStore] = useState();
    const [showSystemMessages, setShouldShowSystemMessage] = useState(false);

    useEffect(() => {
    }, []);

    const {messages, setMessages, append, reload, isLoading: chatLoading} = useChat({
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
        if(sourceUrl.endsWith(".json")){
            addSourceJson(sourceUrl);
        }

        if(!isUrlValid(sourceUrl)){
            setDocsLoadingState("Please use a valid URL");
            return;
        }
        addSourceSitemap(sourceUrl);
    }

    let addSourceRNVC = async () => {
        await addSourceJsonContent(rnvcembeddings);
    }

    let addSourceJsonContent = async (data) => {
        setDocsLoadingState("loading");
        setIsLoadingSources(true);

        console.log("Received data: ", data);

        let embeddingVectors = [];

        for(var i = 0; i < data.length; i++){
            embeddingVectors.push(data[i].embeddings)
        }

        setSources([...sources, ...data]);

        let tempVectorStore = vectorStore;
        if(!vectorStore){
            tempVectorStore = await MemoryVectorStore.fromDocuments([], new FakeEmbeddings());
        }

        console.log("Adding documents to the MemoryVectorStore:")
        tempVectorStore.addVectors(embeddingVectors, data);

        console.log("Set vectorstore from JSON object: ", tempVectorStore);
        setVectorStore(tempVectorStore);
        setDocsLoadingState("loaded");
        setIsLoadingSources(false);
    }

    let addSourceJson = async (jsonUrl) => {
        setDocsLoadingState("loading");
        setIsLoadingSources(true);

        let res = await fetch(jsonUrl, {
            method: "POST",
            body: JSON.stringify({

            })
        });

        if(!res.ok) {
            console.log("There was an error loading the document");
            notifications.show({
                title: "There was an error loading from the JSON file."
            })
        }
        
        const data = await res.json();
        await addSourceJsonContent(data);
    }

    let addSourceSitemap = async(sourceUrl=sourceUrl) => {

        setDocsLoadingState("loading");
        setIsLoadingSources(true);

        let res = await fetch("/api/stream_source", {
            method: "POST",
            body: JSON.stringify({
                site_url: sourceUrl
                // sitemap_url: sourceUrl,
                // filter_urls: filterUrls
            })
        });

        if(!res.ok) {
            console.log("There was an error loading the document")
            notifications.show({
                title: "There was an error loading all of your documents.",
                message: "Please try again",
                color: 'red'
            });
        }

        const data = res.body;
        console.log(data);
        if(!data){
            notifications.show({
                title: "There was an error loading all of your documents.",
                message: "Please try again",
                color: 'red'
            });
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
            // console.log("Received value: ", chunkValue, done);

            try {
                let newSource = JSON.parse(chunkValue);
                setDocsLoadingState("Loaded " + newSource["link"]);
    
                let content = newSource["content"];
                // console.log("Content: ", content);

                let embeddingsVector = newSource["embeddings"];
                if(!embeddingsVector){
                    continue;
                }

                newSource["content"] = undefined;
                newSource["embeddings"] = undefined;
    
                let document = {
                    pageContent: content,
                    metadata: newSource,
                    embeddings: embeddingsVector
                };
    
                embeddingsVectors.push(embeddingsVector);
                documents.push(document);
            } catch (e) {
                console.log("Unparseable stream: ", e);
            }

        }

        console.log("Documents: ", documents);

        setSources([...sources, ...documents]);

        let tempVectorStore = vectorStore;
        if(!vectorStore){
            tempVectorStore = await MemoryVectorStore.fromDocuments([], new BackendEmbeddings());
        }
        await tempVectorStore.addVectors(embeddingsVectors, documents);

        setVectorStore(tempVectorStore);

        setDocsLoadingState("loaded");
        setIsLoadingSources(false);
    }

    const downloadFile = ({ data, fileName, fileType }) => {
        const blob = new Blob([data], { type: fileType });
        const a = document.createElement('a');
        a.download = fileName;
        a.href = window.URL.createObjectURL(blob);
        const clickEvt = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
        a.dispatchEvent(clickEvt);
        a.remove();
    };  


    let sendMessage = async () => {

        if(messageInput.current.value == 0){
            return;
        }

        try {

            setIsLoading(true);

            let localMessages = [...messages];

            const question = messageInput.current.value;
            const documents = await vectorStore.similaritySearch(question, 7); 
            messageInput.current.value = "";

            console.log("Retrieved documents: ", documents);

            let sourcesString;
            if(documents.length > 0){
                sourcesString = "### Provided documentation \n";
                for(var i = 0; i < documents.length; i++){
                    let metadata = documents[i].metadata;


                    const detailsSummary = `\n <details> 
                        <summary>
                            <a href="${metadata['link']}">${metadata['title'] ? metadata['title'] : metadata['link']}</a>
                        </summary>
                        ${documents[i].pageContent}
                    </details>\n`;
                    localMessages.push({
                        role: "system",
                        content: detailsSummary
                    });

                    console.log("Added a document ", i);
                }
            } else {
                sourcesString = "No available sources.";
            }

            localMessages.push({role: 'user', content: question});

            // localMessages.push({role: 'system', content: sourcesString});
            setMessages(localMessages);
            reload();    
        
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
                <Analytics mode={'production'} />
                <Card shadow="sm" style={{position: 'sticky', top: 0, background: 'white', zIndex: 100}}>
                    <Text size="lg" className={styles.container}>Chat with documentation</Text>
                    <Text size="xs">alpha</Text>
                </Card>

                <Card shadow="sm" m="lg" >
                    Dynamic website loading will be back soon! <br/>
                    {/* <Text size="md">Add the url (we load up to 20 of the top pages under that URL) or the embedded JSON file for the website you want to load. </Text>
                    <TextInput value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Example: https://nextjs.org/docs"></TextInput> */}
                    {/* <Textarea value={filterUrls} onChange={(e) => setFilterURLs(e.target.value)} placeholder="Filter for specific subdirectories, separated by commas: https://nextjs.org/docs/"></Textarea> */}
                    {/* <Button mt="sm" mr="sm" onClick={() => addSourceUser()}>Add</Button> */}
                    <Button mt="sm" onClick={() => addSourceRNVC()}>Add react-native-vision-camera docs</Button>
                    {/* {sources.length > 0 && <Button mt="sm" ml="sm" onClick={() => downloadFile({
                        data: JSON.stringify(sources),
                        fileName: "embedded_website.json",
                        fileType: "application/json"
                    })}>
                        Download File
                    </Button>} */}
                    {sources.map((item, index) => (
                        <Text>Document <i>{item.metadata["link"]}</i> added</Text>
                    ))}
                    <div>
                        <Text>{docsLoadingState === "unloaded" || sources.length === 0 ? "No documents have been loaded." : ""}</Text>
                        <Text>{docsLoadingState === "loaded" && sources.length > 0 ? "Finished loading." : ""}</Text>
                        <Text>{docsLoadingState === "loading" ? "Your documents are loading." : ""}</Text>
                        <Text>{docsLoadingState === "error" ? "There was an error loading your documents. " : ""}</Text>
                        <Text>{docsLoadingState[0] === docsLoadingState[0].toUpperCase() ? docsLoadingState : ""}</Text>
                        {/* {docsLoadingState} */}
                    </div>

                </Card>


                <Box mt="md">
                    <Button onClick={() => setShouldShowSystemMessage(!showSystemMessages)}>{showSystemMessages ? "Hide" : "Show"} sources messages.</Button> <br/>
                    {sources.length == 0 ? "Please load your sources.\n" : ""} <br/>
                    {messages.length == 0 ? 'Your messages will show here.' : ''}
                    {messages.map((item, index) => (
                        <>
                            {(showSystemMessages || item.role != "system") && <Card key={index} shadow="sm" m="md" padding="lg" radius="md" withBorder>
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
                            </Card>}
                        </>
                    ))}
                    {error && <Alert withCloseButton closeButtonLabel="Close alert" onClose={() => setError(false)} icon={<IconAlertCircle size="1rem"/>} title="Error" color="red">
                        There was an error loading your response. {sources.length == 0 ? "It is probably because your sources are unloaded." : ""}
                    </Alert>}
                    {(isLoadingSources || isLoading) && <Loader m="sm"/>}

                    <div ref={messagesFooter}/>
                </Box>


                <Box p="sm" gap="md" justify="flex-start" align="flex-start" direction="row" style={{marginBottom: 'auto'}}>
                    <Textarea disabled={isLoading || isLoadingSources} m="sm" size="lg" w='flex' onKeyPress={handleKeyPress} styles={{alignSelf: 'flex-end'}} className={styles.container} ref={messageInput} radius='md' placeholder="Your question"/>
                    <Text m="sm" size="xs">Press Enter to submit and Shift-Enter for newline.</Text>
                    <Button mx="sm" onClick={() => sendMessage()} size="lg" style={{alignSelf: 'flex-end'}} radius='md' disabled={isLoading || isLoadingSources}>Send</Button>
                </Box>
                
                <Box p="sm" gap="md" justify="flex-start" align="flex-start">
                    <Text m="sm" size="xs">
                        See more work at <a href="https://longlaketech.com">LongLake</a>
                    </Text>
                </Box>
            </Container>  
        </>
    );
}