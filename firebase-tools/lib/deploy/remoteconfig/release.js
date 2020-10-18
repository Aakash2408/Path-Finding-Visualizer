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
const functions_1 = require("./functions");
const getProjectNumber = require("../../getProjectNumber");
module.exports = function (context, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(context === null || context === void 0 ? void 0 : context.remoteconfigTemplate)) {
            return;
        }
        const template = context.remoteconfigTemplate;
        const projectNumber = yield getProjectNumber(options);
        const etag = yield functions_1.getEtag(projectNumber);
        return functions_1.publishTemplate(projectNumber, template, etag, options);
    });
};
