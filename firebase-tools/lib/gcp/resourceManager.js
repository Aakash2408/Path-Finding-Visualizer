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
exports.addServiceAccountToRoles = exports.setIamPolicy = exports.getIamPolicy = exports.firebaseRoles = void 0;
const lodash_1 = require("lodash");
const api = require("../api");
const iam_1 = require("./iam");
const API_VERSION = "v1";
exports.firebaseRoles = {
    hostingAdmin: "roles/firebasehosting.admin",
    apiKeysViewer: "roles/serviceusage.apiKeysViewer",
    runViewer: "roles/run.viewer",
};
function getIamPolicy(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield api.request("POST", `/${API_VERSION}/projects/${projectId}:getIamPolicy`, {
            auth: true,
            origin: api.resourceManagerOrigin,
        });
        return response.body;
    });
}
exports.getIamPolicy = getIamPolicy;
function setIamPolicy(projectId, newPolicy, updateMask) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield api.request("POST", `/${API_VERSION}/projects/${projectId}:setIamPolicy`, {
            auth: true,
            origin: api.resourceManagerOrigin,
            data: {
                policy: newPolicy,
                updateMask: updateMask,
            },
        });
        return response.body;
    });
}
exports.setIamPolicy = setIamPolicy;
function addServiceAccountToRoles(projectId, serviceAccountName, roles) {
    return __awaiter(this, void 0, void 0, function* () {
        const [{ name: fullServiceAccountName }, projectPolicy] = yield Promise.all([
            iam_1.getServiceAccount(projectId, serviceAccountName),
            getIamPolicy(projectId),
        ]);
        const newMemberName = `serviceAccount:${fullServiceAccountName.split("/").pop()}`;
        roles.forEach((roleName) => {
            let bindingIndex = lodash_1.findIndex(projectPolicy.bindings, (binding) => binding.role === roleName);
            if (bindingIndex === -1) {
                bindingIndex =
                    projectPolicy.bindings.push({
                        role: roleName,
                        members: [],
                    }) - 1;
            }
            const binding = projectPolicy.bindings[bindingIndex];
            if (!binding.members.includes(newMemberName)) {
                binding.members.push(newMemberName);
            }
        });
        return setIamPolicy(projectId, projectPolicy, "bindings");
    });
}
exports.addServiceAccountToRoles = addServiceAccountToRoles;
