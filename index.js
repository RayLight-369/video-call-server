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
app.get( "/", ( req, res ) => {
  res.send( "Hello World!" );
} );

const users = new Map(); // socket.id => { name, room, peerId }

io.on( "connection", socket => {
  console.log( socket.id, "connected" );

  socket.on( "join-room", ( { name, room, peerId } ) => {
    users.set( socket.id, { name, room, peerId } );
    socket.join( room );
    console.log( `${ name } joined room: ${ room }` );

    // Notify others in the room
    socket.to( room ).emit( "user-joined", { name } );

    // Send updated user list to all in room
    const roomUsers = Array.from( users.values() ).filter( u => u.room === room );
    io.to( room ).emit( "users-in-room", roomUsers );
  } );

  socket.on( "disconnect", () => {
    const user = users.get( socket.id );
    if ( user ) {
      const { room, name } = user;
      console.log( `${ name } left room: ${ room }` );
      users.delete( socket.id );

      // Notify room
      socket.to( room ).emit( "user-left", { name } );

      // Update participant list
      const roomUsers = Array.from( users.values() ).filter( u => u.room === room );
      io.to( room ).emit( "users-in-room", roomUsers );
    }
  } );
} );

server.listen( PORT, () => console.log( `✅ Server running on port ${ PORT }` ) ); //running on port
