# VS-ZX Features Roadmap

_Last updated: 29 November 2025_

This document captures the current capability set of the ZX BASIC language server/VS Code extension and outlines high-impact additions to pursue next.

---

## 1. Shipped Functionality

| Area | Highlights |
| --- | --- |
| **Parsing & Analysis** | Complete ZX BASIC statement parser (LET, PRINT, INPUT, IF, FOR, DIM, GOTO/GOSUB, READ/DATA). Accurate line-number validation, duplicate detection, and flow-control checks (missing NEXT/RETURN). |
| **Completions & Hovers** | Context-aware keyword/function completion with ZX model filtering (48K/128K/Interface 1), variable and line-number suggestions, snippet library, hover docs including types and signatures. |
| **Signature Help** | Commands and functions (PRINT, INPUT, graphics routines, sound, FOR/DIM/etc.) provide structured parameter hints. |
| **Diagnostics** | Syntax + semantic checks (invalid line numbers, type mismatches, undeclared arrays, control-flow mismatches, color range issues). Configurable via `zxBasic.*` settings. |
| **Navigation** | Document symbols, go-to-definition and references for line numbers and subroutines, rename refactoring (variables/line numbers), call hierarchy, folding ranges, semantic tokens. |
| **Code Actions** | Add/renumber line numbers, insert missing RETURN/NEXT, suggest DIM, uppercase keywords. |
| **Formatting** | Full document formatter that normalizes spacing, uppercases keywords, renumbers lines, and rewrites GOTO/GOSUB targets to match new numbers. |
| **Configuration** | Extension settings for target model, strict mode, line-increment, max line length, automatic keyword uppercasing. |

---

## 2. Proposed Enhancements

| Priority | Proposal | Description & Benefit | Action Breakdown |
| --- | --- | --- | --- |
| 🔷 High | **Workspace Awareness** | Add workspace-symbol search and cross-file analysis (LOAD/MERGE references, shared DATA/READ validation) so multi-file ZX projects get consistent diagnostics and navigation. | 1) Add LSP workspace symbol provider using parsed line numbers/labels. 2) Maintain per-workspace index of READ/DATA, DIM, and subroutines; surface diagnostics when files disagree. 3) Introduce settings for multi-file INCLUDE roots and update tests with multi-document scenarios. |
| 🔷 High | **Real-Hardware Integration** | Surface existing Interface 1/RS-232 tooling inside VS Code: commands to capture `LLIST` output, push TAP/TZX binaries, or monitor serial transfers directly from the extension. | 1) Wrap `rs232-transfer/scripts` in VS Code commands with process management/telemetry. 2) Provide status bar indicators for active serial sessions; stream output into a dedicated channel. 3) Add quick-pick actions (Upload TAP, Capture LLIST) with configuration for serial port/baud. |
| 🔷 Medium | **ZX-Specific Lint Rules** | Extend diagnostics with stricter Spectrum constraints (printer-friendly line widths, model-specific memory/layout warnings, array bounds per model) to catch issues beyond syntax. | 1) Add rules engine keyed by `zxBasic.model` (e.g., warn when 128K-only commands in 48K mode). 2) Track cumulative DATA sizes vs. memory budget. 3) Provide configuration toggles + documentation for each lint, and add unit tests referencing real listings. |
| 🔷 Medium | **Advanced Refactorings** | Implement transformations such as extracting subroutines, converting `IF ... THEN GOTO` to structured patterns, or inlining DATA blocks, helping modernize legacy listings. | 1) Build AST-to-AST transformers leveraging the existing parser. 2) Offer code actions (e.g., "Extract subroutine" uses selected lines, inserts new line number block, rewrites GOTO). 3) Include preview diffs + undo-safe workspace edits. |
| 🔷 Medium | **Tape/Binary Preview Pipeline** | Integrate the converter output so building a `.tap` emits diagnostics and preview info (size, autostart line) inside VS Code; link errors back to source via problem matchers. | 1) Expose converter API via LSP/extension command ("Build TAP"). 2) Capture warnings/errors and convert to VS Code diagnostics. 3) Show metadata (bytes, autostart) in panel and provide quick-open to generated files. |
| ◻️ Future | **Inline Emulator Hooks** | (Stretch) Wire simple emulator commands (run, break on line) to accelerate testing from the editor. | 1) Investigate lightweight emulator CLI integration (Fuse? ZEsarUX). 2) Define run configurations (run current file, break at line). 3) Add settings for emulator path/flags; ensure licensing compliance. |

---

## 3. Next Steps

1. **Scoping** – Break each proposal into GitHub issues with design notes, acceptance tests, telemetry requirements, and owner assignments.
2. **User Validation** – Poll current ZX BASIC users (Discord/email) to rank the High priority set and vet the lint/refactor ideas.
3. **Milestone Planning** – Target Q1’26 for workspace awareness + hardware commands; Q2’26 for lint/refactor/tape pipeline; revisit emulator hooks afterward.
4. **Documentation** – Update README, marketplace listing, and in-product welcome page as features land; add screenshots/GIFs per major UX improvement.

Feedback and additional ideas are welcome—please add comments to this file or open an issue.
