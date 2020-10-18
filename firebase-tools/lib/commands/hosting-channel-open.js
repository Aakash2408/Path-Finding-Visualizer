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
const lodash_1 = require("lodash");
const cli_color_1 = require("cli-color");
const open = require("open");
const command_1 = require("../command");
const error_1 = require("../error");
const api_1 = require("../hosting/api");
const requirePermissions_1 = require("../requirePermissions");
const getProjectId = require("../getProjectId");
const requireConfig = require("../requireConfig");
const requireInstance = require("../requireInstance");
const getInstanceId = require("../getInstanceId");
const utils_1 = require("../utils");
const prompt_1 = require("../prompt");
exports.default = new command_1.Command("hosting:channel:open [channelId]")
    .description("opens the URL for a Firebase Hosting channel")
    .help("if unable to open the URL in a browser, it will be displayed in the output")
    .option("--site <siteId>", "the site to which the channel belongs")
    .before(requireConfig)
    .before(requirePermissions_1.requirePermissions, ["firebasehosting.sites.get"])
    .before(requireInstance)
    .action((channelId, options) => __awaiter(void 0, void 0, void 0, function* () {
    const projectId = getProjectId(options);
    const siteId = options.site || (yield getInstanceId(options));
    if (!channelId) {
        if (options.nonInteractive) {
            throw new error_1.FirebaseError(`Please provide a channelId.`);
        }
        const channels = yield api_1.listChannels(projectId, siteId);
        lodash_1.sortBy(channels, ["name"]);
        channelId = yield prompt_1.promptOnce({
            type: "list",
            message: "Which channel would you like to open?",
            choices: channels.map((c) => lodash_1.last(c.name.split("/")) || c.name),
        });
    }
    channelId = api_1.normalizeName(channelId);
    const channel = yield api_1.getChannel(projectId, siteId, channelId);
    if (!channel) {
        throw new error_1.FirebaseError(`Could not find the channel ${cli_color_1.bold(channelId)} for site ${cli_color_1.bold(siteId)}.`);
    }
    utils_1.logLabeledBullet("hosting:channel", channel.url);
    if (!options.nonInteractive) {
        open(channel.url);
    }
    return { url: channel.url };
}));
