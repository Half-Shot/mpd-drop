import config from "config";
import { promises as fs } from "fs";
import util from "util";
import logger from "./log";

const log = logger("SongProcessor");
const exec = util.promisify(require('child_process').exec);
const MUSIC_DIR = config.get("mpd.uploadDir");

type Result = Promise<{status: "client-error"|"server-error", msg: string}|undefined>;

export class SongProcessor {
    constructor(private mpd: any) { }

    public async processBuffer(buf: Buffer, filename: string, queue: Boolean, play: Boolean): Result {
        log.debug("Body:", buf);
        const path = `${MUSIC_DIR}/${filename}`;
        log.info(`Writing file ${path}`);
        await fs.writeFile(path, buf);
        return this.process(filename, queue, play);
    }

    public async processYoutube(url: string, queue: Boolean, play: Boolean): Result {
        let stdout, stderr;
        try {
            const res = await exec(`/usr/bin/youtube-dl -x '${url}'`, {
                cwd: MUSIC_DIR,
                timeout: 85000,
            });
            stdout = res.stdout;
            stderr = res.sterr;
            log.debug("stdout,stderr:", stdout, stderr);    
        } catch (err) {
            log.warn("error downloading file:", err);
            return {status: "server-error", msg: err.message};
        }
        const groups = /\[ffmpeg\] Destination: (.*)/gm.exec(stdout);
        if (!groups) {
            throw Error("Couldn't extract filename");
        }
        return this.process(groups[groups.length -1], queue, play);
    }

    private async process(filename: string, shouldQueue: Boolean, shouldPlay: Boolean): Result {
        log.info(`Processing file ${filename}, q=${shouldQueue} p=${shouldPlay}`);
        await this.mpd.api.db.rescan();
        log.info(`Rescanned DB`);
        if (!shouldQueue.valueOf()) {
            return;
        }
        // Find it 
        const findString = `(file contains '${filename}')`;
        await this.mpd.api.db.searchadd(findString);

        if (!shouldPlay.valueOf()) {
            return;
        }
        const songs = await this.mpd.api.queue.find(findString);
        if (!songs || !songs.length) {
            log.warn("Could not find file in MPD");
            return {
                status: "server-error",
                msg: "Could not find file in MPD",
            }
        }
        const song = songs[songs.length-1];
        log.info(`Playing song ${song.id} ${song.name}`);
        await this.mpd.api.playback.playid(song.id);
    }
}