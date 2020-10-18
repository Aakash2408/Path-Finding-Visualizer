"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageJsonIsValid = exports.functionNamesAreValid = exports.functionsDirectoryExists = void 0;
const error_1 = require("../../error");
const _ = require("lodash");
const path = require("path");
const clc = require("cli-color");
const logger = require("../../logger");
const projectPath = require("../../projectPath");
const fsutils = require("../../fsutils");
const parseRuntimeAndValidateSDK_1 = require("../../parseRuntimeAndValidateSDK");
const cjson = require("cjson");
function functionsDirectoryExists(options, sourceDirName) {
    if (!fsutils.dirExistsSync(projectPath.resolveProjectPath(options, sourceDirName))) {
        const msg = `could not deploy functions because the ${clc.bold('"' + sourceDirName + '"')} ` +
            `directory was not found. Please create it or specify a different source directory in firebase.json`;
        throw new error_1.FirebaseError(msg);
    }
}
exports.functionsDirectoryExists = functionsDirectoryExists;
function functionNamesAreValid(functionNames) {
    const validFunctionNameRegex = /^[a-zA-Z0-9_-]{1,62}$/;
    const invalidNames = _.reject(_.keys(functionNames), (name) => {
        return _.startsWith(name, ".") || validFunctionNameRegex.test(name);
    });
    if (!_.isEmpty(invalidNames)) {
        const msg = `${invalidNames.join(", ")} function name(s) can only contain letters, ` +
            `numbers, hyphens, and not exceed 62 characters in length`;
        throw new error_1.FirebaseError(msg);
    }
}
exports.functionNamesAreValid = functionNamesAreValid;
function packageJsonIsValid(sourceDirName, sourceDir, projectDir, hasRuntimeConfigInConfig) {
    const packageJsonFile = path.join(sourceDir, "package.json");
    if (!fsutils.fileExistsSync(packageJsonFile)) {
        const msg = `No npm package found in functions source directory. Please run 'npm init' inside ${sourceDirName}`;
        throw new error_1.FirebaseError(msg);
    }
    let data;
    try {
        data = cjson.load(packageJsonFile);
        logger.debug("> [functions] package.json contents:", JSON.stringify(data, null, 2));
        assertFunctionsSourcePresent(data, sourceDir, projectDir);
    }
    catch (e) {
        const msg = `There was an error reading ${sourceDirName}${path.sep}package.json:\n\n ${e.message}`;
        throw new error_1.FirebaseError(msg);
    }
    if (!hasRuntimeConfigInConfig) {
        assertEnginesFieldPresent(data);
    }
}
exports.packageJsonIsValid = packageJsonIsValid;
function assertFunctionsSourcePresent(data, sourceDir, projectDir) {
    const indexJsFile = path.join(sourceDir, data.main || "index.js");
    if (!fsutils.fileExistsSync(indexJsFile)) {
        const msg = `${path.relative(projectDir, indexJsFile)} does not exist, can't deploy Cloud Functions`;
        throw new error_1.FirebaseError(msg);
    }
}
function assertEnginesFieldPresent(data) {
    if (!data.engines || !data.engines.node) {
        throw new error_1.FirebaseError(parseRuntimeAndValidateSDK_1.RUNTIME_NOT_SET);
    }
}
