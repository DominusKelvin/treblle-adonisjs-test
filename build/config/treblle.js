"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showErrors = exports.additionalFieldsToMask = exports.projectId = exports.apiKey = void 0;
const Env_1 = __importDefault(global[Symbol.for('ioc.use')]("Adonis/Core/Env"));
exports.apiKey = Env_1.default.get('TREBLLE_API_KEY');
exports.projectId = Env_1.default.get('TREBLLE_PROJECT_ID');
exports.additionalFieldsToMask = [];
exports.showErrors = true;
//# sourceMappingURL=treblle.js.map