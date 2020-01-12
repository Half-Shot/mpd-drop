import {default as express, Request, Response} from "express";
import bodyParser from "body-parser";
import { promises as fs } from "fs";
import * as mpd from "mpd-api";

const PORT = 9955;
const MUSIC_DIR = "/tmp";
let client;

async function main() {
    const app = express();
    client = await mpd.connect({
        host: '192.168.0.47',
        port: 6600,
    });
    app.use(bodyParser.json()).post("/song/youtube", putSongYoutube);
    app.use(bodyParser.raw({
        type: "*/*",
        limit: 1024 * 1024 * 50, // 10MB
    })).post("/song/file/:filename", putSongFile);
    app.listen(PORT, "127.0.0.1");
    console.log(`Started on ${PORT}     `)
}

async function putSongFile(req: Request, res: Response) {
    console.log(`Got request for file ${req.headers["content-type"]}`);
    console.log("Body:", req.body);
    const path = `${MUSIC_DIR}/${req.params.filename}`;
    console.log(`Writing ${path}`);
    await fs.writeFile(path, req.body);
    await client.api.db.rescan();
    console.log(`Rescanned DB`);
    res.status(200).send("OK");
}

async function putSongYoutube(req: Request, res: Response) {
    console.log("Got request for YouTube");
    res.status(200).send("OK");
}

main().catch((ex) => {
    console.error(ex);
});