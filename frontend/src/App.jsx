import React from 'react'
import Navbar from './pages/components/Navbar'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/landing/Home'
import Login from './pages/register/Login'
import Signin from './pages/register/Signin'
import GenratingRoom from './pages/roomkey/GenratingRoom'
import WaitingRoom from './pages/videocall/WaitingRoom'
import VideoCall from './pages/videocall/VideoCall'

const App = () => {
  return (
    <div>
      <Navbar />
        <Routes >
          <Route path='/' element={<Home />}/>
          <Route path='/login' element={<Login />}/>
          <Route path='/register' element={<Signin />}/>
          <Route path='/genrate-room-key' element={<GenratingRoom />}/>
          <Route path='/waiting-room' element={<WaitingRoom />}/>
          <Route path='/video-call/:id' element={<VideoCall />}/>
        </Routes>
    </div>
  )
}

export default App
