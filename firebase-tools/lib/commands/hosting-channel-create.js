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
const api_1 = require("../hosting/api");
const command_1 = require("../command");
const expireUtils_1 = require("../hosting/expireUtils");
const error_1 = require("../error");
const utils_1 = require("../utils");
const prompt_1 = require("../prompt");
const requirePermissions_1 = require("../requirePermissions");
const getInstanceId = require("../getInstanceId");
const getProjectId = require("../getProjectId");
const logger = require("../logger");
const requireConfig = require("../requireConfig");
const requireInstance = require("../requireInstance");
const marked = require("marked");
const LOG_TAG = "hosting:channel";
exports.default = new command_1.Command("hosting:channel:create [channelId]")
    .description("create a Firebase Hosting channel")
    .option("-e, --expires <duration>", "duration string (e.g. 12h or 30d) for channel expiration, max 30d")
    .option("--site <siteId>", "site for which to create the channel")
    .before(requireConfig)
    .before(requirePermissions_1.requirePermissions, ["firebasehosting.sites.update"])
    .before(requireInstance)
    .action((channelId, options) => __awaiter(void 0, void 0, void 0, function* () {
    const projectId = getProjectId(options);
    const site = options.site || (yield getInstanceId(options));
    let expireTTL = expireUtils_1.DEFAULT_DURATION;
    if (options.expires) {
        expireTTL = expireUtils_1.calculateChannelExpireTTL(options.expires);
    }
    if (!channelId) {
        if (options.nonInteractive) {
            throw new error_1.FirebaseError(`"channelId" argument must be provided in a non-interactive environment`);
        }
        channelId = yield prompt_1.promptOnce({
            type: "input",
            message: "Please provide a URL-friendly name for the channel:",
            validate: (s) => s,
        });
    }
    if (!channelId) {
        throw new error_1.FirebaseError(`"channelId" must not be empty`);
    }
    let channel;
    try {
        channel = yield api_1.createChannel(projectId, site, channelId, expireTTL);
    }
    catch (e) {
        if (e.status == 409) {
            throw new error_1.FirebaseError(`Channel ${cli_color_1.bold(channelId)} already exists on site ${cli_color_1.bold(site)}. Deploy to ${cli_color_1.bold(channelId)} with: ${cli_color_1.yellow(`firebase hosting:channel:deploy ${channelId}`)}`, { original: e });
        }
        throw e;
    }
    try {
        yield api_1.addAuthDomain(projectId, channel.url);
    }
    catch (e) {
        utils_1.logLabeledWarning(LOG_TAG, marked(`Unable to add channel domain to Firebase Auth. Visit the Firebase Console at ${utils_1.consoleUrl(projectId, "/authentication/providers")}`));
        logger.debug("[hosting] unable to add auth domain", e);
    }
    logger.info();
    utils_1.logLabeledSuccess(LOG_TAG, `Channel ${cli_color_1.bold(channelId)} has been created on site ${cli_color_1.bold(site)}.`);
    utils_1.logLabeledSuccess(LOG_TAG, `Channel ${cli_color_1.bold(channelId)} will expire at ${cli_color_1.bold(utils_1.datetimeString(new Date(channel.expireTime)))}.`);
    utils_1.logLabeledSuccess(LOG_TAG, `Channel URL: ${channel.url}`);
    logger.info();
    logger.info(`To deploy to this channel, use \`firebase hosting:channel:deploy ${channelId}\`.`);
    return channel;
}));
