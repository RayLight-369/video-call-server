const http = require( "http" );
const express = require( "express" );
const cors = require( "cors" );
const app = express();
const server = http.createServer( app );
const SocketIO = require( "socket.io" );
const io = new SocketIO.Server( server, {
  cors: {
    origin: [ "http://localhost:3000", "https://video-call-server-vvga.onrender.com" ]
  }
} );

const PORT = 3030;
app.use( cors() );

app.get( "/", ( _, res ) => {
  res.send( "Hello, world!" );
} );

const users = new Map(); // socket.id => peerId

io.on( "connection", socket => {
  console.log( socket.id, "connected" );

  socket.on( "peer-id", peerId => {
    users.set( socket.id, peerId );
    console.log( "Peer ID registered:", peerId );

    // Broadcast all connected peerIds
    io.emit( "users", Array.from( users.values() ) );
  } );

  socket.on( "disconnect", () => {
    console.log( socket.id, "disconnected" );
    users.delete( socket.id );
    io.emit( "users", Array.from( users.values() ) );
  } );
} );

server.listen( PORT, () => console.log( `running on port ${ PORT }` ) );
