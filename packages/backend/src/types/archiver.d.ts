declare module "archiver" {
	import type { Transform } from "node:stream";
	import type { ZlibOptions } from "node:zlib";

	export interface ArchiverOptions {
		zlib?: ZlibOptions;
		[option: string]: unknown;
	}

	export class Archiver extends Transform {
		abort(): this;
		append(source: NodeJS.ReadableStream | Buffer | string, data?: Record<string, unknown>): this;
		directory(dirpath: string, destpath: false | string, data?: Record<string, unknown>): this;
		file(filename: string, data: Record<string, unknown>): this;
		finalize(): Promise<void>;
		pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
		on(event: "error" | "warning", listener: (error: Error) => void): this;
	}

	export class ZipArchive extends Archiver {
		constructor(options?: ArchiverOptions);
	}

	export class TarArchive extends Archiver {
		constructor(options?: ArchiverOptions);
	}

	export class JsonArchive extends Archiver {
		constructor(options?: ArchiverOptions);
	}
}
