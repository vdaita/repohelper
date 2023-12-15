'use client';

import { Group, Container, TextInput, Button, Textarea, Card, Loader, Box, Text, Tabs } from '@mantine/core';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'; 
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FakeEmbeddings } from 'langchain/embeddings/fake';
import { notifications } from '@mantine/notifications';

export default function SourcesManager(){

    const user = useUser();
    const supabaseClient = useSupabaseClient();

    const [sitemapURL, setSitemapURL] = useState("");
    const [filterURLs, setFilterURLs] = useState("");
    const [githubURL, setGithubURL]  = useState("");

    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [statusUpdate, setStatusUpdate] = useState("");
    const [reader, setReader] = useState<ReadableStreamDefaultReader | false>(false);
    
    useEffect(() => {
        if(!user){
            console.log("Unable to get user for sources");
        } else {
            console.log("Able to get user for sources: ", user);
            getSources();
        }
    }, [user]);

    let deleteSource = async (item: any) => {
        setLoading(true);
        let { error } = await supabaseClient.from('sources').delete().eq('id', item.id);
        if(error){
            console.log("deleteSource Error: ", error);
            notifications.show({
                title: "Error deleting source",
                message: error.message
            });
        } else {
            await getSources();
        }
        setLoading(false);
    }

    let getSources = async () => {
        setLoading(true);
        let {data, error} = await supabaseClient.from('sources').select().eq('uid', user?.id);
        
        console.log("Sources: ", data, error);

        if(error){
            notifications.show({
                title: "Error retrieving data",
                message: error.message
            });
            console.log("Error while retrieving data: ", error);
            setLoading(false);
            return;
        }

        setSources(data!);
        setLoading(false)
    }

    let addSource = async () => {
        setLoading(true);

        let dbSource = await supabaseClient.from("sources").insert({
            name: sitemapURL,
            metadata: {
                type: "sitemap",
                sitemap_url: sitemapURL, 
                filter_urls: filterURLs
            }
        }).select().single();

        console.log("DB Source: ", dbSource);

        if(!dbSource.data || dbSource.error){
            console.log("Error in creating the source in the database. Returning");
            notifications.show({
                title: "Error creating new source in database",
                message: dbSource.error?.message
            });
            setLoading(false);
            return;
        }

        let res = await fetch("/api/stream_source/sitemap", {
            method: "POST",
            body: JSON.stringify({
                sitemap_url: sitemapURL,
                filter_urls: filterURLs,
            })
        });

        if(!res.ok){
            // toast an error
            notifications.show({
                title: "There was an error loading your source",
                message: res.statusText
            })
            setLoading(false);
            return;
        }

        const data = res.body;
        console.log("Data: ", data);

        if(!data){
            notifications.show({
                title: "Unable to get data",
                message: "Error in getting data"
            });
            setLoading(false);
            return;
        }

        const reader = data.getReader();
        setReader(reader);
        const decoder = new TextDecoder();

        let done = false;
        
        let i = 0;
        let embeddedDocumentsToAdd = []; // formatted in the manner in which it will be submitted (largely)

        while(!done){
            try {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
    
                const valueObj = JSON.parse(decoder.decode(value));
                console.log("Received from backend: ", valueObj);
                valueObj["source_id"] = dbSource.data!.id

                if(!valueObj["metadata"]){
                    setStatusUpdate("Page with error loading");
                    continue;
                } else {
                    embeddedDocumentsToAdd.push(valueObj);
                }

                setStatusUpdate("Loading: " + valueObj["metadata"]["url"])
    
                i++;
                if(i == 50){
                    const {data, error} = await supabaseClient.from("documents").insert(embeddedDocumentsToAdd);
                    console.log("Uploaded data to Supabase server");
                    if(error){
                        console.error("Error adding documents to documents table: ", error);
                        notifications.show({
                            title: "Error adding some embedded documents to the database",
                            message: "Please try again" 
                        });
                    }
                    i = 0;
                    // groups of 50
                }
            } catch (e) {
                console.error("Error while streaming documents: ", e);
                setStatusUpdate("");
                reader.cancel();
                notifications.show({
                    title: "Error",
                    message: "There was an error loading the documents"
                });
                setLoading(false);
                return;
            }
        }

        const finalDocSend = await supabaseClient.from("documents").insert(embeddedDocumentsToAdd);
        if(finalDocSend.error){
            notifications.show({
                title: "Error adding some embedded documents to the database",
                message: "Please try again"
            });
            return;
        }

        notifications.show({
            title: "Finished loading",
            message: "You can now chat with your documents"
        });

        await getSources();

        setLoading(false);
    }

    let stopLoading = () => {
        if(reader){
            reader.cancel();
            setReader(false);
            setLoading(false);
            notifications.show({
                title: "Stopped loading content",
                message: "Stopped loading pages"
            });
        }
    }

    return (
        <Container>
            {loading && <Loader/>}
            <Card shadow={'sm'} >
                <Box >

                    <Tabs defaultValue="sitemap">
                        <Tabs.List>
                            <Tabs.Tab value="sitemap">
                                Sitemap
                            </Tabs.Tab>
                            {/* <Tabs.Tab value="github">
                                Github
                            </Tabs.Tab> */}
                        </Tabs.List>
                        
                        <Tabs.Panel value="sitemap">
                            <TextInput p={'sm'} onChange={(e) => setSitemapURL(e.target.value)} value={sitemapURL} placeholder="Sitemap URL" disabled={loading}></TextInput>
                            <Textarea p={'sm'} onChange={(e) => setFilterURLs(e.target.value)} value={filterURLs} placeholder="Comma-separated filter URLs" disabled={loading}></Textarea>
                        </Tabs.Panel>
                        <Tabs.Panel value="github">
                            <TextInput p={'sm'} onChange={(e) => setGithubURL(e.target.value)}></TextInput>
                        </Tabs.Panel>
                    </Tabs>
        
                    <Button p={'sm'} onClick={() => addSource()}>Add Source</Button>
                    {loading && <Button p={"sm"} onClick={() => stopLoading()}>Stop Loading</Button>}

                    <Text p={'sm'}>{statusUpdate}</Text>
                </Box>
            </Card>


            {sources.length > 0 && sources.map((item, index) => (
                <Card>
                    <b>{item.name}</b>
                    <Button onClick={() => deleteSource(item)}>Delete source</Button>
                </Card>
            ))}
            {sources.length == 0 && <Text>No sources have been loaded so far.</Text>}
        </Container>
    )
} 