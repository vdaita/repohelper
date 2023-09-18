import axios from 'axios';
import { NextResponse } from 'next/server';

export default async function POST(req, res) {


    console.log("get_sources: ", req.body);

    let data = JSON.stringify({
        "q": "site:" + req.body["url"]
    });

    let config = {
        method: 'post',
        url: 'https://google.serper.dev/search',
        headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json'
        },
        data: data
    };

    // let searchResults = await axios(config);
    let searchResults = [
        {
            "title": "Test",
            "link": "https://docs.mixpanel.com/docs/getting-started/what-is-mixpanel"
        }
    ]
    console.log(JSON.stringify(searchResults.data));

    // return NextResponse.json(searchResults.data["organic"]);
    res.status(200).json(searchResults);
}