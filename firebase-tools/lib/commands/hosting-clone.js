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
const ora = require("ora");
const command_1 = require("../command");
const error_1 = require("../error");
const api_1 = require("../hosting/api");
const utils = require("../utils");
const requireAuth_1 = require("../requireAuth");
const marked = require("marked");
const logger = require("../logger");
exports.default = new command_1.Command("hosting:clone <source> <targetChannel>")
    .description("clone a version from one site to another")
    .before(requireAuth_1.requireAuth)
    .action((source = "", targetChannel = "") => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    let sourceVersionName;
    let sourceVersion;
    let [sourceSiteId, sourceChannelId] = source.split(":");
    let [targetSiteId, targetChannelId] = targetChannel.split(":");
    if (!sourceSiteId || !sourceChannelId) {
        [sourceSiteId, sourceVersion] = source.split("@");
        if (!sourceSiteId || !sourceVersion) {
            throw new error_1.FirebaseError(`"${source}" is not a valid source. Must be in the form "<site>:<channel>" or "<site>@<version>"`);
        }
        sourceVersionName = `sites/${sourceSiteId}/versions/${sourceVersion}`;
    }
    if (!targetSiteId || !targetChannelId) {
        throw new error_1.FirebaseError(`"${targetChannel}" is not a valid target channel. Must be in the form "<site>:<channel>" (to clone to the active website, use "live" as the channel).`);
    }
    targetChannelId = api_1.normalizeName(targetChannelId);
    sourceChannelId = api_1.normalizeName(sourceChannelId);
    const equalSiteIds = sourceSiteId == targetSiteId;
    const equalChannelIds = sourceChannelId == targetChannelId;
    if (equalSiteIds && equalChannelIds) {
        throw new error_1.FirebaseError(`Source and destination cannot be equal. Please pick a different source or desination.`);
    }
    if (!sourceVersionName) {
        const sChannel = yield api_1.getChannel("-", sourceSiteId, sourceChannelId);
        if (!sChannel) {
            throw new error_1.FirebaseError(`Could not find the channel ${cli_color_1.bold(sourceChannelId)} for site ${cli_color_1.bold(sourceSiteId)}.`);
        }
        sourceVersionName = (_b = (_a = sChannel.release) === null || _a === void 0 ? void 0 : _a.version) === null || _b === void 0 ? void 0 : _b.name;
        if (!sourceVersionName) {
            throw new error_1.FirebaseError(`Could not find a version on the channel ${cli_color_1.bold(sourceChannelId)} for site ${cli_color_1.bold(sourceSiteId)}.`);
        }
    }
    let tChannel = yield api_1.getChannel("-", targetSiteId, targetChannelId);
    if (!tChannel) {
        utils.logBullet(`could not find channel ${cli_color_1.bold(targetChannelId)} in site ${cli_color_1.bold(targetSiteId)}, creating it...`);
        try {
            tChannel = yield api_1.createChannel("-", targetSiteId, targetChannelId);
        }
        catch (e) {
            throw new error_1.FirebaseError(`Could not create the channel ${cli_color_1.bold(targetChannelId)} for site ${cli_color_1.bold(targetSiteId)}.`, { original: e });
        }
        utils.logSuccess(`Created new channel ${targetChannelId}`);
        try {
            const tProjectId = getProjectId(tChannel.name);
            yield api_1.addAuthDomain(tProjectId, tChannel.url);
        }
        catch (e) {
            utils.logLabeledWarning("hosting:clone", marked(`Unable to add channel domain to Firebase Auth. Visit the Firebase Console at ${utils.consoleUrl(targetSiteId, "/authentication/providers")}`));
            logger.debug("[hosting] unable to add auth domain", e);
        }
    }
    const currentTargetVersionName = (_d = (_c = tChannel.release) === null || _c === void 0 ? void 0 : _c.version) === null || _d === void 0 ? void 0 : _d.name;
    if (equalSiteIds && sourceVersionName == currentTargetVersionName) {
        utils.logSuccess(`Channels ${cli_color_1.bold(sourceChannelId)} and ${cli_color_1.bold(targetChannel)} are serving identical versions. No need to clone.`);
        return;
    }
    let targetVersionName = sourceVersionName;
    const spinner = ora("Cloning site content...").start();
    try {
        if (!equalSiteIds) {
            const targetVersion = yield api_1.cloneVersion(targetSiteId, sourceVersionName, true);
            if (!targetVersion) {
                throw new error_1.FirebaseError(`Could not clone the version ${cli_color_1.bold(sourceVersion)} for site ${cli_color_1.bold(targetSiteId)}.`);
            }
            targetVersionName = targetVersion.name;
        }
        yield api_1.createRelease(targetSiteId, targetChannelId, targetVersionName);
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
    spinner.succeed();
    utils.logSuccess(`Site ${cli_color_1.bold(sourceSiteId)} ${sourceChannelId ? "channel" : "version"} ${cli_color_1.bold(sourceChannelId || sourceVersion)} has been cloned to site ${cli_color_1.bold(targetSiteId)} channel ${cli_color_1.bold(targetChannelId)}.`);
    utils.logSuccess(`Channel URL (${targetChannelId}): ${tChannel.url}`);
}));
function getProjectId(name) {
    const matches = name.match(`^projects/([^/]+)`);
    return matches ? matches[1] || "" : "";
}
