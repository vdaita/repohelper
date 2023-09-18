import parseFromHtml from './../../utils/article-extractor/utils/parseFromHtml.js';

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { NextResponse } from 'next/server';
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown';

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

async function getSource(search_query: string) {
    console.log("get_sources: ", search_query);

    let data = JSON.stringify({
        "q": "site:" + search_query,
        "num": 100
    });

    // let config = {
    //     method: 'post',
    //     url: 'https://google.serper.dev/search',
    //     headers: {
    //         'X-API-KEY': process.env.SERPER_API_KEY,
    //         'Content-Type': 'application/json'
    //     },
    //     data: data
    // };

    // let searchResults = await axios(config);
    const headers: HeadersInit = {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json'
    };
    let serperResult = await fetch("https://google.serper.dev/search", {
        method: 'POST',
        headers: headers,
        body: data
    });

    let searchResults = await serperResult.json();
    console.log(searchResults);

    // let searchResults = [
    //     {
    //         "title": "Test",
    //         "link": "https://docs.mixpanel.com/docs/getting-started/what-is-mixpanel"
    //     }
    // ]
    // console.log(JSON.stringify(searchResults.data));

    // return searchResults;
    return searchResults["organic"];   
}

async function getSite(url: string) {
    console.log("site loader: ", url);    

    let htmlContent = await fetch(url, {
        method: 'GET',
    })
    let contentString = await htmlContent.text();
    
    // console.log("HTML Content: ", contentString.substring(0, 100));

    let data = await parseFromHtml(contentString, url);
    // console.log(data);

    let markdownContent = NodeHtmlMarkdown.translate(data!["content"]);
    data!["content"] = markdownContent;
    Object.assign(data!, {link: data!["links"][0]});

    return data!;
}

async function getEmbeddings(content: string){
    return embeddingsModel.embedQuery(content);
}

async function* makeIterator(sourceString: string){
    let sites = await getSource(sourceString);

    // let content_response = await fetch('/api/extract_content', {
    //     method: 'POST',
    //     body: JSON.stringify(sites)
    // });

    // let contents = await content_response.json();

    let embeddings = [];
    for(var i = 0; i < sites!.length; i++){
        try {
            let site_extracted = await getSite(sites![i].link);
            let embedded = await getEmbeddings(site_extracted["content"]);
            embeddings.push(embedded);
    
            //@ts-ignore
            site_extracted["embeddings"] = embedded;
            // contents[i]["embeddings"] = embedded;
    
            yield encoder.encode(JSON.stringify(site_extracted));
        } catch (e) {
            console.error(e);
            yield encoder.encode(JSON.stringify({
                url: "https://example.com",
                link: "https://example.com",
                title: "Error loading source",
                content: "Error loading source"
            }));
        }
    }
}

export const runtime = 'edge';

export default async function POST(req: Request){
    let body = await req.json();
    const iterator = makeIterator(body["url"]);
    const stream = iteratorToStream(iterator);

    return new Response(stream);
}