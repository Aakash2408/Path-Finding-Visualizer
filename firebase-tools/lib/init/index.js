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
exports.init = void 0;
const _ = require("lodash");
const clc = require("cli-color");
const logger = require("../logger");
const _features = require("./features");
const utils = require("../utils");
const features = _features;
function init(setup, config, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const nextFeature = setup.features.shift();
        if (nextFeature) {
            if (!features[nextFeature]) {
                return utils.reject(clc.bold(nextFeature) +
                    " is not a valid feature. Must be one of " +
                    _.without(_.keys(features), "project").join(", "));
            }
            logger.info(clc.bold("\n" + clc.white("=== ") + _.capitalize(nextFeature) + " Setup"));
            yield Promise.resolve(features[nextFeature](setup, config, options));
            return init(setup, config, options);
        }
    });
}
exports.init = init;
