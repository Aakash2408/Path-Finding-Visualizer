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
exports.testIamPermissions = exports.testResourceIamPermissions = exports.getRole = exports.deleteServiceAccount = exports.createServiceAccountKey = exports.getServiceAccount = exports.createServiceAccount = void 0;
const api = require("../api");
const utils_1 = require("../utils");
const lodash_1 = require("lodash");
const logger_1 = require("../logger");
const API_VERSION = "v1";
function createServiceAccount(projectId, accountId, description, displayName) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield api.request("POST", `/${API_VERSION}/projects/${projectId}/serviceAccounts`, {
            auth: true,
            origin: api.iamOrigin,
            data: {
                accountId,
                serviceAccount: {
                    displayName,
                    description,
                },
            },
        });
        return response.body;
    });
}
exports.createServiceAccount = createServiceAccount;
function getServiceAccount(projectId, serviceAccountName) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield api.request("GET", `/${API_VERSION}/projects/${projectId}/serviceAccounts/${serviceAccountName}@${projectId}.iam.gserviceaccount.com`, {
            auth: true,
            origin: api.iamOrigin,
        });
        return response.body;
    });
}
exports.getServiceAccount = getServiceAccount;
function createServiceAccountKey(projectId, serviceAccountName) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield api.request("POST", `/${API_VERSION}/projects/${projectId}/serviceAccounts/${serviceAccountName}@${projectId}.iam.gserviceaccount.com/keys`, {
            auth: true,
            origin: api.iamOrigin,
            data: {
                keyAlgorithm: "KEY_ALG_UNSPECIFIED",
                privateKeyType: "TYPE_GOOGLE_CREDENTIALS_FILE",
            },
        });
        return response.body;
    });
}
exports.createServiceAccountKey = createServiceAccountKey;
function deleteServiceAccount(projectId, accountEmail) {
    return api.request("DELETE", `/${API_VERSION}/projects/${projectId}/serviceAccounts/${accountEmail}`, {
        auth: true,
        origin: api.iamOrigin,
        resolveOnHTTPError: true,
    });
}
exports.deleteServiceAccount = deleteServiceAccount;
function getRole(role) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield api.request("GET", utils_1.endpoint([API_VERSION, "roles", role]), {
            auth: true,
            origin: api.iamOrigin,
            retryCodes: [500, 503],
        });
        return response.body;
    });
}
exports.getRole = getRole;
function testResourceIamPermissions(origin, apiVersion, resourceName, permissions) {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.env.FIREBASE_SKIP_INFORMATIONAL_IAM) {
            logger_1.debug("[iam] skipping informational check of permissions", JSON.stringify(permissions), "on resource", resourceName);
            return { allowed: permissions, missing: [], passed: true };
        }
        const response = yield api.request("POST", `/${apiVersion}/${resourceName}:testIamPermissions`, {
            auth: true,
            data: { permissions },
            origin,
        });
        const allowed = (response.body.permissions || []).sort();
        const missing = lodash_1.difference(permissions, allowed);
        return {
            allowed,
            missing,
            passed: missing.length === 0,
        };
    });
}
exports.testResourceIamPermissions = testResourceIamPermissions;
function testIamPermissions(projectId, permissions) {
    return __awaiter(this, void 0, void 0, function* () {
        return testResourceIamPermissions(api.resourceManagerOrigin, "v1", `projects/${projectId}`, permissions);
    });
}
exports.testIamPermissions = testIamPermissions;
