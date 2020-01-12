import * as mpd from "mpd-api";
import config from "config";
import logger from "./log";
import { SongProcessor } from "./processor";
import { WebInterface } from "./web";
import { MatrixInterface } from "./matrix";

const log = logger("index");

async function main() {
    const client = await mpd.connect({
        host: config.get("mpd.host"),
        port: config.get("mpd.port"),
    });
    const processor = new SongProcessor(client);
    if (config.has("web")) {
        new WebInterface(processor);
    }
    if (config.has("matrix")) {
        await new MatrixInterface(processor).start();
    }
    log.info("Started");
}

main().catch((ex) => {
    console.error(ex);
});