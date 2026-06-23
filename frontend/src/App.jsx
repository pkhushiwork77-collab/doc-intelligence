import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import DocumentPage from './pages/DocumentPage'
import { BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import ChatPage from './pages/ChatPage'

function PrivateRoute({children}) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />
}

function App() {

  return (
    <BrowserRouter>
      <Routes>
          <Route path='/login' element={<LoginPage />} />

          <Route path='/documents' element={
            <PrivateRoute>
              <DocumentPage />
            </PrivateRoute>
          } />
          <Route path='/chat/:docId' element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          } />
          <Route path='*' element={<Navigate to='/login'/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
