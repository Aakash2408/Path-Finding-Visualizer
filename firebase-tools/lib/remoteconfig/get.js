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
exports.getTemplate = exports.parseTemplateForTable = void 0;
const api = require("../api");
const logger = require("../logger");
const error_1 = require("../error");
const TIMEOUT = 30000;
const MAX_DISPLAY_ITEMS = 50;
function parseTemplateForTable(templateItems) {
    let outputStr = "";
    let counter = 0;
    for (const item in templateItems) {
        if (Object.prototype.hasOwnProperty.call(templateItems, item)) {
            outputStr = outputStr.concat(item, "\n");
            counter++;
            if (counter === MAX_DISPLAY_ITEMS) {
                outputStr += "+more..." + "\n";
                break;
            }
        }
    }
    return outputStr;
}
exports.parseTemplateForTable = parseTemplateForTable;
function getTemplate(projectId, versionNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let request = `/v1/projects/${projectId}/remoteConfig`;
            if (versionNumber) {
                request = request + "?versionNumber=" + versionNumber;
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
            throw new error_1.FirebaseError(`Failed to get Firebase Remote Config template for project ${projectId}. `, { exit: 2, original: err });
        }
    });
}
exports.getTemplate = getTemplate;
