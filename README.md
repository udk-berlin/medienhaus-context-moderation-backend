<img src="./public/favicon.svg" width="70" />

### medienhaus/

Customizable, modular, free and open-source environment for decentralized, distributed communication and collaboration without third-party dependencies.

[Website](https://medienhaus.dev/) — [Fediverse](https://chaos.social/@medienhaus)

<br>

# medienhaus-context-moderation-backend

A simple email notification backend which was developed in addition to a simple [web application](https://github.com/medienhaus/medienhaus-context-moderation-backend) for matrix space/room moderators to accept or deny knock requests.


## Configuration

- Rename `.env.example` to `.env` and edit as needed
- Create `spaces-export.json` with moderator email address lookup data


## Installation

```shell
npm install
```

## Run

```shell
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run build
npm run start:prod
```

## Test

```shell
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```
