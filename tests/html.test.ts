import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlText, serverMarkup } from "./helpers/html.ts";

test("server markup excludes script payloads without executing them", () => {
  const html = '<main><h1>Public heading</h1></main><script>throw new Error("private-payload")</script>';
  const markup = serverMarkup(html);
  assert.ok(markup.includes("<h1>Public heading</h1>"));
  assert.ok(!markup.includes("private-payload"));
  assert.ok(!markup.includes("<script"));
  assert.ok(html.includes("private-payload"));
});

test("HTML parsing recognizes mixed-case script tags and malformed closing attributes", () => {
  const html = '<main>Before<ScRiPt data-label="a>b">private-payload</sCrIpT ignored="value">After</main>';
  const markup = serverMarkup(html);
  assert.ok(!markup.includes("private-payload"));
  assert.equal(htmlText(markup), "BeforeAfter");
});

test("comments cannot reconstitute markup or contaminate visible text", () => {
  const html = '<main>Priority <!-- embedded <script>payload</script> --!>high</main>';
  assert.equal(htmlText(serverMarkup(html)), "Priority high");
  assert.ok(!serverMarkup(html).includes("payload"));
  assert.equal(htmlText(serverMarkup('<main>&lt;scr<!-- gap -->ipt&gt;literal&lt;/script&gt;</main>')), "<script>literal</script>");
});

test("escaped owner content remains text rather than an executable element", () => {
  const html = '<main>&lt;script&gt;alert(&quot;text only&quot;)&lt;/script&gt;</main>';
  const markup = serverMarkup(html);
  assert.ok(markup.includes("&lt;script&gt;"));
  assert.ok(!markup.includes("<script>"));
  assert.equal(htmlText(markup), '<script>alert("text only")</script>');
});

test("link and icon text ignores nested hidden decoration without losing the label", () => {
  assert.equal(htmlText('<a href="/projects"><span aria-hidden="true"><span>←</span></span> All <!-- label -->projects</a>').trim(), "All projects");
  assert.equal(htmlText('<button><svg aria-hidden="true"><title>Menu icon</title></svg></button>'), "");
  assert.equal(htmlText('<button><svg aria-hidden="true"></svg>Menu</button>'), "Menu");
});

test("payload-only catalog strings cannot satisfy visible content assertions", () => {
  const html = '<main>Public content</main><template><p>private-template</p></template><style>private-style</style><script>{"label":"private-script"}</script>';
  assert.equal(htmlText(html), "Public content");
  const markup = serverMarkup(html);
  for (const value of ["private-template", "private-style", "private-script"]) assert.ok(!markup.includes(value));
});

test("entity decoding and quoted attributes preserve form values and text semantics", () => {
  const markup = serverMarkup('<main><input type="hidden" name="action" value="a&quot;b&amp;c"><p>Owner&#x27;s &amp; projects</p></main>');
  assert.ok(markup.includes('value="a&quot;b&amp;c"'));
  assert.equal(htmlText(markup), "Owner's & projects");
  assert.equal(htmlText("&amp;lt;script&amp;gt;"), "&lt;script&gt;");
});
