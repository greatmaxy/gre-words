# Wordwell — GRE Word Matching Practice

A local web app for maintaining a personal GRE word list and practising word-to-definition matching. Your vocabulary is automatically stored in `data/words.json` in this project folder.

## Run locally

From this folder, run:

```sh
npm start
```

Then open `http://127.0.0.1:8000` in a browser. Add, edit, or remove words in the app and the server updates `data/words.json` automatically. Practice-round history is not stored.

You can also edit `data/words.json` directly while the server is stopped. Keep the top-level `entries` array and each entry's `id`, `word`, `definition`, and `createdAt` fields.
