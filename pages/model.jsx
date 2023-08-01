import styles from '@/styles/Home.module.css'
import { Inter } from 'next/font/google'
import { Container, Box, Input, Button, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, useToast, Text } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import supabase from './../utils/supabase.js';
import { useRouter } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] })

export default function Models() {
    
    const {push} = useRouter();

    const [newSource, setNewSource] = useState({});
    const [sources, setSources] = useState([]);
    const [requestType, setRequestType] = useState();

    const possibleTypes = ['github', 'stackoverflow', 'website', 'text'];

    const toast = useToast();

    useEffect(() => {
        getDataSources();
    }, []);

    let validateInput = () => {
        
    }

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

    let addDataSource = async () => {

        let session = await supabase.auth.getSession();
        let user = await supabase.auth.getUser();

        const data = await fetch("http://localhost:8080/add_data", {
            method: 'POST',
            body: JSON.stringify({
                jwt: session.access_token,
                data: newSource,
                type: requestType,
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

            <Button onClick={() => push('/')}>Back</Button>

            <Text fontSize={'lg'} padding={2}>
                Add data sources to your chatbot
            </Text>

            <Tabs variant='soft-rounded' colorScheme='red' onChange={(index) => setRequestType(possibleTypes[index])}>
                <TabList>
                    <Tab>Git</Tab>
                    <Tab>Stack Overflow</Tab>
                    <Tab>Webpage</Tab>
                    <Tab>Text</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        {/*: React.ChangeEvent<HTMLInputElement>*/}
                        <Input margin={1} placeholder={"Git url"} onChangeText={(e) => {setNewSource({...newSource, 'url': e.target.value})}} source={newSource['url'] ? newSource['url'] : ""}/>
                        <Input margin={1} placeholder={"Branch"} onChangeText={(e) => {setNewSource({...newSource, 'branch': e.target.value})}} source={newSource['branch'] ? newSource['branch'] : ""}/>    
                    </TabPanel>
                    <TabPanel>
                        <Input margin={1} placeholder={"StackOverflow tag"} onChangeText={(e) => {setNewSource({...newSource, 'tag': e.target.value})}} />
                    </TabPanel>
                    <TabPanel>
                        <Input margin={1} placeholder={"URL"} onChangeText={(e) => {setNewSource({'url': e.target.value})}}/>
                    </TabPanel>
                    <TabPanel>
                        <Textarea onChangeText={(e) => {setNewSource({'text': e.target.value})}} source={newSource['text'] ? newSource['text'] : ""}/>
                    </TabPanel>
                </TabPanels>
            </Tabs>
            <Button onClick={() => addDataSource()}>Add</Button>

            <Text fontSize={'lg'} padding={2}>
                Manage existing data sources
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