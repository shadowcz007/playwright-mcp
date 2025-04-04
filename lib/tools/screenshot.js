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
Object.defineProperty(exports, "__esModule", { value: true });
exports.type = exports.drag = exports.click = exports.moveMouse = exports.screenshot = void 0;
const zod_1 = require("zod");
const zod_to_json_schema_1 = require("zod-to-json-schema");
exports.screenshot = {
    schema: {
        name: 'browser_screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(zod_1.z.object({})),
    },
    handle: async (context) => {
        const tab = context.currentTab();
        const screenshot = await tab.page.screenshot({ type: 'jpeg', quality: 50, scale: 'css' });
        return {
            content: [{ type: 'image', data: screenshot.toString('base64'), mimeType: 'image/jpeg' }],
        };
    },
};
const elementSchema = zod_1.z.object({
    element: zod_1.z.string().describe('Human-readable element description used to obtain permission to interact with the element'),
});
const moveMouseSchema = elementSchema.extend({
    x: zod_1.z.number().describe('X coordinate'),
    y: zod_1.z.number().describe('Y coordinate'),
});
exports.moveMouse = {
    schema: {
        name: 'browser_move_mouse',
        description: 'Move mouse to a given position',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(moveMouseSchema),
    },
    handle: async (context, params) => {
        const validatedParams = moveMouseSchema.parse(params);
        const tab = context.currentTab();
        await tab.page.mouse.move(validatedParams.x, validatedParams.y);
        return {
            content: [{ type: 'text', text: `Moved mouse to (${validatedParams.x}, ${validatedParams.y})` }],
        };
    },
};
const clickSchema = elementSchema.extend({
    x: zod_1.z.number().describe('X coordinate'),
    y: zod_1.z.number().describe('Y coordinate'),
});
exports.click = {
    schema: {
        name: 'browser_click',
        description: 'Click left mouse button',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(clickSchema),
    },
    handle: async (context, params) => {
        return await context.currentTab().runAndWait(async (tab) => {
            const validatedParams = clickSchema.parse(params);
            await tab.page.mouse.move(validatedParams.x, validatedParams.y);
            await tab.page.mouse.down();
            await tab.page.mouse.up();
        }, {
            status: 'Clicked mouse',
        });
    },
};
const dragSchema = elementSchema.extend({
    startX: zod_1.z.number().describe('Start X coordinate'),
    startY: zod_1.z.number().describe('Start Y coordinate'),
    endX: zod_1.z.number().describe('End X coordinate'),
    endY: zod_1.z.number().describe('End Y coordinate'),
});
exports.drag = {
    schema: {
        name: 'browser_drag',
        description: 'Drag left mouse button',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(dragSchema),
    },
    handle: async (context, params) => {
        const validatedParams = dragSchema.parse(params);
        return await context.currentTab().runAndWait(async (tab) => {
            await tab.page.mouse.move(validatedParams.startX, validatedParams.startY);
            await tab.page.mouse.down();
            await tab.page.mouse.move(validatedParams.endX, validatedParams.endY);
            await tab.page.mouse.up();
        }, {
            status: `Dragged mouse from (${validatedParams.startX}, ${validatedParams.startY}) to (${validatedParams.endX}, ${validatedParams.endY})`,
        });
    },
};
const typeSchema = zod_1.z.object({
    text: zod_1.z.string().describe('Text to type into the element'),
    submit: zod_1.z.boolean().optional().describe('Whether to submit entered text (press Enter after)'),
});
exports.type = {
    schema: {
        name: 'browser_type',
        description: 'Type text',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(typeSchema),
    },
    handle: async (context, params) => {
        const validatedParams = typeSchema.parse(params);
        return await context.currentTab().runAndWait(async (tab) => {
            await tab.page.keyboard.type(validatedParams.text);
            if (validatedParams.submit)
                await tab.page.keyboard.press('Enter');
        }, {
            status: `Typed text "${validatedParams.text}"`,
        });
    },
};
