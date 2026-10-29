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
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  new Function("require", "exports", output)((name) => {
    if (Object.hasOwn(mocks, name)) {
      const value = mocks[name];
      return Object.hasOwn(value, "default")
        ? { ...value, __esModule: true }
        : value;
    }
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

for (const [href, destination] of [
  ["/announcement", "/announcement"],
  ["/announcement?page=2", "/announcement?page=2"],
  ["/announcement?category=listing", "/announcement?category=listing"],
  [
    "/announcement/release%20notes?is_official=true#details",
    "/announcement/release%20notes?is_official=true#details",
  ],
  [
    "/announcement/123?is_official=false",
    "/announcement/123?is_official=false",
  ],
  ["/announcement#section?details", "/announcement#section?details"],
]) {
  test(`announcement navigation replaces stale filters and suffixes: ${href}`, () => {
    global.window.location.search =
      "?category=campaign&source=platform&page=5&is_official=true";
    nav().onRouteChange({
      href,
      name: "announcement",
      scope: "announcement",
      replace: true,
    });
    assert.deepEqual(navigations, [
      { href: `/tc${destination}`, replace: true },
    ]);
  });
}

test("announcement navigation preserves an explicit destination locale", () => {
  nav().onRouteChange({
    href: "/en/announcement/123?is_official=true",
    name: "announcement",
    scope: "announcement",
  });
  assert.equal(navigations[0].href, "/en/announcement/123?is_official=true");
});

test("announcement external links bypass the host router", () => {
  nav().onRouteChange({
    href: "https://example.com/article?is_official=true#details",
    name: "announcement",
    scope: "announcement",
    target: "_blank",
  });
  assert.equal(navigations.length, 0);
  assert.deepEqual(opened, [
    [
      "https://example.com/article?is_official=true#details",
      "_blank",
      "noopener,noreferrer",
    ],
  ]);
});

for (const slug of ["123", "release-notes", "中文公告"]) {
  test(`Next announcement page forwards a slug without ID conversion: ${slug}`, async () => {
    const View = loadSource("app/[lang]/announcement/view.tsx", {
      "@orderly.network/ui-notification": {
        AnnouncementCenterPage: () => null,
      },
    }).default;
    assert.deepEqual(View({ slug }).props, { slug });
    const Detail = loadSource("app/[lang]/announcement/[slug]/page.tsx", {
      "../view": { default: View },
    }).default;
    const result = await Detail({ params: Promise.resolve({ slug }) });
    assert.equal(result.props.slug, slug);
  });
}

test("Next announcement list and unlocalized direct links are registered", () => {
  const Page = loadSource("app/[lang]/announcement/page.tsx", {
    "./view": { default: () => null },
  }).default;
  assert.equal(Page().props.slug, undefined);
  for (const path of ["/announcement", "/announcement/123"]) {
    const response = middleware(
      new NextRequest(`https://example.com${path}?is_official=true`, {
        headers: { cookie: `${i18n.i18nCookieKey}=zh` },
      }),
    );
    assert.equal(
      response.headers.get("location"),
      `https://example.com/zh${path}?is_official=true`,
    );
  }
});

function loadAnnouncementLayout({ slug, mobile = true } = {}) {
  const Box = () => null;
  return loadSource("hooks/useAnnouncementLayout.tsx", {
    "next/navigation": {
      useParams: () => ({ slug }),
      useLocation: () => global.window.location,
      useSearchParams: () => new URLSearchParams(global.window.location.search),
    },
    "@orderly.network/i18n": {
      useTranslation: () => ({
        t: (key) => key,
      }),
    },
    "@orderly.network/react-app": {
      useAppContext: () => ({ onRouteChange: nav().onRouteChange }),
    },
    "@orderly.network/ui": {
      Flex: Box,
      Text: Box,
      ChevronLeftIcon: Box,
      useScreen: () => ({ isMobile: mobile }),
    },
    "../constant": constants,
  }).useAnnouncementLayout();
}

test("mobile announcement back button uses logical start and the CSS RTL variant", () => {
  const { topBar, classNames } = loadAnnouncementLayout({
    slug: "123",
  });
  const button = topBar.props.children[0];
  assert.equal(button.props["aria-label"], undefined);
  assert.equal(button.props.title, undefined);
  assert.ok(button.props.className.includes("oui-start-4"));
  assert.equal(button.props.children.props.className, "rtl:oui-rotate-180");
  assert.equal(button.props.children.props.style, undefined);
  assert.ok(classNames.content.includes("oui-announcement-center"));
});

test("desktop announcements keep the SDK header without the mobile return bar", () => {
  const props = loadAnnouncementLayout({ mobile: false });
  assert.equal(props.topBar, undefined);
  assert.equal(props.classNames.content, undefined);
});

for (const slug of ["release-notes", "123"]) {
  test(`mobile detail ${slug} returns to list, retaining context and removing article source/hash`, () => {
    global.window.location.search =
      "?brokerId=demo&networkId=testnet&category=listing&source=official&page=2&is_official=true&feature=one&feature=two";
    const props = loadAnnouncementLayout({ slug });
    props.topBar.props.children[0].props.onClick();
    assert.deepEqual(navigations, [
      {
        href: "/tc/announcement?brokerId=demo&networkId=testnet&category=listing&source=official&page=2&feature=one&feature=two",
        replace: false,
      },
    ]);
  });
}

test("mobile list returns to the remembered Perps symbol and removes announcement filters", () => {
  global.window.location.search =
    "?brokerId=demo&networkId=testnet&category=listing&source=community&page=2&is_official=false&feature=one&feature=two";
  const props = loadAnnouncementLayout();
  const button = props.topBar.props.children[0];
  assert.equal(button.props["aria-label"], undefined);
  assert.equal(button.props.title, undefined);
  button.props.onClick();
  assert.deepEqual(navigations, [
    {
      href: "/tc/perp/PERP_ETH_USDC?brokerId=demo&networkId=testnet&feature=one&feature=two",
      replace: false,
    },
  ]);
});

test("mobile returns without context clear inherited query and hash", () => {
  global.window.location.search = "?is_official=true";
  loadAnnouncementLayout({
    slug: "123",
  }).topBar.props.children[0].props.onClick();
  assert.equal(navigations[0].href, "/tc/announcement");
  global.window.location.search =
    "?category=listing&source=official&page=2&is_official=true";
  loadAnnouncementLayout().topBar.props.children[0].props.onClick();
  assert.equal(navigations[1].href, "/tc/perp/PERP_ETH_USDC");
});
