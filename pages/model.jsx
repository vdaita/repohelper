import styles from '@/styles/Home.module.css'
import { Inter } from 'next/font/google'
import { Container, Box, Input, Button, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, useToast, Text } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import supabase from './../utils/supabase.js';

const inter = Inter({ subsets: ['latin'] })

export default function Models() {

    const [newSource, setNewSource] = useState({});
    const [sources, setSources] = useState([]);

    const toast = useToast();

    useEffect(() => {
        getDataSources();
    }, []);

    let getDataSources = async () => {
        let {data, error} = await supabase
            .from('sources')
            .select()
            .eq('user', supabase.auth.currentUser?.id);
        if(data == null){
            data = [];
        }
        setSources(data);
    }

    let addDataSource = async (type) => {

        let session = await supabase.auth.getSession();
        let user = await supabase.auth.getUser();

        const data = await fetch("http://localhost:8080/add_data", {
            method: 'POST',
            body: JSON.stringify({
                jwt: session.access_token,
                data: newSource,
                type: type,
                uid: user.data.user.id
            })
        });

        console.log(data);
    }

    let deleteDataSource = async (id) => {
        const {error} = await supabase
            .from('sources')
            .delete()
            .eq('user', supabase.auth.currentUser?.id)
            .eq('id', id);
        if(error){
            toast({
                title: `Error deleting source ${id}`,
                isClosable: true,
                status: 'error'
            });
        }
    }

    return (
        <Container className={`${styles.main} ${inter.className} ${styles.description}`}>
            {/* Allow users to create new model */}

            <Text fontSize={'lg'} padding={2}>
                Add data sources to your chatbot.
            </Text>

            <Tabs>
                <TabList>
                    <Tab>Github</Tab>
                    <Tab>Stack Overflow</Tab>
                    <Tab>Webpage</Tab>
                    <Tab>Text</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        {/*: React.ChangeEvent<HTMLInputElement>*/}
                        <Input onChangeText={(e) => {setNewSource({'url': e.target.value})}} source={newSources['url'] ? newSources['url'] : ""}/>
                    </TabPanel>
                    <TabPanel>
                        <Input onChangeText={(e) => {setNewSource({})}} />
                    </TabPanel>
                    <TabPanel>

                    </TabPanel>
                    <TabPanel>
                        <Textarea onChangeText={(e) => {setNewSource({'text': e.target.value})}} source={newSources['text'] ? newSources['text'] : ""}/>
                    </TabPanel>
                </TabPanels>
            </Tabs>
            <Button onClick={() => addDataSource()}>Add</Button>

            <Text fontSize={'lg'} padding={2}>
                Manage existing data sources.
            </Text>

            <Box>
                {sources.map((item, index) => <Box>
                    <Text>{item['summary']}</Text>
                    <Text>{item['created_at']}</Text>
                    <Button onClick={() => deleteDataSource(item['id'])}>Delete</Button>
                </Box>)}
            </Box>



        </Container>
    )
}