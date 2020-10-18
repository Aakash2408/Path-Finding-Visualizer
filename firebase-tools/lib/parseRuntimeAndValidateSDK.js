"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuntimeChoice = exports.getHumanFriendlyRuntimeName = exports.FUNCTIONS_SDK_VERSION_TOO_OLD_WARNING = exports.UNSUPPORTED_NODE_VERSION_PACKAGE_JSON_MSG = exports.UNSUPPORTED_NODE_VERSION_FIREBASE_JSON_MSG = exports.RUNTIME_NOT_SET = void 0;
const _ = require("lodash");
const path = require("path");
const clc = require("cli-color");
const semver = require("semver");
const checkFirebaseSDKVersion_1 = require("./checkFirebaseSDKVersion");
const error_1 = require("./error");
const utils = require("./utils");
const logger = require("./logger");
const track = require("./track");
const cjson = require("cjson");
const MESSAGE_FRIENDLY_RUNTIMES = {
    nodejs6: "Node.js 6 (Deprecated)",
    nodejs8: "Node.js 8 (Deprecated)",
    nodejs10: "Node.js 10",
    nodejs12: "Node.js 12",
};
const ENGINE_RUNTIMES = {
    6: "nodejs6",
    8: "nodejs8",
    10: "nodejs10",
    12: "nodejs12",
};
const ENGINE_RUNTIMES_NAMES = Object.values(ENGINE_RUNTIMES);
exports.RUNTIME_NOT_SET = "`runtime` field is required but was not found in firebase.json.\n" +
    "To fix this, add the following lines to the `functions` section of your firebase.json:\n" +
    '"runtime": "nodejs10"\n';
exports.UNSUPPORTED_NODE_VERSION_FIREBASE_JSON_MSG = clc.bold(`functions.runtime value is unsupported. ` +
    `Valid choices are: ${clc.bold("nodejs8")}, ${clc.bold("nodejs10")}, and ${clc.bold("nodejs12")}.`);
exports.UNSUPPORTED_NODE_VERSION_PACKAGE_JSON_MSG = clc.bold(`package.json in functions directory has an engines field which is unsupported. ` +
    `Valid choices are: ${clc.bold('{"node": "8"}')}, ${clc.bold('{"node": "10"}')}, and ${clc.bold('{"node":"12"}')}.`);
exports.FUNCTIONS_SDK_VERSION_TOO_OLD_WARNING = clc.bold.yellow("functions: ") +
    "You must have a " +
    clc.bold("firebase-functions") +
    " version that is at least 2.0.0. Please run " +
    clc.bold("npm i --save firebase-functions@latest") +
    " in the functions folder.";
function functionsSDKTooOld(sourceDir, minRange) {
    const userVersion = checkFirebaseSDKVersion_1.getFunctionsSDKVersion(sourceDir);
    if (!userVersion) {
        logger.debug("getFunctionsSDKVersion was unable to retrieve 'firebase-functions' version");
        return false;
    }
    try {
        if (!semver.intersects(userVersion, minRange)) {
            return true;
        }
    }
    catch (e) {
    }
    return false;
}
function getHumanFriendlyRuntimeName(runtime) {
    return _.get(MESSAGE_FRIENDLY_RUNTIMES, runtime, runtime);
}
exports.getHumanFriendlyRuntimeName = getHumanFriendlyRuntimeName;
function getRuntimeChoiceFromPackageJson(sourceDir) {
    const packageJsonPath = path.join(sourceDir, "package.json");
    const loaded = cjson.load(packageJsonPath);
    const engines = loaded.engines;
    if (!engines || !engines.node) {
        throw new error_1.FirebaseError(exports.RUNTIME_NOT_SET);
    }
    return ENGINE_RUNTIMES[engines.node];
}
function getRuntimeChoice(sourceDir, runtimeFromConfig) {
    const runtime = runtimeFromConfig || getRuntimeChoiceFromPackageJson(sourceDir);
    const errorMessage = runtimeFromConfig
        ? exports.UNSUPPORTED_NODE_VERSION_FIREBASE_JSON_MSG
        : exports.UNSUPPORTED_NODE_VERSION_PACKAGE_JSON_MSG;
    if (!runtime || !ENGINE_RUNTIMES_NAMES.includes(runtime)) {
        track("functions_runtime_notices", "package_missing_runtime");
        throw new error_1.FirebaseError(errorMessage, { exit: 1 });
    }
    if (runtime === "nodejs6") {
        track("functions_runtime_notices", "nodejs6_deploy_prohibited");
        throw new error_1.FirebaseError(errorMessage, { exit: 1 });
    }
    if (functionsSDKTooOld(sourceDir, ">=2")) {
        track("functions_runtime_notices", "functions_sdk_too_old");
        utils.logWarning(exports.FUNCTIONS_SDK_VERSION_TOO_OLD_WARNING);
    }
    return runtime;
}
exports.getRuntimeChoice = getRuntimeChoice;
