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
const getProjectNumber = require("../../getProjectNumber");
const loadCJSON = require("../../loadCJSON");
const functions_1 = require("./functions");
const functions_2 = require("./functions");
module.exports = function (context, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!context) {
            return;
        }
        const filePath = options.config.get("remoteconfig.template");
        if (!filePath) {
            return;
        }
        const template = loadCJSON(filePath);
        const projectNumber = yield getProjectNumber(options);
        template.etag = yield functions_1.getEtag(projectNumber);
        functions_2.validateInputRemoteConfigTemplate(template);
        context.remoteconfigTemplate = template;
        return;
    });
};
