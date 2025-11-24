Steps to deploy this app to Netlify

- 1) Ensure the project is pushed to a Git repository (GitHub/GitLab/Bitbucket) or you will use the Netlify CLI.

- 2) Set environment variables (GEMINI API key):
  - In Netlify Dashboard: Site Settings → Build & deploy → Environment → Edit variables. Add `GEMINI_API_KEY` with your key.
  - Or with Netlify CLI (if installed):

    ```bash
    netlify login
    netlify link # link to the site
    netlify env:set GEMINI_API_KEY "sk-..."
    ```

- 3) Build settings (if using Git integration):
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Functions directory: `netlify/functions`

  These are already set when you connect a repo and Netlify reads `netlify.toml`.

- 4) Deploy options:
  - Option A (recommended): Connect the Git repository to Netlify and let it build on push.
  - Option B: Use Netlify CLI to deploy manually:

    ```bash
    npm i -g netlify-cli
    netlify login
    netlify init # or netlify link
    netlify deploy --prod --dir=dist
    ```

- 5) Important notes:
  - Do NOT commit your real API key to the repo. `.env.local` is ignored (`*.local` in `.gitignore`).
  - The serverless function `netlify/functions/gemini.js` uses the `GEMINI_API_KEY` from Netlify environment variables. Set that value in Netlify site settings.
  - If you need streaming behavior in the future, you may want to update the function to stream chunks back (current function returns the one-shot response object).

That's it — after connecting your repo or running the CLI deploy, your site will be available on the Netlify URL provided by the dashboard.
