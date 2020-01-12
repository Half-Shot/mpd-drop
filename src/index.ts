import {default as express, Request, Response} from "express";
import bodyParser from "body-parser";
import * as mpd from "mpd-api";
import config from "config";
import logger from "./log";
import { SongProcessor } from "./processor";
import { WebInterface } from "./web";

const log = logger("index");
let client;
let processor: SongProcessor;

log.info("Hello!");

async function main() {
    client = await mpd.connect({
        host: config.get("mpd.host"),
        port: config.get("mpd.port"),
    });
    processor = new SongProcessor(client);
    if (config.get("web.enabled")) {
        const web = new WebInterface(processor);
    }
}

main().catch((ex) => {
    console.error(ex);
});