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
exports.initGitHub = void 0;
const cli_color_1 = require("cli-color");
const fs = require("fs");
const yaml = require("js-yaml");
const js_yaml_1 = require("js-yaml");
const ora = require("ora");
const path = require("path");
const sodium = require("tweetsodium");
const auth_1 = require("../../../auth");
const fsutils_1 = require("../../../fsutils");
const iam_1 = require("../../../gcp/iam");
const resourceManager_1 = require("../../../gcp/resourceManager");
const logger = require("../../../logger");
const prompt_1 = require("../../../prompt");
const utils_1 = require("../../../utils");
const api = require("../../../api");
let GIT_DIR;
let GITHUB_DIR;
let WORKFLOW_DIR;
let YML_FULL_PATH_PULL_REQUEST;
let YML_FULL_PATH_MERGE;
const YML_PULL_REQUEST_FILENAME = "firebase-hosting-pull-request.yml";
const YML_MERGE_FILENAME = "firebase-hosting-merge.yml";
const CHECKOUT_GITHUB_ACTION_NAME = "actions/checkout@v2";
const HOSTING_GITHUB_ACTION_NAME = "FirebaseExtended/action-hosting-deploy@v0";
function initGitHub(setup, config, options) {
    return __awaiter(this, void 0, void 0, function* () {
        logger.info();
        const gitRoot = getGitFolderPath();
        GIT_DIR = path.join(gitRoot, ".git");
        GITHUB_DIR = path.join(gitRoot, ".github");
        WORKFLOW_DIR = `${GITHUB_DIR}/workflows`;
        YML_FULL_PATH_PULL_REQUEST = `${WORKFLOW_DIR}/${YML_PULL_REQUEST_FILENAME}`;
        YML_FULL_PATH_MERGE = `${WORKFLOW_DIR}/${YML_MERGE_FILENAME}`;
        utils_1.logBullet("Authorizing with GitHub to upload your service account to a GitHub repository's secrets store.");
        const ghAccessToken = yield signInWithGitHub();
        const userDetails = yield getGitHubUserDetails(ghAccessToken);
        const ghUserName = userDetails.login;
        logger.info();
        utils_1.logSuccess(`Success! Logged into GitHub as ${cli_color_1.bold(ghUserName)}`);
        logger.info();
        const { repo, key, keyId } = yield promptForRepo(setup, ghAccessToken);
        const { default_branch: defaultBranch, id: repoId } = yield getRepoDetails(repo, ghAccessToken);
        const githubSecretName = `FIREBASE_SERVICE_ACCOUNT_${setup.projectId
            .replace(/-/g, "_")
            .toUpperCase()}`;
        const serviceAccountName = `github-action-${repoId}`;
        const serviceAccountJSON = yield createServiceAccountAndKeyWithRetry(setup, repo, serviceAccountName);
        logger.info();
        utils_1.logSuccess(`Created service account ${cli_color_1.bold(serviceAccountName)} with Firebase Hosting admin permissions.`);
        const spinnerSecrets = ora.default(`Uploading service account secrets to repository: ${repo}`);
        spinnerSecrets.start();
        const encryptedServiceAccountJSON = encryptServiceAccountJSON(serviceAccountJSON, key);
        yield uploadSecretToGitHub(repo, ghAccessToken, encryptedServiceAccountJSON, keyId, githubSecretName);
        spinnerSecrets.stop();
        utils_1.logSuccess(`Uploaded service account JSON to GitHub as secret ${cli_color_1.bold(githubSecretName)}.`);
        utils_1.logBullet(`You can manage your secrets at https://github.com/${repo}/settings/secrets.`);
        logger.info();
        if (setup.config.hosting.predeploy) {
            utils_1.logBullet(`You have a predeploy script configured in firebase.json.`);
        }
        const { script } = yield promptForBuildScript();
        const ymlDeployDoc = loadYMLDeploy();
        let shouldWriteYMLHostingFile = true;
        let shouldWriteYMLDeployFile = false;
        if (fs.existsSync(YML_FULL_PATH_PULL_REQUEST)) {
            const { overwrite } = yield promptForWriteYMLFile({
                message: `GitHub workflow file for PR previews exists. Overwrite? ${YML_PULL_REQUEST_FILENAME}`,
            });
            shouldWriteYMLHostingFile = overwrite;
        }
        if (shouldWriteYMLHostingFile) {
            writeChannelActionYMLFile(YML_FULL_PATH_PULL_REQUEST, githubSecretName, setup.projectId, script);
            logger.info();
            utils_1.logSuccess(`Created workflow file ${cli_color_1.bold(YML_FULL_PATH_PULL_REQUEST)}`);
        }
        const { setupDeploys, branch } = yield promptToSetupDeploys(ymlDeployDoc.branch || defaultBranch);
        if (setupDeploys) {
            if (ymlDeployDoc.exists) {
                if (ymlDeployDoc.branch !== branch) {
                    shouldWriteYMLDeployFile = true;
                }
                else {
                    const { overwrite } = yield promptForWriteYMLFile({
                        message: `The GitHub workflow file for deploying to the live channel already exists. Overwrite? ${YML_MERGE_FILENAME}`,
                    });
                    shouldWriteYMLDeployFile = overwrite;
                }
            }
            else {
                shouldWriteYMLDeployFile = true;
            }
            if (shouldWriteYMLDeployFile) {
                writeDeployToProdActionYMLFile(YML_FULL_PATH_MERGE, branch, githubSecretName, setup.projectId, script);
                logger.info();
                utils_1.logSuccess(`Created workflow file ${cli_color_1.bold(YML_FULL_PATH_MERGE)}`);
            }
        }
        logger.info();
        utils_1.logLabeledBullet("Action required", `Visit this URL to revoke authorization for the Firebase CLI GitHub OAuth App:`);
        logger.info(cli_color_1.bold.underline(`https://github.com/settings/connections/applications/${api.githubClientId}`));
        utils_1.logLabeledBullet("Action required", `Push any new workflow file(s) to your repo`);
    });
}
exports.initGitHub = initGitHub;
function getGitFolderPath() {
    const commandDir = process.cwd();
    let projectRootDir = commandDir;
    while (!fs.existsSync(path.resolve(projectRootDir, ".git"))) {
        const parentDir = path.dirname(projectRootDir);
        if (parentDir === projectRootDir) {
            utils_1.logBullet(`Didn't detect a .git folder. Assuming ${commandDir} is the project root.`);
            return commandDir;
        }
        projectRootDir = parentDir;
    }
    utils_1.logBullet(`Detected a .git folder at ${projectRootDir}`);
    return projectRootDir;
}
function defaultGithubRepo() {
    const gitConfigPath = path.join(GIT_DIR, "config");
    if (fs.existsSync(gitConfigPath)) {
        const gitConfig = fs.readFileSync(gitConfigPath, "utf8");
        const match = /github\.com:(.+)\.git/.exec(gitConfig);
        if (match) {
            return match[1];
        }
    }
    return undefined;
}
function loadYMLDeploy() {
    if (fs.existsSync(YML_FULL_PATH_MERGE)) {
        const { on } = loadYML(YML_FULL_PATH_MERGE);
        const branch = on.push.branches[0];
        return { exists: true, branch };
    }
    else {
        return { exists: false };
    }
}
function loadYML(ymlPath) {
    return js_yaml_1.safeLoad(fs.readFileSync(ymlPath, "utf8"));
}
function mkdirNotExists(dir) {
    if (!fsutils_1.dirExistsSync(dir)) {
        fs.mkdirSync(dir);
    }
}
function writeChannelActionYMLFile(ymlPath, secretName, projectId, script) {
    const workflowConfig = {
        name: "Deploy to Firebase Hosting on PR",
        on: "pull_request",
        jobs: {
            ["build_and_preview"]: {
                "runs-on": "ubuntu-latest",
                steps: [{ uses: CHECKOUT_GITHUB_ACTION_NAME }],
            },
        },
    };
    if (script) {
        workflowConfig.jobs.build_and_preview.steps.push({
            run: script,
        });
    }
    workflowConfig.jobs.build_and_preview.steps.push({
        uses: HOSTING_GITHUB_ACTION_NAME,
        with: {
            repoToken: "${{ secrets.GITHUB_TOKEN }}",
            firebaseServiceAccount: `\${{ secrets.${secretName} }}`,
            projectId: projectId,
        },
        env: {
            FIREBASE_CLI_PREVIEWS: "hostingchannels",
        },
    });
    const ymlContents = `# This file was auto-generated by the Firebase CLI
# https://github.com/firebase/firebase-tools

${yaml.safeDump(workflowConfig)}`;
    mkdirNotExists(GITHUB_DIR);
    mkdirNotExists(WORKFLOW_DIR);
    fs.writeFileSync(ymlPath, ymlContents, "utf8");
}
function writeDeployToProdActionYMLFile(ymlPath, branch, secretName, projectId, script) {
    const workflowConfig = {
        name: "Deploy to Firebase Hosting on merge",
        on: { push: { branches: [branch || "master"] } },
        jobs: {
            ["build_and_deploy"]: {
                "runs-on": "ubuntu-latest",
                steps: [{ uses: CHECKOUT_GITHUB_ACTION_NAME }],
            },
        },
    };
    if (script) {
        workflowConfig.jobs.build_and_deploy.steps.push({
            run: script,
        });
    }
    workflowConfig.jobs.build_and_deploy.steps.push({
        uses: HOSTING_GITHUB_ACTION_NAME,
        with: {
            repoToken: "${{ secrets.GITHUB_TOKEN }}",
            firebaseServiceAccount: `\${{ secrets.${secretName} }}`,
            channelId: "live",
            projectId: projectId,
        },
        env: {
            FIREBASE_CLI_PREVIEWS: "hostingchannels",
        },
    });
    const ymlContents = `# This file was auto-generated by the Firebase CLI
# https://github.com/firebase/firebase-tools

${yaml.safeDump(workflowConfig)}`;
    mkdirNotExists(GITHUB_DIR);
    mkdirNotExists(WORKFLOW_DIR);
    fs.writeFileSync(ymlPath, ymlContents, "utf8");
}
function uploadSecretToGitHub(repo, ghAccessToken, encryptedServiceAccountJSON, keyId, secretName) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield api.request("PUT", `/repos/${repo}/actions/secrets/${secretName}`, {
            origin: api.githubApiOrigin,
            headers: { Authorization: `token ${ghAccessToken}`, "User-Agent": "Firebase CLI" },
            data: {
                ["encrypted_value"]: encryptedServiceAccountJSON,
                ["key_id"]: keyId,
            },
        });
    });
}
function promptForRepo(options, ghAccessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        let key = "";
        let keyId = "";
        const { repo } = yield prompt_1.prompt(options, [
            {
                type: "input",
                name: "repo",
                default: defaultGithubRepo(),
                message: "For which GitHub repository would you like to set up a GitHub workflow?",
                validate: (repo) => __awaiter(this, void 0, void 0, function* () {
                    const { body } = yield api.request("GET", `/repos/${repo}/actions/secrets/public-key`, {
                        origin: api.githubApiOrigin,
                        headers: { Authorization: `token ${ghAccessToken}`, "User-Agent": "Firebase CLI" },
                        data: {
                            type: "owner",
                        },
                    });
                    key = body.key;
                    keyId = body.key_id;
                    return true;
                }),
            },
        ]);
        return { repo, key, keyId };
    });
}
function promptForBuildScript() {
    return __awaiter(this, void 0, void 0, function* () {
        const { shouldSetupScript } = yield prompt_1.prompt({}, [
            {
                type: "confirm",
                name: "shouldSetupScript",
                default: false,
                message: "Set up the workflow to run a build script before every deploy?",
            },
        ]);
        if (!shouldSetupScript) {
            return { script: undefined };
        }
        const { script } = yield prompt_1.prompt({}, [
            {
                type: "input",
                name: "script",
                default: "npm ci && npm run build",
                message: "What script should be run before every deploy?",
            },
        ]);
        return { script };
    });
}
function promptToSetupDeploys(defaultBranch) {
    return __awaiter(this, void 0, void 0, function* () {
        const { setupDeploys } = yield prompt_1.prompt({}, [
            {
                type: "confirm",
                name: "setupDeploys",
                default: true,
                message: "Set up automatic deployment to your site's live channel when a PR is merged?",
            },
        ]);
        if (!setupDeploys) {
            return { setupDeploys };
        }
        const { branch } = yield prompt_1.prompt({}, [
            {
                type: "input",
                name: "branch",
                default: defaultBranch,
                message: "What is the name of the GitHub branch associated with your site's live channel?",
            },
        ]);
        return { branch, setupDeploys };
    });
}
function promptForWriteYMLFile({ message }) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield prompt_1.prompt({}, [
            {
                type: "confirm",
                name: "overwrite",
                default: false,
                message,
            },
        ]);
    });
}
function getGitHubUserDetails(ghAccessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const { body: ghUserDetails } = yield api.request("GET", `/user`, {
            origin: api.githubApiOrigin,
            headers: { Authorization: `token ${ghAccessToken}`, "User-Agent": "Firebase CLI" },
        });
        return ghUserDetails;
    });
}
function getRepoDetails(repo, ghAccessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const { body } = yield api.request("GET", `/repos/${repo}`, {
            origin: api.githubApiOrigin,
            headers: { Authorization: `token ${ghAccessToken}`, "User-Agent": "Firebase CLI" },
        });
        return body;
    });
}
function signInWithGitHub() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield auth_1.login(true, null, "GITHUB");
    });
}
function createServiceAccountAndKeyWithRetry(options, repo, accountId) {
    return __awaiter(this, void 0, void 0, function* () {
        const spinnerServiceAccount = ora.default("Retrieving a service account.");
        spinnerServiceAccount.start();
        try {
            const serviceAccountJSON = yield createServiceAccountAndKey(options, repo, accountId);
            spinnerServiceAccount.stop();
            return serviceAccountJSON;
        }
        catch (e) {
            spinnerServiceAccount.stop();
            if (!e.message.includes("429")) {
                throw e;
            }
            spinnerServiceAccount.start();
            yield iam_1.deleteServiceAccount(options.projectId, `${accountId}@${options.projectId}.iam.gserviceaccount.com`);
            const serviceAccountJSON = yield createServiceAccountAndKey(options, repo, accountId);
            spinnerServiceAccount.stop();
            return serviceAccountJSON;
        }
    });
}
function createServiceAccountAndKey(options, repo, accountId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield iam_1.createServiceAccount(options.projectId, accountId, `A service account with permission to deploy to Firebase Hosting for the GitHub repository ${repo}`, `GitHub Actions (${repo})`);
        }
        catch (e) {
            if (!e.message.includes("409")) {
                throw e;
            }
        }
        const requiredRoles = [
            resourceManager_1.firebaseRoles.hostingAdmin,
            resourceManager_1.firebaseRoles.apiKeysViewer,
            resourceManager_1.firebaseRoles.runViewer,
        ];
        yield resourceManager_1.addServiceAccountToRoles(options.projectId, accountId, requiredRoles);
        const serviceAccountKey = yield iam_1.createServiceAccountKey(options.projectId, accountId);
        const buf = Buffer.from(serviceAccountKey.privateKeyData, "base64");
        const serviceAccountJSON = buf.toString();
        return serviceAccountJSON;
    });
}
function encryptServiceAccountJSON(serviceAccountJSON, key) {
    const messageBytes = Buffer.from(serviceAccountJSON);
    const keyBytes = Buffer.from(key, "base64");
    const encryptedBytes = sodium.seal(messageBytes, keyBytes);
    return Buffer.from(encryptedBytes).toString("base64");
}
