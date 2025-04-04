"use strict";
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.install = exports.chooseFile = exports.close = exports.pdf = exports.pressKey = exports.wait = exports.goForward = exports.goBack = exports.navigate = void 0;
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const zod_to_json_schema_1 = require("zod-to-json-schema");
const utils_1 = require("./utils");
const navigateSchema = zod_1.z.object({
    url: zod_1.z.string().describe('The URL to navigate to'),
});
const navigate = captureSnapshot => ({
    schema: {
        name: 'browser_navigate',
        description: 'Navigate to a URL',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(navigateSchema),
    },
    handle: async (context, params) => {
        const validatedParams = navigateSchema.parse(params);
        const currentTab = await context.ensureTab();
        return await currentTab.run(async (tab) => {
            await tab.navigate(validatedParams.url);
        }, {
            status: `Navigated to ${validatedParams.url}`,
            captureSnapshot,
        });
    },
});
exports.navigate = navigate;
const goBackSchema = zod_1.z.object({});
const goBack = snapshot => ({
    schema: {
        name: 'browser_go_back',
        description: 'Go back to the previous page',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(goBackSchema),
    },
    handle: async (context) => {
        return await context.currentTab().runAndWait(async (tab) => {
            await tab.page.goBack();
        }, {
            status: 'Navigated back',
            captureSnapshot: snapshot,
        });
    },
});
exports.goBack = goBack;
const goForwardSchema = zod_1.z.object({});
const goForward = snapshot => ({
    schema: {
        name: 'browser_go_forward',
        description: 'Go forward to the next page',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(goForwardSchema),
    },
    handle: async (context) => {
        return await context.currentTab().runAndWait(async (tab) => {
            await tab.page.goForward();
        }, {
            status: 'Navigated forward',
            captureSnapshot: snapshot,
        });
    },
});
exports.goForward = goForward;
const waitSchema = zod_1.z.object({
    time: zod_1.z.number().describe('The time to wait in seconds'),
});
exports.wait = {
    schema: {
        name: 'browser_wait',
        description: 'Wait for a specified time in seconds',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(waitSchema),
    },
    handle: async (context, params) => {
        const validatedParams = waitSchema.parse(params);
        await new Promise(f => setTimeout(f, Math.min(10000, validatedParams.time * 1000)));
        return {
            content: [{
                    type: 'text',
                    text: `Waited for ${validatedParams.time} seconds`,
                }],
        };
    },
};
const pressKeySchema = zod_1.z.object({
    key: zod_1.z.string().describe('Name of the key to press or a character to generate, such as `ArrowLeft` or `a`'),
});
const pressKey = captureSnapshot => ({
    schema: {
        name: 'browser_press_key',
        description: 'Press a key on the keyboard',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(pressKeySchema),
    },
    handle: async (context, params) => {
        const validatedParams = pressKeySchema.parse(params);
        return await context.currentTab().runAndWait(async (tab) => {
            await tab.page.keyboard.press(validatedParams.key);
        }, {
            status: `Pressed key ${validatedParams.key}`,
            captureSnapshot,
        });
    },
});
exports.pressKey = pressKey;
const pdfSchema = zod_1.z.object({});
exports.pdf = {
    schema: {
        name: 'browser_save_as_pdf',
        description: 'Save page as PDF',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(pdfSchema),
    },
    handle: async (context) => {
        const tab = context.currentTab();
        const fileName = path_1.default.join(os_1.default.tmpdir(), (0, utils_1.sanitizeForFilePath)(`page-${new Date().toISOString()}`)) + '.pdf';
        await tab.page.pdf({ path: fileName });
        return {
            content: [{
                    type: 'text',
                    text: `Saved as ${fileName}`,
                }],
        };
    },
};
const closeSchema = zod_1.z.object({});
exports.close = {
    schema: {
        name: 'browser_close',
        description: 'Close the page',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(closeSchema),
    },
    handle: async (context) => {
        await context.close();
        return {
            content: [{
                    type: 'text',
                    text: `Page closed`,
                }],
        };
    },
};
const chooseFileSchema = zod_1.z.object({
    paths: zod_1.z.array(zod_1.z.string()).describe('The absolute paths to the files to upload. Can be a single file or multiple files.'),
});
const chooseFile = captureSnapshot => ({
    schema: {
        name: 'browser_choose_file',
        description: 'Choose one or multiple files to upload',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(chooseFileSchema),
    },
    handle: async (context, params) => {
        const validatedParams = chooseFileSchema.parse(params);
        const tab = context.currentTab();
        return await tab.runAndWait(async () => {
            await tab.submitFileChooser(validatedParams.paths);
        }, {
            status: `Chose files ${validatedParams.paths.join(', ')}`,
            captureSnapshot,
            noClearFileChooser: true,
        });
    },
});
exports.chooseFile = chooseFile;
exports.install = {
    schema: {
        name: 'browser_install',
        description: 'Install the browser specified in the config. Call this if you get an error about the browser not being installed.',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(zod_1.z.object({})),
    },
    handle: async (context) => {
        const channel = await context.install();
        return {
            content: [{
                    type: 'text',
                    text: `Browser ${channel} installed`,
                }],
        };
    },
};
