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
exports.listDatabaseInstances = exports.parseDatabaseLocation = exports.createInstance = exports.getDatabaseInstanceDetails = exports.populateInstanceDetails = exports.DatabaseLocation = exports.DatabaseInstanceState = exports.DatabaseInstanceType = void 0;
const api = require("../api");
const logger = require("../logger");
const utils = require("../utils");
const previews_1 = require("../previews");
const error_1 = require("../error");
const constants_1 = require("../emulator/constants");
const MGMT_API_VERSION = "v1beta";
const TIMEOUT_MILLIS = 10000;
const APP_LIST_PAGE_SIZE = 100;
const INSTANCE_RESOURCE_NAME_REGEX = /projects\/([^\/]+?)\/locations\/([^\/]+?)\/instances\/([^\/]*)/;
var DatabaseInstanceType;
(function (DatabaseInstanceType) {
    DatabaseInstanceType["DATABASE_INSTANCE_TYPE_UNSPECIFIED"] = "unspecified";
    DatabaseInstanceType["DEFAULT_DATABASE"] = "default";
    DatabaseInstanceType["USER_DATABASE"] = "user";
})(DatabaseInstanceType = exports.DatabaseInstanceType || (exports.DatabaseInstanceType = {}));
var DatabaseInstanceState;
(function (DatabaseInstanceState) {
    DatabaseInstanceState["LIFECYCLE_STATE_UNSPECIFIED"] = "unspecified";
    DatabaseInstanceState["ACTIVE"] = "active";
    DatabaseInstanceState["DISABLED"] = "disabled";
    DatabaseInstanceState["DELETED"] = "deleted";
})(DatabaseInstanceState = exports.DatabaseInstanceState || (exports.DatabaseInstanceState = {}));
var DatabaseLocation;
(function (DatabaseLocation) {
    DatabaseLocation["US_CENTRAL1"] = "us-central1";
    DatabaseLocation["EUROPE_WEST1"] = "europe-west1";
    DatabaseLocation["ASIA_SOUTHEAST1"] = "asia-southeast1";
    DatabaseLocation["ANY"] = "-";
})(DatabaseLocation = exports.DatabaseLocation || (exports.DatabaseLocation = {}));
function populateInstanceDetails(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (previews_1.previews.rtdbmanagement) {
            options.instanceDetails = yield getDatabaseInstanceDetails(options.project, options.instance);
        }
        return Promise.resolve();
    });
}
exports.populateInstanceDetails = populateInstanceDetails;
function getDatabaseInstanceDetails(projectId, instanceName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield api.request("GET", `/${MGMT_API_VERSION}/projects/${projectId}/locations/-/instances/${instanceName}`, {
                auth: true,
                origin: api.rtdbManagementOrigin,
                timeout: TIMEOUT_MILLIS,
            });
            return convertDatabaseInstance(response.body);
        }
        catch (err) {
            logger.debug(err.message);
            const emulatorHost = process.env[constants_1.Constants.FIREBASE_DATABASE_EMULATOR_HOST];
            if (emulatorHost) {
                return Promise.resolve({
                    name: instanceName,
                    project: projectId,
                    location: DatabaseLocation.ANY,
                    databaseUrl: utils.getDatabaseUrl(emulatorHost, instanceName, ""),
                    type: DatabaseInstanceType.DEFAULT_DATABASE,
                    state: DatabaseInstanceState.ACTIVE,
                });
            }
            return utils.reject(`Failed to get instance details for instance: ${instanceName}. See firebase-debug.log for more details.`, {
                code: 2,
                original: err,
            });
        }
    });
}
exports.getDatabaseInstanceDetails = getDatabaseInstanceDetails;
function createInstance(projectId, instanceName, location) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield api.request("POST", `/${MGMT_API_VERSION}/projects/${projectId}/locations/${location}/instances?databaseId=${instanceName}`, {
                auth: true,
                origin: api.rtdbManagementOrigin,
                timeout: TIMEOUT_MILLIS,
            });
            return convertDatabaseInstance(response.body);
        }
        catch (err) {
            logger.debug(err.message);
            return utils.reject(`Failed to create instance: ${instanceName}. See firebase-debug.log for more details.`, {
                code: 2,
                original: err,
            });
        }
    });
}
exports.createInstance = createInstance;
function parseDatabaseLocation(location, defaultLocation) {
    if (!location) {
        return defaultLocation;
    }
    switch (location.toLowerCase()) {
        case "europe-west1":
            return DatabaseLocation.EUROPE_WEST1;
        case "asia-southeast1":
            return DatabaseLocation.ASIA_SOUTHEAST1;
        case "us-central1":
            return DatabaseLocation.US_CENTRAL1;
        case "":
            return defaultLocation;
        default:
            throw new error_1.FirebaseError(`Unexpected location value: ${location}. Only us-central1, europe-west1, and asia-southeast1 locations are supported`);
    }
}
exports.parseDatabaseLocation = parseDatabaseLocation;
function listDatabaseInstances(projectId, location, pageSize = APP_LIST_PAGE_SIZE) {
    return __awaiter(this, void 0, void 0, function* () {
        const instances = [];
        try {
            let nextPageToken = "";
            do {
                const pageTokenQueryString = nextPageToken ? `&pageToken=${nextPageToken}` : "";
                const response = yield api.request("GET", `/${MGMT_API_VERSION}/projects/${projectId}/locations/${location}/instances?pageSize=${pageSize}${pageTokenQueryString}`, {
                    auth: true,
                    origin: api.rtdbManagementOrigin,
                    timeout: TIMEOUT_MILLIS,
                });
                if (response.body.instances) {
                    instances.push(...response.body.instances.map(convertDatabaseInstance));
                }
                nextPageToken = response.body.nextPageToken;
            } while (nextPageToken);
            return instances;
        }
        catch (err) {
            logger.debug(err.message);
            throw new error_1.FirebaseError(`Failed to list Firebase Realtime Database instances${location === DatabaseLocation.ANY ? "" : ` for location ${location}`}` + ". See firebase-debug.log for more info.", {
                exit: 2,
                original: err,
            });
        }
    });
}
exports.listDatabaseInstances = listDatabaseInstances;
function convertDatabaseInstance(serverInstance) {
    if (!serverInstance.name) {
        throw new error_1.FirebaseError(`DatabaseInstance response is missing field "name"`);
    }
    const m = serverInstance.name.match(INSTANCE_RESOURCE_NAME_REGEX);
    if (!m || m.length != 4) {
        throw new error_1.FirebaseError(`Error parsing instance resource name: ${serverInstance.name}, matches: ${m}`);
    }
    return {
        name: m[3],
        location: parseDatabaseLocation(m[2], DatabaseLocation.ANY),
        project: serverInstance.project,
        databaseUrl: serverInstance.databaseUrl,
        type: serverInstance.type,
        state: serverInstance.state,
    };
}
