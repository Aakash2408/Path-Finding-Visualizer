"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli_color_1 = require("cli-color");
const Table = require("cli-table");
const api_1 = require("../hosting/api");
const command_1 = require("../command");
const requirePermissions_1 = require("../requirePermissions");
const getInstanceId = require("../getInstanceId");
const getProjectId = require("../getProjectId");
const logger = require("../logger");
const requireConfig = require("../requireConfig");
const requireInstance = require("../requireInstance");
const utils_1 = require("../utils");
const TABLE_HEAD = ["Channel ID", "Last Release Time", "URL", "Expire Time"];
exports.default = new command_1.Command("hosting:channel:list")
    .description("list all Firebase Hosting channels for your project")
    .option("--site <siteName>", "list channels for the specified site")
    .before(requireConfig)
    .before(requirePermissions_1.requirePermissions, ["firebasehosting.sites.update"])
    .before(requireInstance)
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    const projectId = getProjectId(options);
    const siteId = options.site || (yield getInstanceId(options));
    const channels = yield api_1.listChannels(projectId, siteId);
    const table = new Table({ head: TABLE_HEAD, style: { head: ["green"] } });
    for (const channel of channels) {
        const channelId = channel.name.split("/").pop();
        table.push([
            channelId,
            utils_1.datetimeString(new Date(channel.updateTime)),
            channel.url,
            channel.expireTime ? utils_1.datetimeString(new Date(channel.expireTime)) : "never",
        ]);
    }
    logger.info();
    logger.info(`Channels for site ${cli_color_1.bold(siteId)}`);
    logger.info();
    logger.info(table.toString());
    return { channels };
}));
