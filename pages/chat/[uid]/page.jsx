import { Container, FormControl, FormLabel, Switch, Box, Input, Button, 
    VStack, HStack,
    Heading, Tabs, TabList, TabPanels, Tab, 
    TabPanel, Textarea, Text, 
    useToast, useColorMode, Spinner } from '@chakra-ui/react';
import React, { useState, useEffect, useRef } from 'react';
import supabase from '../../../utils/supabase.js';
import { useParams } from 'next/navigation';
import { AiOutlineSend } from 'react-icons/ai';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import ReactMarkdown from 'react-markdown';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {dark, light} from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useChat } from 'ai/react';

export default function ChatPage(){

    const {colorMode, toggleColorMode} = useColorMode();

    const toast = useToast();
    const params = useParams();

    // const [message, setMessage] = useState("");
    // const [chatHistory, setChatHistory] = useState([]);

    const [chatBody, setUseChatBody] = useState({});

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    const [ownsModel, setOwnsModel] = useState(false);
    const [canAccessModel, setCanAccessModel] = useState(false);
    const [loading, setLoading] = useState(false);
 
    const [jwt, setJwt] = useState("");

    const lastMessageRef = useRef(null);

    const scrollToBottom = () => {
        lastMessageRef.current?.scrollIntoView();
    }

    useEffect(() => {
        console.log(messages);
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        checkUsability();
        checkSession();
    }, []);

    let checkUsability = async () => {    
        try {
            if(params && supabase.auth.currentUser?.id == params.uid){
                setOwnsModel(true);
            }

            let useId;

            if(!params){
                let user = await supabase.auth.getUser();
                useId = user["data"]["user"]["id"];
            } else {
                useId = params.uid;
            }

            const {data, error} = await supabase
                            .from('chatbots')
                            .select()
                            .eq('uid', useId)
                            .eq('public_access', true);
            if(data.length > 0 || !params || supabase.auth.currentUser?.id == params.uid){
                setCanAccessModel(true);
            }
        } catch (err) {
            console.error("In Chat: ", err);
        }
    }

    let checkSession = async () => {
        let session = await supabase.auth.getSession();
        console.log("Session: ", session);
        if(session.data.session){
            setJwt(session.data.session.access_token);
        }
    }


    let sendMessage = async () => {

        try {
            let localMessages = [...messages];
            let shortenedHistory = messages.splice(Math.max(messages.length - 2, 0), messages.length);
            let formattedMessage = {"sender": 'user', "message": newMessage};
    
            setNewMessage("");
            setLoading(true);

            let body = JSON.stringify({
                messages: [...shortenedHistory, formattedMessage],
                jwt: jwt
            });
            console.log("Body: ", body);

            setMessages([...localMessages, formattedMessage]);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort, 10000);
    
            let res = await fetch("/api/chat", {
                method: 'POST',
                signal: controller.signal,
                body: JSON.stringify({
                    "messages": [...shortenedHistory, formattedMessage],
                    "jwt": jwt
                }),
                headers: {"Content-Type": "application/json"}
            });
    
            console.log("Response: ", res);
    
            if(!res.ok){
                throw new Error(res.statusText) 
            }
    
            const data = res.body;
            console.log(data);
            if(!data){
              return;
            }
            const reader = data.getReader();
            const decoder = new TextDecoder();
            let done = false;
        
            while(!done){
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value);
                console.log("Adding chunk ", chunkValue);
                localMessages = [...messages];
                if(localMessages.at(-1).sender == 'user'){
                    localMessages.push({sender: 'ai', message: ''});
                }
                localMessages.at(-1).message = localMessages.at(-1).message + chunkValue;
                setMessages(localMessages);
                // setResult((result) => result + chunkValue);
            }
    
            setLoading(false);
        } catch (err){
            console.log(err);
            setLoading(false);
            toast({
                title: 'Error communicating with server',
                status: 'error'
            });
        }
    }

    let changeAccess = (isModelPublic) => {
        const {error} = supabase
            .from('chatbots')
            .update({public_access: false})
            .eq('uid', params.id);
        if(error){
            toast({
                title: 'Error changing access',
                isClosable: true,
                status: 'error'
            })
        }
    }

    const handleKeyDown = (event) => {
        // if(event.key === 'Enter'){
        //     sendMessage();
        // }
    }

    if(!canAccessModel){
        return (
            <Container>
                <Text>You cannot access this model.</Text>
            </Container>
        )
    }

    return (
        <Container>
            {/* <FormControl display='flex' alignItems='center'>
                <FormLabel htmlFor='model-public' mb='0'>
                    Enable external visibility
                </FormLabel>
                <Switch disabled={!ownsModel} id='model-public' onChange={(e) => changeAccess(e.target.value)}/>
            </FormControl> */}
            
            <Box height={400} overflowY="auto" scrollBehavior=''>
                {messages.map((item, index) => (
                    <Box style={{borderWidth: 2, borderRadius: 8, margin: 4}} key={index}>
                        <Text> <b>{item["sender"]}</b></Text>
                        <ReactMarkdown
                            children={item["message"]}
                            components={{
                                code({node, inline, className, children, ...props}) {
                                  const match = /language-(\w+)/.exec(className || '')
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      {...props}
                                      children={String(children).replace(/\n$/, '')}
                                      style={colorMode == 'light' ? light : dark}
                                      language={match[1]}
                                      PreTag="div"
                                    />
                                  ) : (
                                    <CopyToClipboard text={children}>
                                        <Text fontSize={'sm'}>Click to copy</Text>
                                        <code {...props} className={className}>
                                            {children}
                                        </code>
                                    </CopyToClipboard>
                                  )
                                }
                              }}
                            />
                    </Box>
                ))}
                {loading ? <Spinner margin={2}/> : <></>}
                <div ref={lastMessageRef}/>
            </Box>
            <HStack margin={2}>
                <Textarea value={newMessage} disabled={loading} onChange={(e) => setNewMessage(e.target.value)}/>
                <Button onClick={() => sendMessage()}>
                    {loading ? "Loading..." : <AiOutlineSend/>}
                </Button>
            </HStack>
        </Container>

    )
}