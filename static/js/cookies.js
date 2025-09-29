const cookieManager = {
  /**
   * Get a cookie by name (returns string or parsed array if JSON list)
   * @param {string} name
   * @returns {string|Array|null}
   */
  get(name) {
    const cookieArr = document.cookie.split("; ");
    for (const cookie of cookieArr) {
      const [key, value] = cookie.split("=");
      if (key === decodeURIComponent(name)) {
        const decoded = decodeURIComponent(value);
        try {
          return JSON.parse(decoded); // try to parse array
        } catch {
          return decoded; // fallback to raw string
        }
      }
    }
    return null;
  },

  /**
   * Set a cookie with a string or list of values
   * @param {string} name
   * @param {string|Array} value - Raw string or list of values
   * @param {object} [options]
   */
  set(name, value, options = {}) {
    // If value is an array, convert to JSON string
    const encodedValue = encodeURIComponent(
      Array.isArray(value) ? JSON.stringify(value) : value
    );

    let cookieStr = `${encodeURIComponent(name)}=${encodedValue}`;

    if (options.days) {
      const expires = new Date(Date.now() + options.days * 864e5);
      cookieStr += `; expires=${expires.toUTCString()}`;
    }

    cookieStr += `; path=${options.path || "/"}`;

    if (options.domain) {
      cookieStr += `; domain=${options.domain}`;
    }

    if (options.secure) {
      cookieStr += `; secure`;
    }

    if (options.sameSite) {
      cookieStr += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieStr;
  },

  /**
   * Delete a cookie
   * @param {string} name
   * @param {object} [options]
   */
  delete(name, options = {}) {
    this.set(name, "", { ...options, days: -1 });
  }
};

