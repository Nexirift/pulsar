/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { spawn } from "node:child_process";

const tscArgs = [
	"-p",
	"src/tsconfig.json",
	"--watch",
	"--preserveWatchOutput",
	"--outDir",
	"built",
	"--tsBuildInfoFile",
	"built/tsconfig.lib.tsbuildinfo",
];

const tsc = spawn("tsc", tscArgs, {
	stdio: "inherit",
	shell: process.platform === "win32",
});

tsc.on("exit", (code) => {
	process.exit(code ?? 1);
});
