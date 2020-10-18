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
exports.checkRuntimeDependencies = void 0;
const cli_color_1 = require("cli-color");
const track = require("../../track");
const logger = require("../../logger");
const ensureApiEnabled_1 = require("../../ensureApiEnabled");
const utils_1 = require("../../utils");
const error_1 = require("../../error");
const FAQ_URL = "https://firebase.google.com/support/faq#functions-runtime";
const CLOUD_BUILD_API = "cloudbuild.googleapis.com";
function node8DeprecationWarning() {
    track("functions_runtime_notices", "nodejs8_deprecation_warning");
    logger.warn();
    utils_1.logLabeledWarning("functions", `The Node.js 8 runtime is deprecated and will be decommissioned on ${cli_color_1.bold("2021-03-15")}. For more information, see: ${FAQ_URL}`);
    logger.warn();
}
function node10BillingError(projectId) {
    track("functions_runtime_notices", "nodejs10_billing_error");
    return new error_1.FirebaseError(`Cloud Functions deployment requires the pay-as-you-go (Blaze) billing plan. To upgrade your project, visit the following URL:
      
https://console.firebase.google.com/project/${projectId}/usage/details

For additional information about this requirement, see Firebase FAQs:

${FAQ_URL}`, { exit: 1 });
}
function node10PermissionError(projectId) {
    track("functions_runtime_notices", "nodejs10_permission_error");
    return new error_1.FirebaseError(`Cloud Functions deployment requires the Cloud Build API to be enabled. The current credentials do not have permission to enable APIs for project ${cli_color_1.bold(projectId)}.

Please ask a project owner to visit the following URL to enable Cloud Build:

https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=${projectId}

For additional information about this requirement, see Firebase FAQs:
${FAQ_URL}
`);
}
function isBillingError(e) {
    var _a, _b, _c, _d;
    return !!((_d = (_c = (_b = (_a = e.context) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.details) === null || _d === void 0 ? void 0 : _d.find((d) => { var _a; return (_a = d.violations) === null || _a === void 0 ? void 0 : _a.find((v) => v.type === "serviceusage/billing-enabled"); }));
}
function isPermissionError(e) {
    var _a, _b, _c;
    return ((_c = (_b = (_a = e.context) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.status) === "PERMISSION_DENIED";
}
function checkRuntimeDependencies(projectId, runtime) {
    return __awaiter(this, void 0, void 0, function* () {
        if (runtime === "nodejs8") {
            node8DeprecationWarning();
            return;
        }
        try {
            yield ensureApiEnabled_1.ensure(projectId, CLOUD_BUILD_API, "functions");
        }
        catch (e) {
            if (isBillingError(e)) {
                throw node10BillingError(projectId);
            }
            else if (isPermissionError(e)) {
                throw node10PermissionError(projectId);
            }
            throw e;
        }
    });
}
exports.checkRuntimeDependencies = checkRuntimeDependencies;
