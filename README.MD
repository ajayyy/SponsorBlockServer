# SponsorBlock Server

SponsorBlock is an extension that will skip over sponsored segments of YouTube videos. SponsorBlock is a crowdsourced browser extension that let's anyone submit the start and end time's of sponsored segments of YouTube videos. Once one person submits this information, everyone else with this extension will skip right over the sponsored segment.

This is the server backend for it

# Server

This uses a Postgres or Sqlite database to hold all the timing data.

To make sure that this project doesn't die, I have made the database publicly downloadable at https://sponsor.ajay.app/database. You can download a backup or get archive.org to take a backup if you do desire. The database is under [this license](https://creativecommons.org/licenses/by-nc-sa/4.0/) unless you get explicit permission from me.

Hopefully this project can be combined with projects like [this](https://github.com/Sponsoff/sponsorship_remover) and use this data to create a neural network to predict when sponsored segments happen. That project is sadly abandoned now, so I have decided to attempt to revive this idea.

# Client

The client web browser extension is available here: https://github.com/ajayyy/SponsorBlock

# Build Yourself

This is a node.js server, so clone this repo and run `npm install` to install all dependencies.

Make sure to put the database files in the `./databases` folder if you want to use a pre-existing database. Otherwise, a fresh database will be created.

Rename `config.json.example` to `config.json` and fill the parameters inside. Make sure to remove the comments as comments are not supported in JSON.

Ensure all the tests pass with `npm test`

Run the server with `npm start`.

# Developing

If you want to make changes, run `npm run dev` to automatically reload the server and run tests whenever a file is saved.

# API Docs

Available [here](https://wiki.sponsor.ajay.app/index.php/API_Docs)
