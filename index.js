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

const users = new Map(); // socket.id => { name, room, peerId }
const screenSharers = new Map(); // room => Set<name>

io.on( "connection", ( socket ) => {
  console.log( socket.id, "connected" );

  socket.on( "join-room", ( { name, room, peerId } ) => {
    users.set( socket.id, { name, room, peerId } );
    socket.join( room );
    console.log( `${ name } joined room: ${ room }` );

    const roomUsers = Array.from( users.values() ).filter( ( u ) => u.room === room );
    const sharers = Array.from( screenSharers.get( room ) || [] );

    // Notify the new user
    socket.emit( "users-in-room", roomUsers );
    socket.emit( "screen-sharers", sharers );

    // Notify others
    socket.to( room ).emit( "user-joined", { name } );
    io.to( room ).emit( "users-in-room", roomUsers );
  } );

  socket.on( "start-screen-share", ( { name, room } ) => {
    if ( !screenSharers.has( room ) ) screenSharers.set( room, new Set() );
    screenSharers.get( room ).add( name );
    socket.to( room ).emit( "screen-share-started", name );
  } );

  socket.on( "stop-screen-share", ( { name, room } ) => {
    const sharers = screenSharers.get( room );
    if ( sharers ) sharers.delete( name );
    socket.to( room ).emit( "screen-share-stopped", name );
  } );

  socket.on( "disconnect", () => {
    const user = users.get( socket.id );
    if ( user ) {
      const { room, name } = user;
      console.log( `${ name } left room: ${ room }` );
      users.delete( socket.id );

      socket.to( room ).emit( "user-left", { name } );

      const sharers = screenSharers.get( room );
      if ( sharers ) {
        sharers.delete( name );
        socket.to( room ).emit( "screen-share-stopped", name );
      }

      const roomUsers = Array.from( users.values() ).filter( ( u ) => u.room === room );
      io.to( room ).emit( "users-in-room", roomUsers );
    }
  } );
} );

server.listen( PORT, () => console.log( `✅ Server running on port ${ PORT }` ) );
