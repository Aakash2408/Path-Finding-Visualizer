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
const command_1 = require("../command");
const api_1 = require("../hosting/api");
const requirePermissions_1 = require("../requirePermissions");
const getProjectId = require("../getProjectId");
const requireConfig = require("../requireConfig");
const requireInstance = require("../requireInstance");
const getInstanceId = require("../getInstanceId");
const utils_1 = require("../utils");
const prompt_1 = require("../prompt");
exports.default = new command_1.Command("hosting:channel:delete <channelId>")
    .description("delete a Firebase Hosting channel")
    .option("--site <siteId>", "site in which the channel exists")
    .option("-f, --force", "delete without confirmation")
    .before(requireConfig)
    .before(requirePermissions_1.requirePermissions, ["firebasehosting.sites.update"])
    .before(requireInstance)
    .action((channelId, options) => __awaiter(void 0, void 0, void 0, function* () {
    const projectId = getProjectId(options);
    const siteId = options.site || (yield getInstanceId(options));
    channelId = api_1.normalizeName(channelId);
    let confirmed = Boolean(options.force);
    if (!confirmed) {
        confirmed = yield prompt_1.promptOnce({
            message: `Are you sure you want to delete the Hosting Channel ${cli_color_1.underline(channelId)} for site ${cli_color_1.underline(siteId)}?`,
            type: "confirm",
            default: false,
        });
    }
    if (!confirmed) {
        return;
    }
    yield api_1.deleteChannel(projectId, siteId, channelId);
    utils_1.logLabeledSuccess("hosting:channels", `Successfully deleted channel ${cli_color_1.bold(channelId)} for site ${cli_color_1.bold(siteId)}.`);
}));
