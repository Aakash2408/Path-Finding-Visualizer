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
exports.updateAuthDomains = exports.getAuthDomains = void 0;
const api = require("../api");
function getAuthDomains(project) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield api.request("GET", `/admin/v2/projects/${project}/config`, {
            auth: true,
            origin: api.identityOrigin,
        });
        return (_a = res === null || res === void 0 ? void 0 : res.body) === null || _a === void 0 ? void 0 : _a.authorizedDomains;
    });
}
exports.getAuthDomains = getAuthDomains;
function updateAuthDomains(project, authDomains) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield api.request("PATCH", `/admin/v2/projects/${project}/config?update_mask=authorizedDomains`, {
            auth: true,
            origin: api.identityOrigin,
            data: {
                authorizedDomains: authDomains,
            },
        });
        return (_a = resp === null || resp === void 0 ? void 0 : resp.body) === null || _a === void 0 ? void 0 : _a.authorizedDomains;
    });
}
exports.updateAuthDomains = updateAuthDomains;
