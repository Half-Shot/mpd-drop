import {default as express, Request, Response} from "express";
import bodyParser from "body-parser";
import { promises as fs } from "fs";
import * as mpd from "mpd-api";
import util from "util";

const exec = util.promisify(require('child_process').exec);

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
    console.log(`Started on ${PORT}`)
}

async function putSongFile(req: Request, res: Response) {
    console.log(`Got request for file ${req.headers["content-type"]}`);
    console.log("Body:", req.body);
    const path = `${MUSIC_DIR}/${req.params.filename}`;
    console.log(`Writing ${path}`);
    await fs.writeFile(path, req.body);
    await putCommon(req, res);
}

async function putSongYoutube(req: Request, res: Response) {
    console.log("Got request for YouTube");
    if (!req.body.yt) {
        res.status(400).send("NOT OK!");
        return;
    }
    let stdout, stderr;
    try {
        const res = await exec(`/usr/bin/youtube-dl -x '${req.body.yt}'`, {
            cwd: MUSIC_DIR,
            timeout: 85,
        });
        stdout = res.stdout;
        stderr = res.sterr;
        console.log("INFO:", stdout, stderr);    
    } catch (err) {
        console.log("ERROR downloading file:", err);
        res.status(500).send(err.message);
        return;
    }
    const groups = /\[ffmpeg\] Destination: (.*)/gm.exec(stdout);
    if (!groups) {
        throw Error("Couldn't extract filename");
    }
    req.params.filename = groups[groups.length -1];
    await putCommon(req, res);
}

async function putCommon(req: Request, res: Response) {
    await client.api.db.rescan();
    console.log("File:", req.params.filename);
    console.log(`Rescanned DB`);
    if (req.query["play"]) {
        // Find it 
        const findString = `(file contains '${req.params.filename}')`;
        await client.api.db.searchadd(findString);
        const songs = await client.api.queue.find(findString);
        if (!songs && songs.length) {
            console.log("Could not find file in MPD");
            res.status(500).send("Could not find file in MPD");
            return;
        }
        await client.api.playback.playid(songs[songs.length-1].id);
        console.log("Playing song");
    }
    res.status(200).send("OK");
}

main().catch((ex) => {
    console.error(ex);
});