"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const errors_1 = require("../../common/errors");
const validate = (schema, target = 'body') => {
    return (req, _res, next) => {
        try {
            const data = schema.parse(req[target]);
            req[target] = data; // replace with parsed (and possibly transformed) data
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                    code: e.code,
                }));
                next(new errors_1.ValidationError('Validation failed', formattedErrors));
                return;
            }
            next(error);
        }
    };
};
exports.validate = validate;
