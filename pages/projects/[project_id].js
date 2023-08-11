'use client';

// Allow users to add and delete sources to their project
import styles from '@/styles/Chat.module.css';
import { AppBar, Container, TextInput, Badge, Button, Loader, Card, Alert, Flex, Textarea, Box, Text, useMantineTheme, Navbar, AppShell, Tabs } from '@mantine/core';
import React, { useState, useEffect, useRef } from 'react';
import { notifications } from "@mantine/notifications";
import { useRouter } from 'next/router';


export default function ManageProject(){

    const [project, setProject] = useState({});
    const [sources, setSources] = useState([]);

    const [isLoading, setIsLoading] = useState(false);

    const [sourceType, setSourceType] = useState("");

    // GitHub type
    const repoOwnerInput = useRef();
    const repoNameInput = useRef();
    const branchInput = useRef();
    const folderInput = useRef();

    useEffect(() => {
        getProjectInfo();
        getSources();
    }, []);

    let genGradient = (sourceType) => {
        return {from: 'indigo', to: 'cyan'}; // change this depending on the type of source (github, text, etc.)
    }

    let addSource = async () => {
        let base_url = "https://localhost:8080"

        let res = await fetch(base_url + "/add_source", {
            method: 'POST',
            body: JSON.stringify({
                source_type: "github",
                repo: project.id,
                body: {
                    owner: repoOwnerInput.current.value,
                    name: repoNameInput.current.value,
                    branch: branchInput.current.value,
                    folder: folderInput.current.value
                }
            })
        });

        res = await res.json();
    }

    let getProjectInfo = async() => {
        const { data, error } = await supabaseClient
            .from('projects')
            .select()
            .eq('project_id', router.query.project_id);

        if(data.length == 0 || error){
            notifications.show({
                title: 'Error fetching project info',
                color: 'red'
            })
            return;
        }

        setProject(data);
    }

    let getSources = async () => {
        const { data, error } = await supabaseClient
            .from('sources')
            .delete()
            .eq('project_id', router.query.project_id);

        setSources(data);
        if(error){
            notifications.show({
                title: 'Error fetching sources',
                color: 'red'
            });
        }
    }

    let deleteSource = async (item, index) => {
        const { error } = await supabaseClient
            .from('sources')
            .delete()
            .eq('id', item.id);

        // deleting a source should cascade down to documents

        if(error){
            notifications.show({
                title: 'Error deleting source',
                color: 'red'
            });
            return;
        }

        let localSources = [...sources];
        localSources.splice(index, 1);
        setSources(localSources);
    }

    return (
        <Container py='lg' px='md' className={styles.container}>
            <Card shadow="sm" style={{position: 'sticky', top: 0, background: 'white', zIndex: 100}}>
                <Text size="lg">manage sources {project.name ? ("for " + project.name) : ""}</Text>
            </Card>

            <Tabs defaultValue="gallery" onTabChange={(value) => setSourceType(value)}>
                <Tabs.List>
                    <Tabs.Tab value="github">GitHub</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="github" pt="md">
                    <Card shadow="sm" m="md" padding="lg" radius="md" withBorder>
                        <Text size="md">
                            New GitHub repo
                        </Text>
                        <TextInput disabled={isLoading} m="sm" w='flex' size="md" label="repo owner" ref={repoOwnerInput}></TextInput>
                        <TextInput disabled={isLoading} m="sm" w='flex' size="md" label="repo name" ref={repoNameInput}></TextInput>
                        <TextInput disabled={isLoading} m="sm" w='flex' size="md" label="branch" ref={branchInput}></TextInput>
                        <TextInput disabled={isLoading} m="sm" w='flex' size="md" label="folder" ref={folderInput}></TextInput>

                        <Button mx="sm" size="md" onClick={() => addSource()}>
                            Add
                        </Button>
                    </Card>
                </Tabs.Panel>
            </Tabs>
            

            <Box mt="md">
                {sources.length == 0 ? "Your sources will show here" : ''}
                {sources.map((item, index) => {
                    <Card key={index} shadow="sm" m="md" padding="lg" radius="md" withBorder>
                        <Batch variant="gradient" gradient={genGradient(item.source_type)}>
                            <Text weight={500}>{item.source_type}</Text>
                        </Batch>
                        {item.source_type == "github" && <>
                            <Text size="md">{item.data.url}</Text>
                            <Text size="sm">branch {item.data.branch}, folder {item.data.folder}</Text>
                        </>}
                    </Card>
                })}
                <Button color="red" onClick={() => deleteSource(item, index)}>Delete source</Button>
            </Box>
        </Container>
    )
}