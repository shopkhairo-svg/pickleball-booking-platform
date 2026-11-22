import { readFileSync } from "node:fs";

// Keep assets relative to this module so the documentation also works in Docker
// and when the server is started from a different working directory.
const customCss = readFileSync(new URL("./swagger-ui.css", import.meta.url), "utf8");

export const swaggerUiOptions = {
  customSiteTitle: "PickleballPro · API documentation",
  customfavIcon: "./favicon.svg?v=pickleballpro-1",
  customCss,
  // swagger-ui-express does not include a viewport meta tag. Its filter also
  // needs an accessible name; this enhances those elements without replacing
  // Swagger's own components or request handling.
  customJsStr: `
    document.documentElement.lang = "vi";
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement("meta");
      viewport.name = "viewport";
      viewport.content = "width=device-width, initial-scale=1";
      document.head.appendChild(viewport);
    }
    const docsRoot = document.getElementById("swagger-ui");
    docsRoot.setAttribute("role", "main");
    docsRoot.setAttribute("aria-label", "Tài liệu API PickleballPro");
    const labelFilter = () => {
      const input = docsRoot.querySelector(".filter-container input");
      if (!input) return false;
      input.setAttribute("aria-label", "Tìm nhóm API hoặc đường dẫn");
      input.setAttribute("placeholder", "Tìm nhóm hoặc đường dẫn: Xác thực, /courts…");
      input.setAttribute("autocomplete", "off");
      return true;
    };
    if (!labelFilter()) {
      const observer = new MutationObserver(() => {
        if (labelFilter()) observer.disconnect();
      });
      observer.observe(docsRoot, { childList: true, subtree: true });
    }
  `,
  swaggerOptions: {
    // BaseLayout omits the default logo/theme switcher. This keeps the custom
    // light palette consistent even when the operating system uses dark mode.
    layout: "BaseLayout",
    docExpansion: "none",
    deepLinking: true,
    filter: true,
    operationsSorter: "alpha",
    defaultModelsExpandDepth: 0,
    defaultModelExpandDepth: 1,
    displayRequestDuration: true,
    persistAuthorization: false,
    tryItOutEnabled: false,
    validatorUrl: null,
    syntaxHighlight: { activated: true, theme: "nord" },
  },
};
