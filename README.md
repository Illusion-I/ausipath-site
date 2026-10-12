# Ausipath website

The public pages for the Ausipath app: privacy policy, terms of use, how to delete an account, and support. Hosted free by GitHub Pages from the `docs` folder.

## Changing the pages

The wording of the three legal pages lives in the app's repository, in `docs/legal`. Edit it there, then rebuild:

```
node build.mjs
```

Your name, contact email, state and the effective date are in `site.config.json`. The build refuses to run while any of them is empty, so a page can't go live with a blank in it. To look at the pages before filling them in:

```
node build.mjs --draft
```

Then commit and push. GitHub Pages updates within a few minutes.

The support page and home page are written in `build.mjs`.

## Addresses

- https://illusion-i.github.io/ausipath-site/privacy.html
- https://illusion-i.github.io/ausipath-site/terms.html
- https://illusion-i.github.io/ausipath-site/delete-account.html
- https://illusion-i.github.io/ausipath-site/support.html
