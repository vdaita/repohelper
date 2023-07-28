import { Container, FormControl, Switch, Box, Input, Button, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import supabase from '../../../utils/supabase.js';

export default function Chat(){

    const [message, setMessage] = useState("");
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


    let sendMessage = () => {

    }

    let changeAccess = (isModelPublic) => {
        const {error} = supabase
            .from('chatbots')
            .eq('uid', params.id)
            .eq();
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
            </FormControl>
        </Container>
    )
}