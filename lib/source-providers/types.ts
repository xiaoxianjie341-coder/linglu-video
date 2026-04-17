export type SourceProviderKind = "plain-web" | "x" | "xiaohongshu";

export interface SourceProviderResult {
  provider: SourceProviderKind;
  text: string;
}

export type SourceProvider = (url: string) => Promise<SourceProviderResult>;

export interface SourceProviderRuntime {
  plainWeb: SourceProvider;
  x: SourceProvider;
  xiaohongshu: SourceProvider;
}

export class SourceProviderFailure extends Error {
  provider: SourceProviderKind;
  detail?: string;

  constructor(
    provider: SourceProviderKind,
    message: string,
    detail?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SourceProviderFailure";
    this.provider = provider;
    this.detail = detail;
  }
}
