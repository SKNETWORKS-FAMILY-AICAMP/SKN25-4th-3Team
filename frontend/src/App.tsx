import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import FridgePage from './pages/FridgePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FavoritesPage from './pages/FavoritesPage';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<FridgePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/accounts/login" element={<LoginPage />} />
          <Route path="/accounts/signup" element={<SignupPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
