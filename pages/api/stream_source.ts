import parseFromHtml from './../../utils/article-extractor/utils/parseFromHtml.js';
import { JSDOM } from 'jsdom';
import { convert } from "html-to-text";

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { NextResponse } from 'next/server';
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

let embeddingsModel = new OpenAIEmbeddings();
// let textSplitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 20000
// });

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
    // console.log(searchResults);

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
    let data;
    // try {
    data = await parseFromHtml(contentString, url);
    // console.log(data);

    let markdownContent = NodeHtmlMarkdown.translate(data!["content"]);
    data!["content"] = markdownContent;
    // console.log(markdownContent);
    Object.assign(data!, {link: data!["links"][0]});
    // } catch (e) {
    //     console.log("Switched over to html2text");
    //     data = {
    //         url: url,
    //         link: url,
    //         content: "",
    //         title: ""
    //     }

    //     data!["title"] = url;
    //     data!["content"] = convert(contentString, {
    //         wordwrap: 130
    //     });
    // }




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

    // let embeddings = [];
    let textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 30000
    });

    for(var i = 0; i < sites!.length; i++){
        try {
            let site_extracted = await getSite(sites![i].link);
            // splitting text into parts
            let split_content = await textSplitter.splitText(site_extracted["content"]);

            console.log("   Split " + site_extracted["url"] + " into " + split_content.length + " pieces");
            for(var j = 0; j < split_content.length; j++){
                let embedded = await getEmbeddings(split_content[j]);
                let split_site_extracted = {...site_extracted};

                // embeddings.push(embedded);
    
                //@ts-ignore
                split_site_extracted["embeddings"] = embedded;
                split_site_extracted["content"] = split_content;
                // contents[i]["embeddings"] = embedded;
    
                yield encoder.encode(JSON.stringify(split_site_extracted));
            }

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