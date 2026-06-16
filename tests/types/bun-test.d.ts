/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'bun:test' {
  type TestCallback = (...args: any[]) => void | Promise<void>;
  type TestFunction = ((name: string, callback: TestCallback) => void) & {
    each: (cases: readonly any[]) => (name: string, callback: TestCallback) => void;
  };

  export const describe: TestFunction;
  export const test: TestFunction;
  export const it: TestFunction;
  export const beforeEach: (callback: TestCallback) => void;
  export const afterEach: (callback: TestCallback) => void;
  export const beforeAll: (callback: TestCallback) => void;
  export const afterAll: (callback: TestCallback) => void;

  export const expect: any;
  export const mock: any;
}
