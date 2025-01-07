export interface SearchEngine {
  name: string;
  icon: string;
  searchUrl: (query: string) => string;
}

export interface Bookmark {
  id: string;
  label: string;
  url: string;
  iconUrl?: string;
}

export interface CookiesOpts {
  expires?: number | string | Date;
  path?: string;
  domain?: string;
  sameSite?: string;
  httpOnly?: boolean;
  secure?: boolean;
  other?: string;
}
