/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS harness evaluates transpiled host adapters. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { beforeEach, after, test } = require("node:test");
const ts = require("typescript");
const i18n = require("@orderly.network/i18n");
const types = require("@orderly.network/types");
const sourceRoot = path.join(__dirname, "..", "src");

function loadSource(file, mocks = {}) {
  const absolute = path.isAbsolute(file) ? file : path.join(sourceRoot, file);
  const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  new Function("require", "exports", output)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/") || name.startsWith(".")) {
      const target = name.startsWith("@/")
        ? path.join(sourceRoot, name.slice(2))
        : path.resolve(path.dirname(absolute), name);
      const resolved = [
        target,
        `${target}.ts`,
        `${target}.tsx`,
        path.join(target, "index.ts"),
        path.join(target, "index.tsx"),
      ].find(
        (candidate) =>
          fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
      );
      if (resolved) return loadSource(resolved, mocks);
    }
    return require(name);
  }, exports);
  return exports;
}

const originalWindow = global.window;
const navigations = [];
const opened = [];
const constants = loadSource("constant.ts");
const paths = loadSource("navigationPaths.ts");
const mocks = {
  react: { useCallback: (fn) => fn, useEffect: () => {} },
  "next/navigation": {
    useRouter: () => ({
      push: (href) => navigations.push({ href, replace: false }),
      replace: (href) => navigations.push({ href, replace: true }),
    }),
  },
  "@orderly.network/portfolio": {
    PortfolioLeftSidebarPath: {
      FeeTier: "/portfolio/feeTier",
      ApiKey: "/portfolio/apiKey",
    },
  },
  "@/perpSymbolStorage": { getPerpSymbol: () => "PERP_ETH_USDC" },
};
const nav = loadSource("hooks/useNav.ts", mocks).useNav;
beforeEach(() => {
  navigations.length = 0;
  opened.length = 0;
  global.window = {
    location: {
      pathname: "/tc/predict",
      search: "?ref=demo",
      hash: "#account",
    },
    open: (...args) => opened.push(args),
  };
});
after(() => {
  if (originalWindow === undefined) delete global.window;
  else global.window = originalWindow;
});

for (const [legacy, canonical] of [
  ["/prediction", "/predict"],
  ["/prediction/BTC%2F5M%25?x=1#orders", "/predict/BTC%2F5M%25?x=1#orders"],
  ["/zh/prediction/BTC%2F5M%25", "/zh/predict/BTC%2F5M%25"],
  ["/predictionish", "/predictionish"],
  ["/portfolio/prediction", "/portfolio/prediction"],
  ["/predict/BTC", "/predict/BTC"],
]) {
  test(`canonicalizes only the legacy page segment: ${legacy}`, () => {
    assert.equal(paths.migratePredictionPath(legacy), canonical);
  });
}

test("SDK round requests migrate and preserve the current locale, query, hash and replacement", () => {
  nav().onRouteChange(types.predictionRoute("BTC/5M%", { replace: true }));
  assert.deepEqual(navigations, [
    { href: "/tc/predict/BTC%2F5M%25?ref=demo#account", replace: true },
  ]);
});

for (const [href, expected] of [
  ["/prediction?market=btc", "/tc/predict?market=btc#account"],
  ["/prediction#round?details", "/tc/predict?ref=demo#round?details"],
  [
    "/en/prediction/BTC%2F5M%25?network=test#orders",
    "/en/predict/BTC%2F5M%25?network=test#orders",
  ],
  ["/portfolio/feeTier?tab=fees#tier", "/tc/portfolio/fee?tab=fees#tier"],
  ["/portfolio/apiKey", "/tc/portfolio/api-key?ref=demo#account"],
  ["/", "/tc/perp/PERP_ETH_USDC?ref=demo#account"],
  ["/perp/PERP_SOL_USDC", "/tc/perp/PERP_SOL_USDC?ref=demo#account"],
]) {
  test(`navigation preserves independent URL suffixes: ${href}`, () => {
    nav().onRouteChange({ href, name: "test" });
    assert.deepEqual(navigations, [{ href: expected, replace: false }]);
  });
}

test("explicit empty query and hash clear inherited suffixes", () => {
  nav().onRouteChange({ href: "/prediction?#", name: "test" });
  const url = new URL(navigations[0].href, "https://example.com");
  assert.equal(url.pathname, "/tc/predict");
  assert.equal(url.search, "");
  assert.equal(url.hash, "");
});

test("external URLs bypass internal mapping", () => {
  nav().onRouteChange({
    href: "https://example.com/prediction?x=1#orders",
    target: "_blank",
    name: "external",
  });
  assert.deepEqual(opened, [
    [
      "https://example.com/prediction?x=1#orders",
      "_blank",
      "noopener,noreferrer",
    ],
  ]);
  assert.equal(navigations.length, 0);
});

test("canonical route and title match the reference host", () => {
  assert.equal(constants.PathEnum.Prediction, "/predict");
  assert.equal(
    constants.PageTitleMap[constants.PathEnum.Prediction],
    "Predict",
  );
});

const { NextRequest } = require("next/server");
const middleware = loadSource("middleware.ts").middleware;
for (const [entry, canonical] of [
  ["/prediction", "/zh/predict"],
  ["/predict", "/zh/predict"],
  ["/prediction/BTC%2F5M%25", "/zh/predict/BTC%2F5M%25"],
  ["/predict/BTC%2F5M%25", "/zh/predict/BTC%2F5M%25"],
  ["/tc/prediction/BTC%2F5M%25", "/tc/predict/BTC%2F5M%25"],
]) {
  test(`middleware normalizes direct entry in one redirect: ${entry}`, () => {
    const request = new NextRequest(
      `https://example.com${entry}?network=test`,
      {
        headers: { cookie: `${i18n.i18nCookieKey}=zh` },
      },
    );
    const response = middleware(request);
    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      `https://example.com${canonical}?network=test`,
    );
  });
}
for (const entry of [
  "/en/predict",
  "/en/predict/BTC%2F5M%25",
  "/predictionish",
  "/logo.svg",
]) {
  test(`middleware leaves existing routes and unrelated paths alone: ${entry}`, () => {
    assert.equal(
      middleware(new NextRequest(`https://example.com${entry}`)).headers.get(
        "location",
      ),
      null,
    );
  });
}

test("canonical server page keeps its client boundary and exact symbol", async () => {
  const page = loadSource("app/[lang]/predict/[[...symbol]]/page.tsx", {
    "./view": { default: () => null },
  });
  const result = await page.default({
    params: Promise.resolve({ symbol: ["BTC/5M%"] }),
  });
  assert.equal(result.props.symbol, "BTC/5M%");
  assert.equal(page.metadata.title, "Predict | Orderly");
});
