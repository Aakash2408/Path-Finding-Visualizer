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
exports.publishTemplate = exports.deployTemplate = exports.validateInputRemoteConfigTemplate = exports.getEtag = void 0;
const error_1 = require("../../error");
const api = require("../../api");
const TIMEOUT = 30000;
function getEtag(projectNumber, versionNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        let reqPath = `/v1/projects/${projectNumber}/remoteConfig`;
        if (versionNumber) {
            reqPath = reqPath + "?versionNumber=" + versionNumber;
        }
        const response = yield api.request("GET", reqPath, {
            auth: true,
            origin: api.remoteConfigApiOrigin,
            timeout: TIMEOUT,
            headers: { "Accept-Encoding": "gzip" },
        });
        return response.response.headers.etag;
    });
}
exports.getEtag = getEtag;
function validateInputRemoteConfigTemplate(template) {
    const templateCopy = JSON.parse(JSON.stringify(template));
    if (!templateCopy || templateCopy == "null" || templateCopy == "undefined") {
        throw new error_1.FirebaseError(`Invalid Remote Config template: ${JSON.stringify(templateCopy)}`);
    }
    if (typeof templateCopy.etag !== "string" || templateCopy.etag == "") {
        throw new error_1.FirebaseError("ETag must be a non-empty string");
    }
    if (templateCopy.conditions && !Array.isArray(templateCopy.conditions)) {
        throw new error_1.FirebaseError("Remote Config conditions must be an array");
    }
    return templateCopy;
}
exports.validateInputRemoteConfigTemplate = validateInputRemoteConfigTemplate;
function deployTemplate(projectNumber, template, etag, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const reqPath = `/v1/projects/${projectNumber}/remoteConfig`;
        if (options === null || options === void 0 ? void 0 : options.force) {
            etag = "*";
        }
        const response = yield api.request("PUT", reqPath, {
            auth: true,
            origin: api.remoteConfigApiOrigin,
            timeout: TIMEOUT,
            headers: { "If-Match": etag },
            data: {
                conditions: template.conditions,
                parameters: template.parameters,
                parameterGroups: template.parameterGroups,
            },
        });
        return response.body;
    });
}
exports.deployTemplate = deployTemplate;
function publishTemplate(projectNumber, template, etag, options) {
    const temporaryTemplate = {
        conditions: template.conditions,
        parameters: template.parameters,
        parameterGroups: template.parameterGroups,
        etag: etag,
    };
    let validTemplate = temporaryTemplate;
    validTemplate = validateInputRemoteConfigTemplate(template);
    return deployTemplate(projectNumber, validTemplate, etag, options);
}
exports.publishTemplate = publishTemplate;
