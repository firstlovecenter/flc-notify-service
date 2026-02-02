"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSpaces = exports.validateRequest = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateRequest = (request, requiredFields) => {
    const missingFields = requiredFields.filter((field) => !request[field]);
    if (missingFields.length > 0) {
        return `Missing fields: ${missingFields.join(', ')}`;
    }
    return null;
};
exports.validateRequest = validateRequest;
const removeSpaces = (str) => str.replace(/\s/g, '');
exports.removeSpaces = removeSpaces;
