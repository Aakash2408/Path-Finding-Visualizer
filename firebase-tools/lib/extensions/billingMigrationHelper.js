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
exports.displayNode10CreateBillingNotice = exports.displayNode10UpdateBillingNotice = void 0;
const marked = require("marked");
const TerminalRenderer = require("marked-terminal");
const error_1 = require("../error");
const extensionsHelper_1 = require("./extensionsHelper");
const prompt_1 = require("../prompt");
const utils = require("../utils");
marked.setOptions({
    renderer: new TerminalRenderer(),
});
const urlPricingExamples = "https://cloud.google.com/functions/pricing#pricing_examples";
const urlFAQ = "https://firebase.google.com/support/faq/#extensions-pricing";
const billingMsgUpdate = "This update includes an upgrade to Node.js 10 from Node.js 8, which is no" +
    " longer maintained. Starting with this update, you will be charged a" +
    " small amount (typically around $0.01/month) for the Firebase resources" +
    " required by this extension (even if it is not used), in addition to any" +
    " charges associated with its usage.\n\n" +
    `See pricing examples: **[${urlPricingExamples}](${urlPricingExamples})**\n` +
    `See the FAQ: **[${urlFAQ}](${urlFAQ})**\n`;
const billingMsgCreate = "You will be charged around $0.01/month for the Firebase resources" +
    " required by this extension (even if it is not used). Additionally," +
    " using this extension will contribute to your project's overall usage" +
    " level of Firebase services. However, you'll only be charged for usage" +
    " that exceeds Firebase's free tier for those services.\n\n" +
    `See pricing examples: **[${urlPricingExamples}](${urlPricingExamples})**\n` +
    `See the FAQ: **[${urlFAQ}](${urlFAQ})**\n`;
const defaultSpecVersion = "v1beta";
const defaultRuntimes = {
    v1beta: "nodejs8",
};
function hasRuntime(spec, runtime) {
    const specVersion = spec.specVersion || defaultSpecVersion;
    const defaultRuntime = defaultRuntimes[specVersion];
    const resources = spec.resources || [];
    return resources.some((r) => { var _a; return runtime === (((_a = r.properties) === null || _a === void 0 ? void 0 : _a.runtime) || defaultRuntime); });
}
function displayNode10UpdateBillingNotice(curSpec, newSpec, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (hasRuntime(curSpec, "nodejs8") && hasRuntime(newSpec, "nodejs10")) {
            utils.logLabeledWarning(extensionsHelper_1.logPrefix, marked(billingMsgUpdate));
            if (prompt) {
                const continueUpdate = yield prompt_1.promptOnce({
                    type: "confirm",
                    message: "Do you wish to continue?",
                    default: true,
                });
                if (!continueUpdate) {
                    throw new error_1.FirebaseError(`Cancelled.`, { exit: 2 });
                }
            }
        }
    });
}
exports.displayNode10UpdateBillingNotice = displayNode10UpdateBillingNotice;
function displayNode10CreateBillingNotice(spec, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (hasRuntime(spec, "nodejs10")) {
            utils.logLabeledWarning(extensionsHelper_1.logPrefix, marked(billingMsgCreate));
            if (prompt) {
                const continueUpdate = yield prompt_1.promptOnce({
                    type: "confirm",
                    message: "Do you wish to continue?",
                    default: true,
                });
                if (!continueUpdate) {
                    throw new error_1.FirebaseError(`Cancelled.`, { exit: 2 });
                }
            }
        }
    });
}
exports.displayNode10CreateBillingNotice = displayNode10CreateBillingNotice;
