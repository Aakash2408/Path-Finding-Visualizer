"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthCloudFunction = void 0;
const registry_1 = require("../registry");
const types_1 = require("../types");
const request = require("request");
const emulatorLogger_1 = require("../emulatorLogger");
class AuthCloudFunction {
    constructor(projectId) {
        var _a, _b;
        this.projectId = projectId;
        this.logger = emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.AUTH);
        this.multicastEndpoint = "";
        this.enabled = false;
        const functionsEmulator = registry_1.EmulatorRegistry.get(types_1.Emulators.FUNCTIONS);
        if (functionsEmulator) {
            this.enabled = true;
            this.functionsEmulatorInfo = functionsEmulator.getInfo();
            this.multicastEndpoint = `http://${(_a = this.functionsEmulatorInfo) === null || _a === void 0 ? void 0 : _a.host}:${(_b = this.functionsEmulatorInfo) === null || _b === void 0 ? void 0 : _b.port}/functions/projects/${projectId}/trigger_multicast`;
        }
    }
    dispatch(action, user) {
        if (!this.enabled)
            return;
        const userInfoPayload = this.createUserInfoPayload(user);
        const multicastEventBody = this.createEventRequestBody(action, userInfoPayload);
        request.post(this.multicastEndpoint, {
            body: multicastEventBody,
            callback: (error, response) => {
                if (error || response.statusCode != 200) {
                    this.logger.logLabeled("WARN", "functions", `Firebase Authentication function was not triggered due to emulation error. Please file a bug.`);
                }
            },
        });
    }
    createEventRequestBody(action, userInfoPayload) {
        return JSON.stringify({
            eventType: `providers/firebase.auth/eventTypes/user.${action}`,
            data: userInfoPayload,
        });
    }
    createUserInfoPayload(user) {
        return {
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName,
            photoURL: user.photoUrl,
            phoneNumber: user.phoneNumber,
            disabled: user.disabled,
            passwordHash: user.passwordHash,
            tokensValidAfterTime: user.validSince,
            metadata: {
                creationTime: user.createdAt,
                lastSignInTime: user.lastLoginAt,
            },
            customClaims: JSON.parse(user.customAttributes || "{}"),
            providerData: user.providerUserInfo,
        };
    }
}
exports.AuthCloudFunction = AuthCloudFunction;
