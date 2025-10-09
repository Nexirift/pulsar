/*
* For a detailed explanation regarding each configuration property and type check, visit:
* https://jestjs.io/docs/en/configuration.html
*/

import base from './jest.config.ts';

export default {
	...base,
	globalSetup: '<rootDir>/test/jest.setup.unit.ts',
	testMatch: [
		"<rootDir>/test/unit/**/*.ts",
		"<rootDir>/src/**/*.test.ts",
	],
};
