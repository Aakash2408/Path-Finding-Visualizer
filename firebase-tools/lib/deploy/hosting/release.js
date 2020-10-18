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
const api = require("../../api");
const utils = require("../../utils");
const logger = require("../../logger");
module.exports = function (context, options) {
    if (!context.hosting || !context.hosting.deploys) {
        return Promise.resolve();
    }
    logger.debug(JSON.stringify(context.hosting.deploys, null, 2));
    return Promise.all(context.hosting.deploys.map(function (deploy) {
        return __awaiter(this, void 0, void 0, function* () {
            utils.logLabeledBullet("hosting[" + deploy.site + "]", "finalizing version...");
            const finalizeResult = yield api.request("PATCH", `/v1beta1/${deploy.version}?updateMask=status`, {
                origin: api.hostingApiOrigin,
                auth: true,
                data: { status: "FINALIZED" },
            });
            logger.debug("[hosting] finalized version for " + deploy.site + ":", finalizeResult.body);
            utils.logLabeledSuccess("hosting[" + deploy.site + "]", "version finalized");
            utils.logLabeledBullet("hosting[" + deploy.site + "]", "releasing new version...");
            const channelSegment = context.hostingChannel && context.hostingChannel !== "live"
                ? `/channels/${context.hostingChannel}`
                : "";
            if (channelSegment) {
                logger.debug("[hosting] releasing to channel:", context.hostingChannel);
            }
            const releaseResult = yield api.request("POST", `/v1beta1/sites/${deploy.site}${channelSegment}/releases?version_name=${deploy.version}`, {
                auth: true,
                origin: api.hostingApiOrigin,
                data: { message: options.message || null },
            });
            logger.debug("[hosting] release:", releaseResult.body);
            utils.logLabeledSuccess("hosting[" + deploy.site + "]", "release complete");
        });
    }));
};
