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
const clc = require("cli-color");
const command_1 = require("../command");
const prompt_1 = require("../prompt");
const requirePermissions_1 = require("../requirePermissions");
const api = require("../api");
const requireInstance = require("../requireInstance");
const utils = require("../utils");
exports.default = new command_1.Command("hosting:disable")
    .description("stop serving web traffic to your Firebase Hosting site")
    .option("-y, --confirm", "skip confirmation")
    .option("-s, --site <siteName>", "the site to disable")
    .before(requirePermissions_1.requirePermissions, ["firebasehosting.sites.update"])
    .before(requireInstance)
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    let confirm = Boolean(options.confirm);
    const siteToDisable = options.site || options.instance;
    if (!confirm) {
        confirm = yield prompt_1.promptOnce({
            type: "confirm",
            name: "confirm",
            message: `Are you sure you want to disable Firebase Hosting for the site ${clc.underline(siteToDisable)}\n${clc.underline("This will immediately make your site inaccessible!")}`,
        });
    }
    if (!confirm) {
        return;
    }
    yield api.request("POST", `/v1beta1/sites/${siteToDisable}/releases`, {
        auth: true,
        data: {
            type: "SITE_DISABLE",
        },
        origin: api.hostingApiOrigin,
    });
    utils.logSuccess(`Hosting has been disabled for ${clc.bold(siteToDisable)}. Deploy a new version to re-enable.`);
}));
