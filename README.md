# Stack Notes

Launch the web app at [stacknotes.org](https://stacknotes.org).


### Running Locally

This repo contains the core code used in the [web app](https://github.com/standardnotes/web).

**Instructions:**

1. Clone the repo
2. `nvm use v13.14.0`
3. `npm install`
4. `npm start`

**build the app**

`npm run build` # before build you need to nvm to use old node version
`cd docs`
`python3 -m http.server 8080`

after build switch to latest npm: `nvm use node`

Then open your browser to <http://localhost:8080>.

[webpack guide](https://webpack.js.org/guides/getting-started/)