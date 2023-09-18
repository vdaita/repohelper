import axios from 'axios';
import { extract, extractFromHtml } from '@extractus/article-extractor';

export default async function POST(req, res) {
    console.log("site_proxy: ", req.body);    

    let url = req.body["url"];

    const data = await extract(url);
    console.log(data);

    res.status(200).json({
        content: data["content"]
    });
}