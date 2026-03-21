import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MyTicketsPage from './pages/MyTicketsPage';
import CreateTicketPage from './pages/CreateTicketPage';
import TicketDetailPage from './pages/TicketDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import AgentQueuePage from './pages/AgentQueuePage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route path="/tickets" element={
          <ProtectedRoute>
            <MyTicketsPage />
          </ProtectedRoute>
        } />

        <Route path="/tickets/new" element={
          <ProtectedRoute>
            <CreateTicketPage />
          </ProtectedRoute>
        } />

        <Route path="/tickets/:id" element={
          <ProtectedRoute>
            <TicketDetailPage />
          </ProtectedRoute>
        } />

        <Route path="/agent/queue" element={
          <ProtectedRoute>
            <AgentQueuePage />
          </ProtectedRoute>
        } />

        <Route path="/supervisor/queue" element={
        <ProtectedRoute>
          <AgentQueuePage />
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      } />

      <Route path="/admin/queue" element={
        <ProtectedRoute>
          <AgentQueuePage />
        </ProtectedRoute>
      } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;