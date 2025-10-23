/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { EnvService } from '@/global/EnvService.js';
import { LoggerService } from '@/core/LoggerService.js';
import { NativeTimeService } from '@/global/TimeService.js';

export const envService = new EnvService();

// eslint-disable-next-line no-restricted-globals
export const loggerService = new LoggerService(console, new NativeTimeService(), envService);
export const coreLogger = loggerService.getLogger('core', 'cyan');
