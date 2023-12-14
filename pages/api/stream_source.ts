import parseFromHtml from './../../utils/article-extractor/utils/parseFromHtml.js';
import { JSDOM } from 'jsdom';
import { convert } from "html-to-text";

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { NextResponse } from 'next/server';
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { Document } from 'langchain/document';
import Sitemapper from 'sitemapper';
import fetch from 'node-fetch';

let embeddingsModel = new OpenAIEmbeddings();

function iteratorToStream(iterator: any) { // https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming
    return new ReadableStream({
      async pull(controller) {
        const { value, done } = await iterator.next()
   
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      },
    })
}

const encoder = new TextEncoder();

async function getSourceGoogle(search_query: string) {
    console.log("get_sources: ", search_query);

    let data = JSON.stringify({
        "q": "site:" + search_query,
        "num": 100
    });

    const headers: HeadersInit = {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json'
    };
    let serperResult = await fetch("https://google.serper.dev/search", {
        method: 'POST',
        headers: headers,
        body: data
    });

    let searchResults: any = await serperResult.json();

    let links = [];
    for(var i = 0; i < searchResults["organic"]; i++){
        links.push(searchResults["organic"][i]["link"]);
    }

    console.log("Returning links: ", links);

    return links;
}

async function getSourceSitemap(sitemap: string, filterURLs: string){
    const sitemapper = new Sitemapper({
        url: sitemap,
        timeout: 15000
    });
    try {
        const { sites } = await sitemapper.fetch();
        return sites;
    } catch (error) {
        return {"error": error};
    }
}

async function getSite(url: string) {
    console.log("site loader: ", url);    

    let htmlContent = await fetch(url, {
        method: 'GET',
    })
    let contentString = await htmlContent.text();
    
    // console.log("HTML Content: ", contentString.substring(0, 100));
    let data;
    // try {
    data = await parseFromHtml(contentString, url);
    // console.log(data);

    let markdownContent = NodeHtmlMarkdown.translate(data!["content"]);
    data!["content"] = markdownContent;
    // console.log(markdownContent);
    Object.assign(data!, {link: data!["links"][0]});
    return data!;
}

async function getEmbeddings(content: string){
    return embeddingsModel.embedQuery(content);
}


async function* makeIterator(sites: string[], sourceName: string){ // set an automatic limit to 200 webpages - otherwise, split it into chunks.
    let textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 3000
    });
    for(var i = 0; i < sites!.length; i++){
        try {
            let siteExtracted = await getSite(sites[i]);
            let document = new Document({
                pageContent: siteExtracted["content"],
                metadata: {
                    url: sites![i].link,
                    source_name: sourceName
                }
            })
            // splitting text into parts
            let splitContent = await textSplitter.splitDocuments([document]);
            console.log("   Split " + siteExtracted["url"] + " into " + splitContent.length + " pieces");


            for(var j = 0; j < splitContent.length; j++){
                let embeddedContent = await getEmbeddings(splitContent[j].pageContent);
                let extraction = {
                    pageContent: document.pageContent,
                    metadata: document.metadata
                }
                yield encoder.encode(JSON.stringify({
                    embeddings: embeddedContent,
                    document: extraction
                }));
            }
        } catch (e) {
            console.error(e);
            yield encoder.encode(JSON.stringify({
                embeddings: [],
                pageContent: null,
                metadata: null
            }));
        }
    }
}

export const runtime = 'edge';

export default async function POST(req: Request){
    let body = await req.json();

    let filteredUrls = body["filter_urls"].split("\n");
    for(var i = 0; i < filteredUrls[i].length; i++){
        filteredUrls[i] = filteredUrls[i].trim();
    }

    const sites = await getSourceSitemap(body["sitemap_url"], filteredUrls);

    if("error" in sites){
        throw sites;
    } else {
        const iterator = makeIterator(sites, body["name"]);
        const stream = iteratorToStream(iterator);
        return new Response(stream);
    }
}