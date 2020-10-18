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
exports.rollbackTemplate = void 0;
const api = require("../api");
const TIMEOUT = 30000;
function rollbackTemplate(projectId, versionNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        let requestPath = `/v1/projects/${projectId}/remoteConfig:rollback?versionNumber=${versionNumber}`;
        const response = yield api.request("POST", requestPath, {
            auth: true,
            origin: api.remoteConfigApiOrigin,
            timeout: TIMEOUT,
        });
        return response.body;
    });
}
exports.rollbackTemplate = rollbackTemplate;
