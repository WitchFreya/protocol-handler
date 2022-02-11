/* 

example url: web+foo://eyJwdWJsaXNoZWRCbG9ja0lkIjoibXktdXVpZC1nb2VzLWhlcmUifQ==

resolves to:
{
  "publishedBlockId": "my-uuid-goes-here"
}
*/

const PROTOCOL_NAME = process.env.HANDLER_PROTOCOL_NAME ?? "Foo Protocol";
const PROTOCOL = process.env.HANDLER_PROTOCOL ?? "web+foo";

//#region Dependencies
/** generic function composer */
const compose = (...fs) => val => fs.reduce((cur, f) => f(cur), val);

/**
 * Convert string to base64-encoded string
 * @param {string} str 
 */
const toB64 = str => Buffer.from(str).toString('base64');

/**
 * Convert base64-encoded string to regular string
 * @param {string} str 
 */
const fromB64 = str => Buffer.from(str, 'base64').toString();

/**
 * Parse the base64-encoded hostname of a URL string to a regular string.
 * @param {string} url 
 */
const getData = url => {
  const parsed = new URL(url);
  return fromB64(parsed.hostname);
}

/**
 * @param {qs.ParsedQs} qs 
 * @returns {string}
 */
const getUrl = qs => qs['req'] ? fromB64(qs['req']) : undefined;

/** If defined, show data in a preformatted tag with an optional header function. */
const show = header => data => data ? `${header ? `<h4>${header}</h4>`: ''}<pre>${data}</pre>` : '';

const prettyPrint = strObj => JSON.stringify(JSON.parse(strObj), undefined, '\t')
//#endregion

//#region Server
const protocolHandler = require('custom-protocol-handler')();
protocolHandler.protocol(`${PROTOCOL}://test`, url =>  `http://localhost:3000?req=${toB64(url)}`);

const port = 3000;
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.get('/resolve', protocolHandler.middleware());

const showUrl = compose(getUrl, show('URL'));
const showData = compose(getUrl, getData, prettyPrint, show('Data'));
app.get('/', (req, res) => res.send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Custom Protocol Handler</title>
    <script>
      const bindHandler = () => {
        navigator.registerProtocolHandler(
          "${PROTOCOL}",
          "http://localhost:3000/resolve?url=%s",
          "${PROTOCOL_NAME}"
        );
      };

      const unbindHandler = () => {
        navigator.unregisterProtocolHandler("web+blankos", "http://localhost:3000/resolve?q=%s");
      };
    </script>
  </head>
  <body>
    <button onclick="bindHandler()">Register Handler</button>
    <button onclick="unbindHandler()">Unregister Handler</button>
    <br/>
    ${showUrl(req.query)}
    ${showData(req.query)}
  </body>
</html>`));

app.listen(port, () => console.log("listening on port: %i", port));
//#endregion