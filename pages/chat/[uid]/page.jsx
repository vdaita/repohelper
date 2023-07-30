import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { Container, FormControl, FormLabel, Switch, Box, Input, Button, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, Text, useToast } from '@chakra-ui/react';
import {
    MainContainer,
    ChatContainer,
    MessageList,
    Message,
    MessageInput
} from '@chatscope/chat-ui-kit-react';
import React, { useState, useEffect } from 'react';
import supabase from '../../../utils/supabase.js';
import { useParams } from 'next/navigation';

export default function ChatPage({ uid }){

    const toast = useToast();
    const params = useParams();

    const [message, setMessage] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [ownsModel, setOwnsModel] = useState(false);
    const [canAccessModel, setCanAccessModel] = useState(false);

    useEffect(() => {
        checkUsability();
    }, []);

    let checkUsability = async () => {    
        
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
    }


    let sendMessage = async () => {
        let token = await supabase.auth.getSession().access_token;
        setMessage("");
        let res = await fetch('/api/chat', {
            method: "POST",
            body: JSON.stringify({
                jwt: token,
                chatHistory: JSON.stringify([...chatHistory, {sender: 'user', message: message}])
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
                <Switch disabled={!ownsModel} id='model-public' onChange={(e) => changeAccess(e.target.value)}/>
            </FormControl>

            
            <MainContainer>
                    <ChatContainer>
                        <MessageList>
                           {chatHistory.map((item, index) => (
                            <Message model={item}/>
                           ))}
                            <MessageInput placeholder="Type message here" 
                            value={message}
                            attachButton={false}
                            onChange={(innerHtml, textContent, innerText, nodes) => setMessage(textContent)}
                            onSend={(innerHtml, textContent, innerText, nodes) => {sendMessage()}}/>
                        </MessageList>
                    </ChatContainer>
                </MainContainer>
        </Container>

    )
}