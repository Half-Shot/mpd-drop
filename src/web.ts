import {default as express, Request, Response} from "express";
import bodyParser from "body-parser";
import * as mpd from "mpd-api";
import config from "config";
import logger from "./log";
import { SongProcessor } from "./processor";
const log = logger("index");

export class WebInterface {
    constructor(private readonly processor: SongProcessor) {
        const app = express();
        app.use(bodyParser.json()).post("/song/youtube", this.postSongYoutube.bind(this));

        app.use(bodyParser.raw({
            type: "*/*",
            limit: 1024 * 1024 * 50, // 10MB
        })).post("/song/file/:filename", this.postSongFile.bind(this));
        app.listen(config.get("web.port"), config.get("web.host"));
        log.info(`Started on ${config.get("web.host")}:${config.get("web.port")}`);
    }

    private async postSongFile(req: Request, res: Response) {
        console.log(`Got request for file ${req.headers["content-type"]}`);
        try {
            const result = await this.processor.processBuffer(req.body, req.params.filename, new Boolean(req.query["queue"]), new Boolean(req.query["play"]));
            if (!result) {
                return res.status(200).send("OK");
            }
            res.status(result.status === "client-error" ? 400 : 500).send(result.msg);
        } catch (ex) {
            res.status(500).send(ex.message);
        }
    }
    
    private async postSongYoutube(req: Request, res: Response) {
        console.log("Got request for YouTube");
        if (!req.body.yt) {
            res.status(400).send("Missing `yt`");
            return;
        }
        try {
            const result = await this.processor.processYoutube(req.body.yt, new Boolean(req.query["queue"]), new Boolean(req.query["play"]));
            if (!result) {
                return res.status(200).send("OK");
            }
            res.status(result.status === "client-error" ? 400 : 500).send(result.msg);
        } catch (ex) {
            res.status(500).send(ex.message);
        }
    }
}
