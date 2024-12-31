export interface CookiesOpts {
  expires?: number | string | Date;
  path?: string;
  domain?: string;
  sameSite?: string;
  httpOnly?: boolean;
  secure?: boolean;
  other?: string;
}
