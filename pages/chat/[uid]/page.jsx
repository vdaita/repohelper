import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { Container, FormControl, Switch, Box, Input, Button, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, useToast } from '@chakra-ui/react';
import {
    MainContainer,
    ChatContainer,
    MessageList,
    Message,
    MessageInput
} from '@chatscope/chat-ui-kit-react';
import React, { useState, useEffect } from 'react';
import supabase from '../../../utils/supabase.js';

export default function Chat(){

    const toast = useToast();

    const [message, setMessage] = useState("");
    const [chatHistory, setChatHistory] = useState({});
    const [ownsModel, setOwnsModel] = useState(false);
    const [canAccessModel, setCanAccessModel] = useState(false);

    useEffect(async () => {
        const params = useParams();
    
        if(supabase.auth.currentUser?.id == params.uid){
            setOwnsModel(true);
        }

        const {data, error} = supabase
                        .from('chatbots')
                        .eq('uid', params.id)
                        .eq('public_access', true)
                        .select();
        if(data.length > 0 || supabase.auth.currentUser?.id == params.uid){
            setCanAccessModel(true);
        }

    }, []);


    let sendMessage = async () => {
        let token = await supabase.auth.getSession().access_token;
        
        let res = await fetch('/api/chat', {
            method: "POST",
            body: JSON.stringify({
                jwt: token,
                message: message,
                chatHistory: JSON.stringify(chatHistory)
            }),
            headers: new Headers({
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            })
        });

        const data = res.body;
        if(!data){
            return;
        }

        setChatHistory([...chatHistory, {sender: 'user', message: message},  {sender: 'system', message: ''}])

        const reader = data.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while(!done){
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value);
            console.log("Adding chunk ", chunkValue);
            var currChatHistory = chatHistory;
            currChatHistory[currChatHistory.length - 1].message = currChatHistory[currChatHistory.length - 1].message + chunkValue;
            setChatHistory(currChatHistory);
        }

        
        // let data = await fetch('/api/chat', {
        //     jwt: 
        // })
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

    if(!canAccessModel){
        return (
            <Container>
                <Text>You cannot access this model.</Text>
            </Container>
        )
    }

    return (
        <Container>
            <FormControl display='flex' alignItems='center'>
                <FormLabel htmlFor='model-public' mb='0'>
                    Enable external visibility
                </FormLabel>
                <Switch id='model-public' onChange={(e) => changeAccess(e.target.value)}/>

                <MainContainer>
                    <ChatContainer>
                        <MessageList>
                           {chatHistory.map((item, index) => (
                            <Message model={item}/>
                           ))}
                            <MessageInput placeholder="Type message here" 
                            value={message}
                            onChange={(innerHtml, textContent, innerText, nodes) => setMessage(textContent)}
                            onSend={(innerHtml, textContent, innerText, nodes) => {sendMessage()}}/>
                        </MessageList>
                    </ChatContainer>
                </MainContainer>
            </FormControl>
        </Container>
    )
}