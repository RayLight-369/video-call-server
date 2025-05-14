const http = require( "http" );
const express = require( "express" );
const cors = require( "cors" );
const app = express();
const server = http.createServer( app );
const SocketIO = require( "socket.io" );
const io = new SocketIO.Server( server, {
  cors: {
    origin: [ "http://localhost:3000", "https://voice-call-flax.vercel.app" ],
  },
} );

const PORT = 3030;
app.use( cors() );

app.get( "/", ( _, res ) => {
  res.send( "Hello, world!" );
} );

// socket.id → { name, room, peerId }
const users = new Map();

io.on( "connection", socket => {
  console.log( socket.id, "connected" );

  socket.on( "join-room", ( { name, room, peerId } ) => {
    users.set( socket.id, { name, room, peerId } );
    socket.join( room );
    console.log( `${ name } joined room: ${ room }` );

    // Send all peerIds in the same room (except self)
    const roomUsers = Array.from( users.entries() )
      .filter( ( [ _, user ] ) => user.room === room && user.peerId !== peerId )
      .map( ( [ _, user ] ) => ( { peerId: user.peerId, name: user.name } ) );

    socket.emit( "users-in-room", roomUsers );
  } );

  socket.on( "disconnect", () => {
    const user = users.get( socket.id );
    if ( user ) {
      console.log( `${ user.name } left room: ${ user.room }` );
      users.delete( socket.id );
      socket.to( user.room ).emit( "users-in-room", Array.from( users.entries() )
        .filter( ( [ _, u ] ) => u.room === user.room )
        .map( ( [ _, u ] ) => ( { peerId: u.peerId, name: u.name } ) )
      );
    } else {
      console.log( socket.id, "disconnected" );
    }
  } );
} );

server.listen( PORT, () => console.log( `✅ Server running on port ${ PORT }` ) );
