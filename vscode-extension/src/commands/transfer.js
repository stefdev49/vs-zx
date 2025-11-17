"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const vscode_1 = require("vscode");
const path = __importStar(require("path"));
// Import converter and rs232 modules (when built)
const converter = require('../out/converter/index');
const rs232 = require('../out/rs232-transfer/index');
function register() {
    const disposable = vscode_1.commands.registerCommand('zx-basic.transfer', async () => {
        const editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            vscode_1.window.showErrorMessage('No active editor');
            return;
        }
        const document = editor.document;
        if (document.languageId !== 'zx-basic') {
            vscode_1.window.showErrorMessage('Not a ZX BASIC file');
            return;
        }
        // Save the document first
        await document.save();
        const content = document.getText();
        const fileName = path.basename(document.fileName, '.bas') || path.basename(document.fileName, '.zxbas');
        vscode_1.window.showInformationMessage('Converting and transferring to ZX Spectrum...');
        try {
            // Convert BASIC to binary
            const binary = converter.convertToBinary(content);
            // Get config for serial port
            const config = vscode_1.workspace.getConfiguration('zx-basic');
            const port = config.get('serialPort', '/dev/ttyUSB0');
            const baudRate = config.get('baudRate', 9600);
            // Transfer via RS232
            await rs232.transfer(binary, port, baudRate);
            vscode_1.window.showInformationMessage(`Successfully transferred ${fileName} to ZX Spectrum`);
        }
        catch (error) {
            const err = error;
            vscode_1.window.showErrorMessage(`Transfer failed: ${err.message}`);
        }
    });
    return disposable;
}
exports.register = register;
//# sourceMappingURL=transfer.js.map