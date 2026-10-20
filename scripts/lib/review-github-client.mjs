const rawAccept = "application/vnd.github.raw";
const transientStatuses = new Set([0, 502, 503, 504]);

export function createGitHubClient({
  token,
  fetch = globalThis.fetch,
  apiRoot = "https://api.github.com",
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  async function rest(
    method,
    resource,
    body,
    accept = "application/vnd.github+json",
  ) {
    const retries = method === "GET" || resource === "/graphql" ? 2 : 0;
    for (let attempt = 0; ; attempt++) {
      try {
        return await request(method, resource, body, accept);
      } catch (error) {
        if (attempt === retries || !transientStatuses.has(error.status))
          throw error;
        await wait(1000 * 2 ** attempt);
      }
    }
  }

  async function request(method, resource, body, accept) {
    const url = /^https?:\/\//.test(resource)
      ? resource
      : `${apiRoot.replace(/\/$/, "")}/${resource.replace(/^\//, "")}`;
    let status = 0;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: accept,
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      status = response.status;
      if (!response.ok) {
        throw new Error(
          `GitHub request failed (${status} ${response.statusText}): ${method} ${url}`,
        );
      }
      const text = await response.text().catch((error) => {
        status = 0;
        throw error;
      });
      return {
        status,
        data:
          accept === rawAccept ? text : text === "" ? null : JSON.parse(text),
        headers: response.headers,
      };
    } catch (error) {
      throw Object.assign(
        error instanceof Error ? error : new Error(String(error)),
        { status },
      );
    }
  }

  return {
    rest,
    async paginate(resource) {
      const items = [];
      while (resource) {
        const { data, headers } = await rest("GET", resource);
        items.push(...data);
        resource = /<([^>]+)>;\s*rel="next"/.exec(
          headers.get("link") ?? "",
        )?.[1];
      }
      return items;
    },
    async graphql(query, variables) {
      const { status, data } = await rest("POST", "/graphql", {
        query,
        variables,
      });
      if (data.errors?.length) {
        throw Object.assign(
          new Error(data.errors.map(({ message }) => message).join("; ")),
          { status, types: data.errors.map((error) => error.type) },
        );
      }
      return data.data;
    },
    async raw(resource) {
      try {
        return (await rest("GET", resource, undefined, rawAccept)).data;
      } catch (error) {
        if (error.status === 404) return null;
        throw error;
      }
    },
  };
}
