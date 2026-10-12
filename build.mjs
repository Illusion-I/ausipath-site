// Builds the Ausipath website (privacy policy, terms, account deletion, support) into ./docs, which GitHub Pages serves.
//
//   node build.mjs           builds; refuses if any of your details in site.config.json are still empty
//   node build.mjs --draft   builds anyway, for looking at the pages before your details are filled in
//
// The wording of the three legal pages lives in the app's repository (docs/legal/*.md). This only turns it into
// web pages and fills in your details, so the text is never written in two places.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, 'site.config.json'), 'utf8'));
const draft = process.argv.includes('--draft');
const page = (file) => `${config.baseUrl.replace(/\/$/, '')}/${file}`;

const values = {
  'YOUR LEGAL NAME': config.legalName,
  'CONTACT EMAIL': config.contactEmail,
  'EFFECTIVE DATE': config.effectiveDate,
  'STATE OR TERRITORY': config.stateOrTerritory,
  'POSTAL ADDRESS, IF YOU PUBLISH ONE': config.postalAddress,
  'PRIVACY POLICY URL': page('privacy.html'),
  'TERMS URL': page('terms.html'),
  'ACCOUNT DELETION PAGE URL': page('delete-account.html'),
};
const optional = new Set(['POSTAL ADDRESS, IF YOU PUBLISH ONE']);
const missing = Object.keys(values).filter((k) => !values[k] && !optional.has(k));
if (missing.length > 0 && !draft) {
  console.error(`Not built. Fill these in site.config.json first:\n  ${missing.join('\n  ')}\n(or run with --draft to preview)`);
  process.exit(1);
}

/** Puts your details into the text. A line whose only content is an empty optional detail is dropped. */
function fill(markdown) {
  return markdown
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => {
      const only = line.trim().match(/^\[\[([^\]]+)\]\]$/);
      return !(only && optional.has(only[1]) && !values[only[1]]);
    })
    .join('\n')
    .replace(/\[\[([^\]]+)\]\]/g, (whole, key) => values[key] || whole);
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Bold, web addresses and email addresses inside a line of text. */
function inline(text) {
  return escape(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(https:\/\/[^\s<)]+[^\s<).,;:])/g, '<a href="$1">$1</a>')
    .replace(/(^|[\s(])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '$1<a href="mailto:$2">$2</a>');
}

/** The small part of Markdown the legal pages use: headings, paragraphs, lists and tables. */
function toHtml(markdown) {
  const lines = markdown.split('\n');
  const out = [];
  let i = 0;
  const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const heading = line.match(/^(#{1,3}) (.*)$/);
    if (heading) { out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); i++; continue; }
    if (line.startsWith('|')) {
      const head = cells(line);
      i += 2; // the header row and the row of dashes under it
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(cells(lines[i++]));
      out.push(
        `<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') +
          '</tbody></table></div>',
      );
      continue;
    }
    const bullet = /^- /.test(line);
    if (bullet || /^\d+\. /.test(line)) {
      const tag = bullet ? 'ul' : 'ol';
      const item = bullet ? /^- / : /^\d+\. /;
      const items = [];
      while (i < lines.length && item.test(lines[i])) items.push(lines[i++].replace(item, ''));
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |\||- |\d+\. )/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${para.map(inline).join('<br>')}</p>`);
  }
  return out.join('\n');
}

const css = `
:root{--bg:#F7F9FC;--surface:#fff;--text:#001F3F;--muted:#4A5A70;--border:#E3E8F0;--brand:#00008B;--link:#00008B}
@media (prefers-color-scheme:dark){:root{--bg:#121212;--surface:#1C1C1E;--text:#F5F5F7;--muted:#A8A8AE;--border:#38383C;--brand:#1A2540;--link:#8FB4FF}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
header{background:var(--brand);color:#fff}
header .in,main,footer .in{max-width:760px;margin:0 auto;padding:0 20px}
header .in{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;padding-top:16px;padding-bottom:16px}
header a{color:#fff;text-decoration:none}
header .name{font-weight:800;font-size:20px;margin-right:auto}
header nav{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:15px}
header nav a{opacity:.85}
header nav a:hover,header nav a[aria-current]{opacity:1;text-decoration:underline}
main{padding-top:28px;padding-bottom:48px}
h1{font-size:30px;line-height:1.2;margin:0 0 16px}
h2{font-size:21px;margin:36px 0 10px}
h3{font-size:17px;margin:24px 0 8px}
p,ul,ol{margin:0 0 14px}
li{margin-bottom:6px}
a{color:var(--link)}
.table{overflow-x:auto;margin:0 0 18px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:15px;line-height:1.45}
th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--border)}
tr:last-child td{border-bottom:0}
th{font-weight:700}
.cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:20px 0}
.cards a{display:block;padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--surface);text-decoration:none;color:var(--text)}
.cards a strong{display:block;color:var(--link);margin-bottom:4px}
.cards a span{font-size:15px;color:var(--muted)}
footer{border-top:1px solid var(--border);color:var(--muted);font-size:14px}
footer .in{padding-top:18px;padding-bottom:28px}
`;

const NAV = [
  ['index.html', 'Home'],
  ['privacy.html', 'Privacy'],
  ['terms.html', 'Terms'],
  ['delete-account.html', 'Delete account'],
  ['support.html', 'Support'],
];

function layout(file, title, body) {
  const nav = NAV.map(([href, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>${css}</style>
</head>
<body>
<header><div class="in"><a class="name" href="index.html">Ausipath</a><nav>${nav}</nav></div></header>
<main>
${body}
</main>
<footer><div class="in">&copy; ${new Date().getFullYear()} ${escape(config.legalName || '[[YOUR LEGAL NAME]]')}</div></footer>
</body>
</html>
`;
}

const email = config.contactEmail || '[[CONTACT EMAIL]]';
const home = `# Ausipath

Ausipath is a study app for the Australian citizenship test, with lessons, practice questions and timed mock tests.
`;
const support = `# Ausipath support

## Contact us

Email ${email}. We aim to reply within two business days. Please tell us what kind of phone you use and what you were doing when the problem happened.

## Common questions

### I paid but the lessons are still locked

Open the app, go to the plans screen and tap **Restore purchases**. Make sure you are logged in to the same Ausipath account you bought the subscription with.

### How do I cancel my subscription?

Subscriptions are managed by Apple or Google, not inside Ausipath.

- **iPhone:** Settings → your name → Subscriptions → Ausipath → Cancel Subscription.
- **Android:** Google Play → your profile picture → Payments and subscriptions → Subscriptions → Ausipath → Cancel subscription.

You keep access until the end of the period you have paid for.

### How do I get a refund?

Refunds are handled by Apple or Google under their own policies. Request one through your App Store or Google Play purchase history.

### My progress is missing on a new phone

Log in with the same account you used before. Your progress is saved to your account and downloads when you log in.

### I am not receiving the login code

Check your spam folder, and that the email address is typed correctly. You can ask for a new code after one minute.

### I found a mistake in a question

Tap **Report a problem** on that question in the app, or email us with the question's wording.

### How do I delete my account?

See the Delete account page on this site.
`;

const sources = join(here, config.legalDocsFolder);
const pages = [
  ['privacy.html', 'Ausipath Privacy Policy', readFileSync(join(sources, 'privacy-policy.md'), 'utf8')],
  ['terms.html', 'Ausipath Terms of Use', readFileSync(join(sources, 'terms-of-use.md'), 'utf8')],
  ['delete-account.html', 'Delete your Ausipath account', readFileSync(join(sources, 'account-deletion.md'), 'utf8')],
  ['support.html', 'Ausipath support', support],
];

const out = join(here, 'docs');
mkdirSync(out, { recursive: true });
const cards = `<div class="cards">
<a href="privacy.html"><strong>Privacy Policy</strong><span>What the app collects and why</span></a>
<a href="terms.html"><strong>Terms of Use</strong><span>Including subscriptions</span></a>
<a href="delete-account.html"><strong>Delete your account</strong><span>How to remove your account and data</span></a>
<a href="support.html"><strong>Support</strong><span>Help and contact</span></a>
</div>`;
writeFileSync(join(out, 'index.html'), layout('index.html', 'Ausipath', toHtml(home) + '\n' + cards));
for (const [file, title, markdown] of pages) writeFileSync(join(out, file), layout(file, title, toHtml(fill(markdown))));
// Tells GitHub Pages to serve the files exactly as they are.
writeFileSync(join(out, '.nojekyll'), '');

console.log(`Built ${pages.length + 1} pages into ${out}`);
if (missing.length > 0) console.log(`DRAFT: still to fill in site.config.json: ${missing.join(', ')}`);
for (const [file] of pages) console.log(`  ${page(file)}`);
