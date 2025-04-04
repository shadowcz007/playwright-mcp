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
exports.screenshot = exports.selectOption = exports.type = exports.hover = exports.drag = exports.click = exports.snapshot = void 0;
const zod_1 = require("zod");
const zod_to_json_schema_1 = __importDefault(require("zod-to-json-schema"));
exports.snapshot = {
    schema: {
        name: 'browser_snapshot',
        description: 'Capture accessibility snapshot of the current page, this is better than screenshot',
        inputSchema: (0, zod_to_json_schema_1.default)(zod_1.z.object({})),
    },
    handle: async (context) => {
        return await context.currentTab().run(async () => { }, { captureSnapshot: true });
    },
};
const elementSchema = zod_1.z.object({
    element: zod_1.z.string().describe('Human-readable element description used to obtain permission to interact with the element'),
    ref: zod_1.z.string().describe('Exact target element reference from the page snapshot'),
});
exports.click = {
    schema: {
        name: 'browser_click',
        description: 'Perform click on a web page',
        inputSchema: (0, zod_to_json_schema_1.default)(elementSchema),
    },
    handle: async (context, params) => {
        const validatedParams = elementSchema.parse(params);
        return await context.currentTab().runAndWaitWithSnapshot(async (tab) => {
            const locator = tab.lastSnapshot().refLocator(validatedParams.ref);
            await locator.click();
        }, {
            status: `Clicked "${validatedParams.element}"`,
        });
    },
};
const dragSchema = zod_1.z.object({
    startElement: zod_1.z.string().describe('Human-readable source element description used to obtain the permission to interact with the element'),
    startRef: zod_1.z.string().describe('Exact source element reference from the page snapshot'),
    endElement: zod_1.z.string().describe('Human-readable target element description used to obtain the permission to interact with the element'),
    endRef: zod_1.z.string().describe('Exact target element reference from the page snapshot'),
});
exports.drag = {
    schema: {
        name: 'browser_drag',
        description: 'Perform drag and drop between two elements',
        inputSchema: (0, zod_to_json_schema_1.default)(dragSchema),
    },
    handle: async (context, params) => {
        const validatedParams = dragSchema.parse(params);
        return await context.currentTab().runAndWaitWithSnapshot(async (tab) => {
            const startLocator = tab.lastSnapshot().refLocator(validatedParams.startRef);
            const endLocator = tab.lastSnapshot().refLocator(validatedParams.endRef);
            await startLocator.dragTo(endLocator);
        }, {
            status: `Dragged "${validatedParams.startElement}" to "${validatedParams.endElement}"`,
        });
    },
};
exports.hover = {
    schema: {
        name: 'browser_hover',
        description: 'Hover over element on page',
        inputSchema: (0, zod_to_json_schema_1.default)(elementSchema),
    },
    handle: async (context, params) => {
        const validatedParams = elementSchema.parse(params);
        return await context.currentTab().runAndWaitWithSnapshot(async (tab) => {
            const locator = tab.lastSnapshot().refLocator(validatedParams.ref);
            await locator.hover();
        }, {
            status: `Hovered over "${validatedParams.element}"`,
        });
    },
};
const typeSchema = elementSchema.extend({
    text: zod_1.z.string().describe('Text to type into the element'),
    submit: zod_1.z.boolean().optional().describe('Whether to submit entered text (press Enter after)'),
    slowly: zod_1.z.boolean().optional().describe('Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.'),
});
exports.type = {
    schema: {
        name: 'browser_type',
        description: 'Type text into editable element',
        inputSchema: (0, zod_to_json_schema_1.default)(typeSchema),
    },
    handle: async (context, params) => {
        const validatedParams = typeSchema.parse(params);
        return await context.currentTab().runAndWaitWithSnapshot(async (tab) => {
            const locator = tab.lastSnapshot().refLocator(validatedParams.ref);
            if (validatedParams.slowly)
                await locator.pressSequentially(validatedParams.text);
            else
                await locator.fill(validatedParams.text);
            if (validatedParams.submit)
                await locator.press('Enter');
        }, {
            status: `Typed "${validatedParams.text}" into "${validatedParams.element}"`,
        });
    },
};
const selectOptionSchema = elementSchema.extend({
    values: zod_1.z.array(zod_1.z.string()).describe('Array of values to select in the dropdown. This can be a single value or multiple values.'),
});
exports.selectOption = {
    schema: {
        name: 'browser_select_option',
        description: 'Select an option in a dropdown',
        inputSchema: (0, zod_to_json_schema_1.default)(selectOptionSchema),
    },
    handle: async (context, params) => {
        const validatedParams = selectOptionSchema.parse(params);
        return await context.currentTab().runAndWaitWithSnapshot(async (tab) => {
            const locator = tab.lastSnapshot().refLocator(validatedParams.ref);
            await locator.selectOption(validatedParams.values);
        }, {
            status: `Selected option in "${validatedParams.element}"`,
        });
    },
};
const screenshotSchema = zod_1.z.object({
    raw: zod_1.z.boolean().optional().describe('Whether to return without compression (in PNG format). Default is false, which returns a JPEG image.'),
});
exports.screenshot = {
    schema: {
        name: 'browser_take_screenshot',
        description: `Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.`,
        inputSchema: (0, zod_to_json_schema_1.default)(screenshotSchema),
    },
    handle: async (context, params) => {
        const validatedParams = screenshotSchema.parse(params);
        const tab = context.currentTab();
        const options = validatedParams.raw ? { type: 'png', scale: 'css' } : { type: 'jpeg', quality: 50, scale: 'css' };
        const screenshot = await tab.page.screenshot(options);
        return {
            content: [{ type: 'image', data: screenshot.toString('base64'), mimeType: validatedParams.raw ? 'image/png' : 'image/jpeg' }],
        };
    },
};
