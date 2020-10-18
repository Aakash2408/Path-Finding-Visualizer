"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectProjectRoot = void 0;
const fsutils_1 = require("./fsutils");
const error_1 = require("./error");
const path_1 = require("path");
function detectProjectRoot(options) {
    let projectRootDir = options.cwd || process.cwd();
    if (options.configPath) {
        const fullPath = path_1.resolve(projectRootDir, options.configPath);
        if (!fsutils_1.fileExistsSync(fullPath)) {
            throw new error_1.FirebaseError(`Could not load config file ${options.configPath}.`, { exit: 1 });
        }
        return path_1.dirname(fullPath);
    }
    while (!fsutils_1.fileExistsSync(path_1.resolve(projectRootDir, "./firebase.json"))) {
        const parentDir = path_1.dirname(projectRootDir);
        if (parentDir === projectRootDir) {
            return null;
        }
        projectRootDir = parentDir;
    }
    return projectRootDir;
}
exports.detectProjectRoot = detectProjectRoot;
