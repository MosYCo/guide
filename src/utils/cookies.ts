import { CookiesOpts } from "../types";

const encode = (url: string): string => {
  return encodeURIComponent(url);
};
const decode = (url: string) => {
  return decodeURIComponent(url);
};

const stringifyCookieValue = (value: any) => {
  return encode(value === Object(value) ? JSON.stringify(value) : "" + value);
};

const getString = (msOffset: number) => {
  const time = new Date();
  time.setMilliseconds(time.getMilliseconds() + msOffset);
  return time.toUTCString();
};

const parseExpireString = (str: string) => {
  let timestamp = 0;

  const days: any = str.match(/(\d+)d/);
  const hours: any = str.match(/(\d+)h/);
  const minutes: any = str.match(/(\d+)m/);
  const seconds: any = str.match(/(\d+)s/);

  if (days) {
    timestamp += days[1] * 864e5;
  }
  if (hours) {
    timestamp += hours[1] * 36e5;
  }
  if (minutes) {
    timestamp += minutes[1] * 6e4;
  }
  if (seconds) {
    timestamp += seconds[1] * 1000;
  }

  return timestamp === 0 ? str : getString(timestamp);
};

const read = (str: string) => {
  if (str === '') {
    return str
  }

  if (str.indexOf('"') === 0) {
    // This is a quoted cookie as according to RFC2068, unescape...
    str = str.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }

  // Replace server-side written pluses with spaces.
  // If we can't decode the cookie, ignore it, it's unusable.
  // If we can't parse the cookie, ignore it, it's unusable.
  str = decode(str.replace(/\+/g, ' '))

  try {
    const parsed = JSON.parse(str)

    if (parsed === Object(parsed) || Array.isArray(parsed) === true) {
      str = parsed
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
  catch (_) {}

  return str
}

export default class Cookies {
  static set(key: string, val: any, opts: CookiesOpts = {}) {
    let expire: string = "";
    let expireValue;
    if (opts.expires !== void 0) {
      if (Object.prototype.toString.call(opts.expires) === "[object Date]") {
        expire = (opts.expires as Date).toUTCString();
      } else if (typeof opts.expires === "string") {
        expire = parseExpireString(opts.expires);
      } else {
        expireValue = parseFloat(opts.expires + "");
        expire =
          isNaN(expireValue) === false
            ? getString(expireValue * 864e5)
            : opts.expires + "";
      }
    }
    const keyValue = `${encode(key)}=${stringifyCookieValue(val)}`;
    const cookie = [
      keyValue,
      expire !== void 0 ? "; Expires=" + expire : "", // use expires attribute, max-age is not supported by IE
      opts.path ? "; Path=" + opts.path : "",
      opts.domain ? "; Domain=" + opts.domain : "",
      opts.sameSite ? "; SameSite=" + opts.sameSite : "",
      opts.httpOnly ? "; HttpOnly" : "",
      opts.secure ? "; Secure" : "",
      opts.other ? "; " + opts.other : "",
    ].join("");
    document.cookie = cookie;
  }

  static get(key: string) {
    const cookieSource = document;
    const cookies = cookieSource.cookie ? cookieSource.cookie.split("; ") : [];
    const l = cookies.length;
    let result: Record<string, any> | null | string = key ? null : {};

    for (let i = 0; i < l; i++) {
      const parts: string[] = cookies[i].split("=");
      const name = decode(parts.shift() + "");
      const cookie = parts.join("=");

      if (!key) {
        (result as Record<string, any>)[name] = cookie;
      } else if (key === name) {
        result = read(cookie);
        break;
      }
    }

    return result;
  }

  static remove(key: string, options: CookiesOpts = {}) {
    this.set(key, "", { expires: -1, ...options });
  }

  static has(key: string) {
    return this.get(key) !== null;
  }
}
