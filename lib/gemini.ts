/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const MODEL_NAME = "gemini-3.8-flash"; 

export const HOME_TOOLS = [
    {
        functionDeclarations: [
            {
                name: 'delete_item',
                description: 'Call this function for EACH item (application or folder) that has an "X" or cross drawn over it. If multiple items are crossed out, call this function multiple times.',
                parameters: {
                    type: 'OBJECT',
                    required: ['itemName'],
                    properties: {
                        itemName: { type: 'STRING', description: 'The exact name of the item to delete as seen on screen.' },
                    },
                },
            },
            {
                name: 'explode_folder',
                description: 'Call this when the user draws outward pointing arrows from a folder to "explode" it and show its contents.',
                parameters: {
                    type: 'OBJECT',
                    required: ['folderName'],
                    properties: {
                        folderName: { type: 'STRING', description: 'The exact name of the folder to explode as seen on screen.' },
                    },
                },
            },
            {
                name: 'explain_item',
                description: 'Call this when the user draws a question mark "?" over an item (or nearby an item). If it is a folder, it will summarize its contents. If it is a text file, it will summarize its text content.',
                parameters: {
                    type: 'OBJECT',
                    required: ['itemName'],
                    properties: {
                        itemName: { type: 'STRING', description: 'The name of the item (app or folder) to explain.' },
                    },
                },
            },
            {
                name: 'change_background',
                description: 'Call this when the user draws a sketch on the empty desktop background (not specifically targeting an app icon), intending to turn that sketch into a new wallpaper. Do NOT call this if the sketch is clearly trying to interact with an existing icon (like crossing it out).',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        sketch_description: { type: 'STRING', description: 'A short description of what the sketch appears to be, to help generating the wallpaper (e.g., "mountains", "flower", "abstract curves").' },
                    },
                },
            },
        ],
    },
];

export const MAIL_TOOLS = [
    {
        functionDeclarations: [
            {
                name: 'delete_email',
                description: 'Call this when the user draws a line through (strikes out) or an "X" over an email row in the list to delete it. Call multiple times if multiple emails are struck out.',
                parameters: {
                    type: 'OBJECT',
                    required: ['subject_text'],
                    properties: {
                        subject_text: { type: 'STRING', description: 'Distinct text from the subject line of the email.' },
                        sender_text: { type: 'STRING', description: 'The name of the sender of the email.' },
                    },
                },
            },
            {
                name: 'summarize_email',
                description: 'Call this when the user draws a question mark "?" over email row(s) or highlights them. This will summarize the BODY of the email(s) concisely. CRITICAL: If the gesture covers MULTIPLE emails, you MUST generate MULTIPLE SEPARATE calls to this function, one for EACH email covered by the gesture.',
                parameters: {
                    type: 'OBJECT',
                    required: ['subject_text'],
                    properties: {
                        subject_text: { type: 'STRING', description: 'Distinct text from the subject line of the email to summarize.' },
                        sender_text: { type: 'STRING', description: 'The name of the sender of the email.' },
                    },
                },
            },
        ]
    }
];

export const SYSTEM_INSTRUCTION = `You are Open Agent OS Ink, an intelligent assistant. 
The user interacts with the screen by drawing "ink" strokes (white lines) on top of the UI.
Your job is to interpret their intent based on standard symbols and the current active application context.
If the user has drawn multiple distinct symbols (like multiple 'X's on different items), you MUST call the appropriate tool multiple times, once for each distinct user intent.
`;

export async function executeServerInkAction(payload: {
    base64Image: string;
    contextDescription: string;
    tools: any[];
    systemInstruction: string;
}) {
    const res = await fetch('/api/ink/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }

    return await res.json();
}