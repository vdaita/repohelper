import { extract } from '@extractus/article-extractor';

export default async function POST(req, res) {


    console.log("extract_content: ", req.body);

    let results = [];
    for(var i = 0; i < results.length; i++){
        let data = await extract(results[i]["link"]);
        results.push(data);
    }    

    // return NextResponse.json(searchResults.data["organic"]);
    res.status(200).json(results);
}