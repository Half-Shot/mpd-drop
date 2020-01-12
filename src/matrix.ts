import config from "config";
import { MatrixClient, SimpleFsStorageProvider, MessageEvent, MessageEventContent } from "matrix-bot-sdk";
import logging from "./log";
import { SongProcessor } from "./processor";

const log = logging("MatrixInterface");

export class MatrixInterface {
    private readonly matrix: MatrixClient;
    private readonly allowedRooms: string[];

    constructor(private readonly processor: SongProcessor) {
        this.matrix = new MatrixClient(
            config.get("matrix.url"),
            config.get("matrix.accessToken"),
            new SimpleFsStorageProvider("matrixstore.json"),
        );
        this.allowedRooms = (config.get("matrix.rooms") as string[]);
    }

    public async start() {
        this.allowedRooms.forEach(roomId => {
            this.matrix.joinRoom(roomId).catch(() => {
                log.warn(`Failed to join ${roomId} on startup`);
            });
        });
        this.matrix.on("room.message", this.onMessage.bind(this));
        await this.matrix.start();
    }

    private async onMessage(roomId: string, evt: MessageEvent<MessageEventContent>) {
        if (!this.allowedRooms.includes(roomId)) {
            return;
        }
        if (!evt.content.body.startsWith("!mpd ")) {
            return;
        }
        const commandArgs = evt.content.body.split(" ");
        switch(commandArgs[1]) {
            case "yt":
                const url = commandArgs[2];
                const play = commandArgs[3].toLowerCase() === "true";
                try {
                    const result = await this.processor.processYoutube(url, true, play);
                    if (result) {
                        log.warn(result.status, result.msg);
                        await this.matrix.sendNotice(roomId, `An error occured when trying to queue this video: ${result.msg}`);
                        await this.matrix.sendNotice(roomId, `Added video`);
                    }
                } catch (ex) {
                    log.warn(ex);
                    await this.matrix.sendNotice(roomId, "An error occured when trying to queue this video.");
                }
                break;
            case "help":
                await this.matrix.sendNotice(roomId, "!mpd yt <youtube_url> [play(true|false)]");
                break;
            default:
                await this.matrix.sendNotice(roomId, "Command not understood");
                break;
        }
    }
}