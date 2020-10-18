"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeOriginOrCustomUrl = exports.realtimeOriginOrEmulatorOrCustomUrl = void 0;
const utils_1 = require("../utils");
const constants_1 = require("../emulator/constants");
const previews_1 = require("../previews");
const DEFAULT_HOST = "https://firebaseio.com";
function realtimeOriginOrEmulatorOrCustomUrl(options) {
    const host = previews_1.previews.rtdbmanagement ? options.instanceDetails.databaseUrl : DEFAULT_HOST;
    return utils_1.envOverride(constants_1.Constants.FIREBASE_DATABASE_EMULATOR_HOST, utils_1.envOverride("FIREBASE_REALTIME_URL", host), addHttpIfRequired);
}
exports.realtimeOriginOrEmulatorOrCustomUrl = realtimeOriginOrEmulatorOrCustomUrl;
function realtimeOriginOrCustomUrl(options) {
    const host = previews_1.previews.rtdbmanagement ? options.instanceDetails.databaseUrl : DEFAULT_HOST;
    return utils_1.envOverride("FIREBASE_REALTIME_URL", host);
}
exports.realtimeOriginOrCustomUrl = realtimeOriginOrCustomUrl;
function addHttpIfRequired(val) {
    if (val.startsWith("http")) {
        return val;
    }
    return `http://${val}`;
}
