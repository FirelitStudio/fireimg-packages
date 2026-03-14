# Fireimg client packages

JavaScript/TypeScript clients for [Fireimg](https://fireimg.com) image optimization.

| Package | Description |
|---------|-------------|
| [@fireimg/js](./packages/fireimg-js) | Vanilla JS/TS – build optimized image URLs |
| [@fireimg/react](./packages/fireimg-react) | React components for optimized images |

## Install

```bash
# Vanilla JS
npm install @fireimg/js

# React
npm install @fireimg/react @fireimg/js
```

## Usage

See each package’s README for API details:

- [packages/fireimg-js](./packages/fireimg-js)
- [packages/fireimg-react](./packages/fireimg-react)

## Development

```bash
npm install
npm run build
npm test
```

## Publishing

From the repo root (with npm logged in to the Firelit scope):

```bash
npm run build
cd packages/fireimg-js && npm publish --access public
cd ../fireimg-react && npm publish --access public
```

## License

MIT
