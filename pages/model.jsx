import { Container, Box, Input, Button, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, useToast } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import supabase from './../utils/supabase.js';


export default function Models() {

    const [newSources, setNewSource] = useState({});
    const [sources, setSources] = useState([]);

    const toast = useToast();

    useEffect(() => {
        getDataSources();
    }, []);

    let getDataSources = async () => {
        const {data, error} = await supabase
            .from('sources')
            .eq('user', supabase.auth.currentUser?.id)
            .select();
        setSources(data);
    }

    let addDataSource = async () => {
    
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
        <Container>
            {/* Allow users to create new model */}

            <Heading>
                Add data sources to your chatbot.
            </Heading>

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

            <Heading>
                Manage existing data sources.
            </Heading>

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