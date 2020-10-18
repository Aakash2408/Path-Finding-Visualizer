"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMinRequiredVersion = void 0;
const semver = require("semver");
const configstore_1 = require("./configstore");
const error_1 = require("./error");
const pkg = require("../package.json");
function checkMinRequiredVersion(key) {
    const minVersion = configstore_1.configstore.get(`motd.${key}`);
    if (minVersion && semver.gt(minVersion, pkg.version)) {
        throw new error_1.FirebaseError(`This command requires at least version ${minVersion} of the CLI to use. To update to the latest version using npm, run \`npm install -g firebase-tools\`. For other CLI management options, see https://firebase.google.com/docs/cli#update-cli`);
    }
}
exports.checkMinRequiredVersion = checkMinRequiredVersion;
