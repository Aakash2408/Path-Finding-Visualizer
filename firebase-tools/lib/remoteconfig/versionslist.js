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
exports.getVersions = void 0;
const api = require("../api");
const error_1 = require("../error");
const logger = require("../logger");
const TIMEOUT = 30000;
function getVersions(projectId, maxResults = 10) {
    return __awaiter(this, void 0, void 0, function* () {
        maxResults = maxResults || 300;
        try {
            let request = `/v1/projects/${projectId}/remoteConfig:listVersions`;
            if (maxResults) {
                request = request + "?pageSize=" + maxResults;
            }
            const response = yield api.request("GET", request, {
                auth: true,
                origin: api.remoteConfigApiOrigin,
                timeout: TIMEOUT,
            });
            return response.body;
        }
        catch (err) {
            logger.debug(err.message);
            throw new error_1.FirebaseError(`Failed to get Remote Config template versions for Firebase project ${projectId}. `, { exit: 2, original: err });
        }
    });
}
exports.getVersions = getVersions;
