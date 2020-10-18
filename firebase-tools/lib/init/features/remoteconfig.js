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
exports.doSetup = void 0;
const logger = require("../../logger");
const prompt_1 = require("../../prompt");
const fsutils = require("../../fsutils");
const clc = require("cli-color");
function doSetup(setup, config) {
    return __awaiter(this, void 0, void 0, function* () {
        setup.config.remoteconfig = {};
        const jsonFilePath = yield prompt_1.promptOnce({
            type: "input",
            name: "template",
            message: "What file should be used for your Remote Config template?",
            default: "remoteconfig.template.json",
        });
        if (fsutils.fileExistsSync(jsonFilePath)) {
            const msg = "File " +
                clc.bold(jsonFilePath) +
                " already exists." +
                " Do you want to overwrite the existing Remote Config template?";
            const overwrite = yield prompt_1.promptOnce({
                type: "confirm",
                message: msg,
                default: false,
            });
            if (overwrite == true) {
                setup.config.remoteconfig.template = jsonFilePath;
                logger.info(setup.config.remoteconfig.template);
            }
            else {
                setup.config.remoteconfig.template = jsonFilePath;
            }
        }
        setup.config.remoteconfig.template = jsonFilePath;
        config.writeProjectFile(setup.config.remoteconfig.template, "");
    });
}
exports.doSetup = doSetup;
