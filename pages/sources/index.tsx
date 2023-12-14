'use client';

import { Group, Container, TextInput, Button, Textarea, Card, Loader } from '@mantine/core';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'; 
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { FakeEmbeddings } from 'langchain/embeddings/fake';
import { notifications } from '@mantine/notifications';

export default function SourcesManager(){

    const user = useUser();
    const supabaseClient = useSupabaseClient();
    const router = useRouter();

    const [sitemapURL, setSitemapURL] = useState("");
    const [filterURLs, setFilterURLs] = useState("");

    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [feedback, setFeedback] = useState("");

    const [vectorStore, setVectorStore] = useState<SupabaseVectorStore>();

    useEffect(() => {
        if(!user){
            router.push("/auth")
        } else {
            getSources();

            let newVectorstore = new SupabaseVectorStore(new FakeEmbeddings(), {
                client: supabaseClient,
                tableName: "documents"
            })
            setVectorStore(newVectorstore);
        }
    }, [user]);

    let deleteSource = async (item: any) => {
        setLoading(true);
        await supabaseClient.from('sources').delete().eq('id', item.id);
        setLoading(false);
    }

    let getSources = async () => {
        setLoading(true);
        let data = await supabaseClient.from('source').select().eq('id', user?.id);
        setSources(data.data!);
        setLoading(false)
    }

    let addSource = async () => {
        let res = await fetch("/api/stream_source", {
            method: "POST",
            body: JSON.stringify({
                sitemapUrl: sitemapURL,
                filterUrls: filterURLs,

            })
        });

        if(!res.ok){
            // toast an error
            notifications.show({
                title: "There was an error loading your source",
                message: res.statusText
            })
            return;
        }

        const data = res.body;
        console.log("Data: ", data);

        if(!data){
            return;
        }

        const reader = data.getReader();
        const decoder = new TextDecoder();

        let done = false;
        
        let i = 0;
        let embeddedDocumentsToAdd = [];
        let embeddedVectorsToAdd = [];

        while(!done){
            const { value, done: doneReading } = await reader.read();
            done = doneReading;

            const valueObj = JSON.parse(decoder.decode(value));
            embeddedVectorsToAdd.push(valueObj["embeddings"]);
            embeddedDocumentsToAdd.push(valueObj["document"]);

            i++;
            if(i == 50){
                vectorStore?.addVectors(embeddedVectorsToAdd, embeddedDocumentsToAdd)
                embeddedDocumentsToAdd = [];
                embeddedVectorsToAdd = [];
                // groups of 50
            }
        }

        notifications.show({
            title: "Loading finished",
            message: "You can click away from this website now"
        });

    }

    return (
        <Container>
            {loading && <Loader/>}
            <Group>
                <TextInput onChange={(e) => setSitemapURL(e.target.value)} value={sitemapURL} placeholder="Sitemap URL" disabled={loading}></TextInput>
                <Textarea onChange={(e) => setFilterURLs(e.target.value)} value={filterURLs} placeholder="Comma-separated filter URLs" disabled={loading}></Textarea>
                <Button>Add Source</Button>
            </Group>
            {sources.map((item, index) => (
                <Card>
                    <b>{item.name}</b>
                    <Button onClick={() => deleteSource(item)}>Delete source</Button>
                </Card>
            ))}
        </Container>
    )
} 