import React from 'react'
import Navbar from './pages/components/Navbar'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/landing/Home'
import Login from './pages/register/Login'
import Signin from './pages/register/Signin'
import WaitingRoom from './pages/videocall/WaitingRoom'
import VideoCallPage from './pages/videocall/VideoCallPage'
import VideoCalling from './pages/videocall/VideoCalling'

const App = () => {
  return (
    <div>
      <Navbar />
        <Routes >
          <Route path='/' element={<Home />}/>
          <Route path='/login' element={<Login />}/>
          <Route path='/register' element={<Signin />}/>
          <Route path='/generate-room-key' element={<WaitingRoom/>}/>
          <Route path='/waiting-room' element={<WaitingRoom />}/>
          {/* <Route path='/video-call/:roomId' element={<VideoCallPage/>}/> */}
          <Route path='/video-call/:roomId' element={<VideoCalling/>}/>
        </Routes>
    </div>
  )
}

export default App
