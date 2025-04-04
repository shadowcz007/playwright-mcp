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
exports.closeTab = exports.newTab = exports.selectTab = exports.listTabs = void 0;
const zod_1 = require("zod");
const zod_to_json_schema_1 = require("zod-to-json-schema");
exports.listTabs = {
    schema: {
        name: 'browser_list_tabs',
        description: 'List browser tabs',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(zod_1.z.object({})),
    },
    handle: async (context) => {
        return {
            content: [{
                    type: 'text',
                    text: await context.listTabs(),
                }],
        };
    },
};
const selectTabSchema = zod_1.z.object({
    index: zod_1.z.number().describe('The index of the tab to select'),
});
const selectTab = captureSnapshot => ({
    schema: {
        name: 'browser_select_tab',
        description: 'Select a tab by index',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(selectTabSchema),
    },
    handle: async (context, params) => {
        const validatedParams = selectTabSchema.parse(params);
        await context.selectTab(validatedParams.index);
        const currentTab = await context.ensureTab();
        return await currentTab.run(async () => { }, { captureSnapshot });
    },
});
exports.selectTab = selectTab;
const newTabSchema = zod_1.z.object({
    url: zod_1.z.string().optional().describe('The URL to navigate to in the new tab. If not provided, the new tab will be blank.'),
});
exports.newTab = {
    schema: {
        name: 'browser_new_tab',
        description: 'Open a new tab',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(newTabSchema),
    },
    handle: async (context, params) => {
        const validatedParams = newTabSchema.parse(params);
        await context.newTab();
        if (validatedParams.url)
            await context.currentTab().navigate(validatedParams.url);
        return await context.currentTab().run(async () => { }, { captureSnapshot: true });
    },
};
const closeTabSchema = zod_1.z.object({
    index: zod_1.z.number().optional().describe('The index of the tab to close. Closes current tab if not provided.'),
});
const closeTab = captureSnapshot => ({
    schema: {
        name: 'browser_close_tab',
        description: 'Close a tab',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(closeTabSchema),
    },
    handle: async (context, params) => {
        const validatedParams = closeTabSchema.parse(params);
        await context.closeTab(validatedParams.index);
        const currentTab = await context.currentTab();
        if (currentTab)
            return await currentTab.run(async () => { }, { captureSnapshot });
        return {
            content: [{
                    type: 'text',
                    text: await context.listTabs(),
                }],
        };
    },
});
exports.closeTab = closeTab;
