import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Forum from './pages/Forum';
import PostDetail from './pages/PostDetail';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/forum/:forumKey" element={<Forum />} />
          <Route path="/post/:postId" element={<PostDetail />} />
        </Routes>
      </main>
    </div>
  );
}
