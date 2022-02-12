const external = require('./server');

const port = process.env.PORT || 8000
external.httpServer.listen(port, () => console.log(`Listening on port ${port}`));
