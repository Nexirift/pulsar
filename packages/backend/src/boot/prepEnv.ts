/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { EventEmitter } from 'node:events';

/**
 * Configures Node.JS global runtime options for values appropriate for Sharkey.
 */
export function prepEnv() {
	// Increase maximum stack trace length.
	// This helps diagnose infinite recursion bugs.
	Error.stackTraceLimit = Infinity;

	// Avoid warnings like "11 message listeners added to [Commander]. MaxListeners is 10."
	// This is expected due to use of NestJS lifecycle hooks.
	EventEmitter.defaultMaxListeners = 128;
}
